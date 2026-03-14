import { WebGLRenderer } from './WebGLRenderer'
import type { QuadState, MeshState } from './WebGLRenderer'
import type { MainToWorkerMessage, WorkerToMainMessage } from './types'
import { IIIFTileManager, TileCacheBudget, parseIIIFManifest } from './IIIFTileManager'
import { parseGLB } from './GLBParser'

// ── State ──

let renderer: WebGLRenderer | null = null
let canvas: OffscreenCanvas | null = null

// Camera state (updated via messages)
let camTrueX = 0
let camTrueY = 0
let camZoom = 1
let camFov = 0.8 // ~45deg default
let camViewW = 1
let camViewH = 1

// Image quads
const quads = new Map<string, QuadState>()

// Pending image fetches (for abort on removal)
const pendingFetches = new Map<string, AbortController>()

// Serialized fetch+decode queue — only 1 image loads at a time
// to avoid CPU spikes from concurrent createImageBitmap() calls
const fetchQueue: { id: string; url: string }[] = []
let isFetching = false

// Phase 1: bitmaps waiting for texImage2D upload (1 per frame)
const uploadQueue: { id: string; bitmap: ImageBitmap }[] = []

// Phase 2: textures waiting for mipmap generation (1 per frame)
const mipmapQueue: { id: string; texture: WebGLTexture }[] = []

// Sorted quad array (rebuilt when quads change)
let sortedQuads: QuadState[] = []
let quadsDirty = true

// IIIF tile managers
const iiifManagers = new Map<string, IIIFTileManager>()
const pendingIIIFFetches = new Map<string, AbortController>()
const tileBudget = new TileCacheBudget()
let workerDpr = 1

// 3D meshes
const meshes = new Map<string, MeshState>()
const pendingModelFetches = new Map<string, AbortController>()
let sortedMeshes: MeshState[] = []
let meshesDirty = false

// ── Message handler ──

self.onmessage = (e: MessageEvent<MainToWorkerMessage>) => {
  const msg = e.data

  switch (msg.type) {
    case 'init': {
      canvas = msg.canvas
      try {
        const gl = canvas.getContext('webgl2', {
          alpha: true,
          depth: true,
          antialias: true,
          premultipliedAlpha: true,
        }) as WebGL2RenderingContext | null

        if (!gl) {
          postMsg({ type: 'error', message: 'Failed to get WebGL context' })
          return
        }

        // Set canvas size with DPR
        canvas.width = msg.width * msg.dpr
        canvas.height = msg.height * msg.dpr
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.clearColor(0, 0, 0, 0) // Transparent background

        renderer = new WebGLRenderer(gl)
        camViewW = msg.width
        camViewH = msg.height
        workerDpr = msg.dpr

        postMsg({ type: 'ready' })
      } catch (err) {
        postMsg({
          type: 'error',
          message: `WebGL init failed: ${err instanceof Error ? err.message : err}`,
        })
      }
      break
    }

    case 'resize': {
      if (!canvas || !renderer) return
      canvas.width = msg.width * msg.dpr
      canvas.height = msg.height * msg.dpr
      renderer.resize(canvas.width, canvas.height)
      camViewW = msg.width
      camViewH = msg.height
      break
    }

    case 'camera': {
      camTrueX = msg.truePositionX
      camTrueY = msg.truePositionY
      camZoom = msg.zoom
      camFov = msg.fov
      camViewW = msg.viewportWidth
      camViewH = msg.viewportHeight
      // Render immediately — the postMessage from the main thread's RAF
      // arrives during the same frame. Rendering now + flush() ensures
      // the OffscreenCanvas back-buffer is ready for the compositor at
      // the next vsync, matching the CSS paint from the same RAF.
      renderFrame()
      break
    }

    case 'addImage': {
      const quad: QuadState = {
        id: msg.id,
        x: msg.x,
        y: msg.y,
        z: msg.z,
        width: msg.width,
        height: msg.height,
        opacity: msg.opacity,
        texture: null,
        texWidth: 0,
        texHeight: 0,
      }
      quads.set(msg.id, quad)
      quadsDirty = true

      // Queue fetch — only 1 image fetches+decodes at a time
      fetchQueue.push({ id: msg.id, url: msg.url })
      processNextFetch()
      break
    }

    case 'removeImage': {
      // Abort pending fetch if any
      const controller = pendingFetches.get(msg.id)
      if (controller) {
        controller.abort()
        pendingFetches.delete(msg.id)
      }

      // Remove from fetch queue if waiting
      const fIdx = fetchQueue.findIndex((f) => f.id === msg.id)
      if (fIdx !== -1) {
        fetchQueue.splice(fIdx, 1)
      }

      // Delete texture and remove quad
      const quad = quads.get(msg.id)
      if (quad?.texture && renderer) {
        renderer.deleteTexture(quad.texture)
      }
      quads.delete(msg.id)
      quadsDirty = true

      // Remove from upload queue if pending
      const idx = uploadQueue.findIndex((u) => u.id === msg.id)
      if (idx !== -1) {
        uploadQueue[idx].bitmap.close()
        uploadQueue.splice(idx, 1)
      }

      // Remove from mipmap queue if pending
      const mIdx = mipmapQueue.findIndex((m) => m.id === msg.id)
      if (mIdx !== -1) {
        mipmapQueue.splice(mIdx, 1)
      }
      break
    }

    case 'updateImage': {
      const existing = quads.get(msg.id)
      if (existing) {
        existing.x = msg.x
        existing.y = msg.y
        existing.z = msg.z
        existing.width = msg.width
        existing.height = msg.height
        existing.opacity = msg.opacity
        quadsDirty = true
      }
      break
    }

    case 'addIIIFImage': {
      console.log(`[Worker] received addIIIFImage id=${msg.id} infoUrl=${msg.infoUrl} renderer=${!!renderer}`)
      if (!renderer) break
      const capturedRenderer = renderer
      const iiifAbort = new AbortController()
      pendingIIIFFetches.set(msg.id, iiifAbort)
      fetch(msg.infoUrl, { signal: iiifAbort.signal })
        .then((res) => res.json())
        .then((info) => {
          pendingIIIFFetches.delete(msg.id)
          // Check if removed while fetch was in-flight
          if (iiifAbort.signal.aborted) return
          console.log(`[Worker] IIIF manifest fetched for ${msg.id}`)
          const manifest = parseIIIFManifest(info, msg.infoUrl)
          const mgr = new IIIFTileManager(
            msg.id,
            manifest,
            msg.x,
            msg.y,
            msg.z,
            msg.width,
            msg.height,
            msg.opacity,
            capturedRenderer,
            tileBudget
          )
          iiifManagers.set(msg.id, mgr)
          scheduleRender()
          postMsg({
            type: 'iiifReady',
            id: msg.id,
            imageWidth: manifest.width,
            imageHeight: manifest.height,
          })
        })
        .catch((err) => {
          pendingIIIFFetches.delete(msg.id)
          if (err instanceof DOMException && err.name === 'AbortError') return
          console.error(`[Worker] IIIF manifest fetch FAILED for ${msg.id}:`, err)
          postMsg({
            type: 'error',
            message: `IIIF manifest load failed: ${err instanceof Error ? err.message : err}`,
            id: msg.id,
          })
        })
      break
    }

    case 'removeIIIFImage': {
      // Abort in-flight manifest fetch if any
      const iiifController = pendingIIIFFetches.get(msg.id)
      if (iiifController) {
        iiifController.abort()
        pendingIIIFFetches.delete(msg.id)
      }
      const mgr = iiifManagers.get(msg.id)
      if (mgr) {
        mgr.destroy()
        iiifManagers.delete(msg.id)
      }
      break
    }

    case 'addModel': {
      if (!renderer) break
      const capturedRendererForModel = renderer
      const modelAbort = new AbortController()
      pendingModelFetches.set(msg.id, modelAbort)

      fetch(msg.url, { signal: modelAbort.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.arrayBuffer()
        })
        .then((buffer) => parseGLB(buffer))
        .then((parsed) => {
          pendingModelFetches.delete(msg.id)
          if (modelAbort.signal.aborted) return

          // Upload all mesh primitives to GPU
          const gpuPrimitives: MeshState['primitives'] = []
          const nodeTransforms: Float32Array[] = []

          for (const mesh of parsed.meshes) {
            for (const prim of mesh.primitives) {
              gpuPrimitives.push(capturedRendererForModel.uploadMesh(prim))
              nodeTransforms.push(mesh.transform)
            }
          }

          const meshState: MeshState = {
            id: msg.id,
            x: msg.x,
            y: msg.y,
            z: msg.z,
            scale: msg.scale,
            rotationX: msg.rotationX,
            rotationY: msg.rotationY,
            rotationZ: msg.rotationZ,
            opacity: msg.opacity,
            materialOverrides: msg.materials,
            primitives: gpuPrimitives,
            nodeTransforms,
          }
          meshes.set(msg.id, meshState)
          meshesDirty = true
          scheduleRender()
          postMsg({ type: 'modelLoaded', id: msg.id })
        })
        .catch((err) => {
          pendingModelFetches.delete(msg.id)
          if (err instanceof DOMException && err.name === 'AbortError') return
          console.error(`[Worker] Model load FAILED for ${msg.id}:`, err)
          postMsg({
            type: 'error',
            message: `Model load failed: ${err instanceof Error ? err.message : err}`,
            id: msg.id,
          })
        })
      break
    }

    case 'removeModel': {
      const modelController = pendingModelFetches.get(msg.id)
      if (modelController) {
        modelController.abort()
        pendingModelFetches.delete(msg.id)
      }
      const meshState = meshes.get(msg.id)
      if (meshState && renderer) {
        renderer.deleteMesh(meshState.primitives)
        meshes.delete(msg.id)
        meshesDirty = true
      }
      break
    }

    case 'updateModel': {
      const existingMesh = meshes.get(msg.id)
      if (existingMesh) {
        existingMesh.x = msg.x
        existingMesh.y = msg.y
        existingMesh.z = msg.z
        existingMesh.scale = msg.scale
        existingMesh.rotationX = msg.rotationX
        existingMesh.rotationY = msg.rotationY
        existingMesh.rotationZ = msg.rotationZ
        existingMesh.opacity = msg.opacity
        existingMesh.materialOverrides = msg.materials
        meshesDirty = true
      }
      break
    }
  }
}

// ── Serialized fetch+decode pipeline ──

function processNextFetch() {
  if (isFetching || fetchQueue.length === 0) return
  isFetching = true

  const { id, url } = fetchQueue.shift()!

  // Skip if quad was already removed while waiting in queue
  if (!quads.has(id)) {
    isFetching = false
    processNextFetch()
    return
  }

  const controller = new AbortController()
  pendingFetches.set(id, controller)

  fetch(url, { signal: controller.signal })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.blob()
    })
    .then((blob) => createImageBitmap(blob, { premultiplyAlpha: 'premultiply' }))
    .then((bitmap) => {
      // Cap texture size — 8K images cause 300ms+ GPU uploads that freeze compositing.
      // Max 4096px on any side is more than enough for display sizes (typically <1000px)
      // even at max zoom (1.5×) on retina (2× DPR).
      const MAX_DIM = 4096
      if (bitmap.width > MAX_DIM || bitmap.height > MAX_DIM) {
        const scale = MAX_DIM / Math.max(bitmap.width, bitmap.height)
        const w = Math.round(bitmap.width * scale)
        const h = Math.round(bitmap.height * scale)
        return createImageBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, {
          resizeWidth: w,
          resizeHeight: h,
          resizeQuality: 'high',
          premultiplyAlpha: 'premultiply',
        }).then((resized) => {
          bitmap.close()
          return resized
        })
      }
      return bitmap
    })
    .then((bitmap) => {
      pendingFetches.delete(id)
      if (!quads.has(id)) {
        bitmap.close()
        return
      }
      uploadQueue.push({ id, bitmap })
      scheduleRender()
    })
    .catch((err) => {
      pendingFetches.delete(id)
      if (err instanceof DOMException && err.name === 'AbortError') return
      postMsg({
        type: 'error',
        message: `Failed to load image: ${err instanceof Error ? err.message : err}`,
        id,
      })
    })
    .finally(() => {
      isFetching = false
      processNextFetch() // Start next image
    })
}

// ── Render ──

// One-shot RAF for content changes when the camera isn't moving
// (e.g. texture finishes loading while user is idle).
let renderScheduled = false

function scheduleRender() {
  if (!renderScheduled) {
    renderScheduled = true
    requestAnimationFrame(() => {
      renderScheduled = false
      renderFrame()
    })
  }
}

function renderFrame() {
  if (!renderer) return

  // Phase 1: Upload 1 texture per frame (texImage2D only, no mipmaps)
  if (uploadQueue.length > 0) {
    const { id, bitmap } = uploadQueue.shift()!
    const quad = quads.get(id)
    if (quad) {
      const result = renderer.uploadTexture(bitmap)
      quad.texture = result.texture
      quad.texWidth = result.texWidth
      quad.texHeight = result.texHeight
      // Queue mipmap generation for a later frame
      mipmapQueue.push({ id, texture: result.texture })
      postMsg({ type: 'imageLoaded', id })
    }
    bitmap.close()
  }

  // Phase 2: Generate mipmaps for 1 texture per frame (only when no uploads pending)
  if (uploadQueue.length === 0 && mipmapQueue.length > 0) {
    const { id, texture } = mipmapQueue.shift()!
    // Only finalize if quad still exists
    if (quads.has(id)) {
      renderer.finalizeMipmaps(texture)
    }
  }

  // Rebuild sorted array if quads changed
  if (quadsDirty) {
    sortedQuads = Array.from(quads.values())
    // Sort by z ascending (farther quads drawn first — painter's algorithm)
    // Lower z = farther from camera = drawn first = appears behind
    sortedQuads.sort((a, b) => a.z - b.z)
    quadsDirty = false
  }

  // Rebuild sorted meshes if changed
  if (meshesDirty) {
    sortedMeshes = Array.from(meshes.values())
    sortedMeshes.sort((a, b) => a.z - b.z)
    meshesDirty = false
  }

  // IIIF tile processing and collection
  if (iiifManagers.size > 0) {
    for (const mgr of iiifManagers.values()) {
      mgr.processFetchQueue()
      mgr.processUploadQueue()
    }
    // Global eviction: when budget is exceeded, evict oldest tiles across all managers
    while (tileBudget.needsEviction()) {
      let oldestTime = Infinity
      let oldestMgr: IIIFTileManager | null = null
      for (const mgr of iiifManagers.values()) {
        const t = mgr.oldestEvictableTime()
        if (t < oldestTime) {
          oldestTime = t
          oldestMgr = mgr
        }
      }
      if (!oldestMgr || oldestTime === Infinity) break
      oldestMgr.evictOldTiles()
    }
    // Collect tile quads from all IIIF managers
    const allQuads = [...sortedQuads]
    for (const mgr of iiifManagers.values()) {
      const tileQuads = mgr.update(
        camTrueX, camTrueY, camZoom, camFov, camViewW, camViewH, workerDpr
      )
      allQuads.push(...tileQuads)
    }
    allQuads.sort((a, b) => a.z - b.z)
    renderer.updateCamera(camTrueX, camTrueY, camZoom, camFov, camViewW, camViewH)
    renderer.renderQuads(allQuads)
  } else {
    // Fast path: no IIIF images, render regular quads only
    renderer.updateCamera(camTrueX, camTrueY, camZoom, camFov, camViewW, camViewH)
    renderer.renderQuads(sortedQuads)
  }

  // Render 3D meshes (after quads, depth buffer shared)
  if (sortedMeshes.length > 0) {
    renderer.renderMeshes(sortedMeshes)
  }

  // Flush GL commands so the compositor picks up this frame at the next
  // vsync, keeping the OffscreenCanvas in sync with the main thread's CSS.
  renderer.flush()

  // If there's still work in the queues, schedule another frame
  if (uploadQueue.length > 0 || mipmapQueue.length > 0) {
    scheduleRender()
  }
}

// ── Helpers ──

function postMsg(msg: WorkerToMainMessage) {
  ;(self as unknown as Worker).postMessage(msg)
}
