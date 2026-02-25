import type { WebGLRenderer, QuadState } from './WebGLRenderer'

// ── IIIF Manifest ──

export interface IIIFManifest {
  baseUrl: string
  width: number
  height: number
  tileSize: number
  scaleFactors: number[]
}

// ── Parse info.json (v2 and v3) ──

export function parseIIIFManifest(info: Record<string, unknown>, infoUrl?: string): IIIFManifest {
  // Derive baseUrl from infoUrl (strip trailing /info.json) when available,
  // so tile requests go to the same host as the manifest regardless of the id field.
  // Falls back to the manifest's id field for backwards compatibility.
  let baseUrl: string
  if (infoUrl && infoUrl.endsWith('/info.json')) {
    baseUrl = infoUrl.slice(0, -'/info.json'.length)
  } else {
    baseUrl = (info.id ?? info['@id']) as string
  }

  const width = info.width as number
  const height = info.height as number

  const tiles = info.tiles as Array<{ width: number; scaleFactors: number[] }> | undefined
  const tileSize = tiles?.[0]?.width ?? 256
  const scaleFactors = tiles?.[0]?.scaleFactors ?? [1]

  // Sort ascending (1, 2, 4, 8, ...)
  scaleFactors.sort((a, b) => a - b)

  console.log(
    `[IIIF] Manifest parsed: ${width}×${height}, tileSize=${tileSize}, scaleFactors=[${scaleFactors.join(', ')}], baseUrl=${baseUrl}`
  )
  return { baseUrl, width, height, tileSize, scaleFactors }
}

// ── Shared tile cache budget ──
// Single budget shared across all IIIFTileManager instances.
// Prevents total GPU memory from exceeding device capabilities.

export class TileCacheBudget {
  readonly maxTiles: number
  readonly deviceMemoryGB: number
  private _currentTotal = 0

  constructor() {
    // navigator.deviceMemory: Chrome/Edge (workers too). Returns RAM in GB.
    // Falls back to 4 GB (conservative) for Safari/Firefox where the API is unavailable.
    this.deviceMemoryGB = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4

    // Scale budget by device memory:
    //   ≤2 GB  →  80 tiles  (~80 MB GPU)
    //    4 GB  → 150 tiles  (~150 MB GPU)
    //    8 GB+ → 300 tiles  (~300 MB GPU)
    this.maxTiles = Math.max(60, Math.min(300, Math.floor(this.deviceMemoryGB * 38)))

    console.log(
      `[IIIF] Cache budget: ${this.maxTiles} tiles (device memory: ${this.deviceMemoryGB} GB)`
    )
  }

  get current(): number { return this._currentTotal }
  get remaining(): number { return this.maxTiles - this._currentTotal }

  add(count = 1): void { this._currentTotal += count }
  remove(count = 1): void { this._currentTotal = Math.max(0, this._currentTotal - count) }
  needsEviction(): boolean { return this._currentTotal > this.maxTiles }
}

// ── Tile cache entry ──

interface TileCacheEntry {
  texture: WebGLTexture
  texWidth: number
  texHeight: number
  lastAccess: number
}

// ── Fetch queue entry ──

interface TileFetchEntry {
  key: string
  url: string
  priority: number // Lower = higher priority (distance from viewport center)
}

// ── IIIFTileManager ──

export class IIIFTileManager {
  private id: string
  private manifest: IIIFManifest
  private renderer: WebGLRenderer
  private budget: TileCacheBudget

  // Display properties (world space)
  private displayX: number
  private displayY: number
  private displayZ: number
  private displayW: number
  private displayH: number
  private opacity: number

  // Tile state
  private textureCache = new Map<string, TileCacheEntry>()
  private currentQuads: QuadState[] = []

  // Fetch pipeline (parallel)
  private fetchQueue: TileFetchEntry[] = []
  private activeFetches = new Map<string, AbortController>()
  private maxConcurrentFetches = 4

  // Upload pipeline
  private uploadQueue: { key: string; bitmap: ImageBitmap }[] = []
  private maxUploadsPerFrame = 4

  // Throttle tile recalculation
  private lastUpdateTime = 0
  private updateInterval = 100 // ms
  private lastLevel = -1
  private needsRebuild = true

  constructor(
    id: string,
    manifest: IIIFManifest,
    displayX: number,
    displayY: number,
    displayZ: number,
    displayW: number,
    displayH: number,
    opacity: number,
    renderer: WebGLRenderer,
    budget: TileCacheBudget
  ) {
    this.id = id
    this.manifest = manifest
    this.renderer = renderer
    this.budget = budget
    this.displayX = displayX
    this.displayY = displayY
    this.displayZ = displayZ
    this.displayW = displayW
    this.displayH = displayH
    this.opacity = opacity

    // Pre-load lowest-res tile as persistent backdrop (prevents white flash)
    this.preloadBackdrop()
  }

  // ── Pre-load lowest resolution level as persistent backdrop ──

  private preloadBackdrop(): void {
    const { scaleFactors, tileSize, width: imgW, height: imgH } = this.manifest
    const lowestLevel = scaleFactors.length - 1
    const sf = scaleFactors[lowestLevel]
    const tilePixelSize = tileSize * sf

    // At the lowest level there are very few tiles (often just 1)
    const maxCol = Math.ceil(imgW / tilePixelSize) - 1
    const maxRow = Math.ceil(imgH / tilePixelSize) - 1

    for (let row = 0; row <= maxRow; row++) {
      for (let col = 0; col <= maxCol; col++) {
        const key = `${lowestLevel}-${col}-${row}`
        const url = this.buildTileUrl(col, row, sf)
        if (
          !this.activeFetches.has(key) &&
          !this.textureCache.has(key) &&
          !this.uploadQueue.some((u) => u.key === key)
        ) {
          this.fetchTile(key, url)
        }
      }
    }
  }

  // ── Main update (called each frame, internally throttled) ──

  update(
    camTrueX: number,
    camTrueY: number,
    camZoom: number,
    _camFov: number,
    camViewW: number,
    camViewH: number,
    dpr: number
  ): QuadState[] {
    const now = performance.now()
    if (now - this.lastUpdateTime < this.updateInterval && !this.needsRebuild) {
      return this.currentQuads
    }
    this.lastUpdateTime = now

    const { manifest, displayX, displayY, displayZ, displayW, displayH, opacity } = this
    const { width: imgW, height: imgH, tileSize, scaleFactors } = manifest

    // ── Zoom level selection ──
    // With the scene scale fix (zoom * pixelToUnit), 1 pixel-unit = 1 CSS pixel.
    // Screen pixels = displayW * zoom * dpr (no pixelToUnit division needed).
    const screenPixels = displayW * camZoom * dpr
    // Quality boost: request higher-res tiles than strictly needed for the viewport.
    // 1.0 = match screen pixels exactly, 1.5 = fetch one level sharper from further away.
    const qualityBoost = 1.5
    const idealSF = imgW / (screenPixels * qualityBoost)
    // Pick the level with smallest scaleFactor >= idealSF
    let level = scaleFactors.length - 1 // Default to lowest-res
    for (let i = 0; i < scaleFactors.length; i++) {
      if (scaleFactors[i] >= idealSF) {
        level = i
        break
      }
    }
    const sf = scaleFactors[level]

    // If zoom level changed, mark for rebuild
    if (level !== this.lastLevel) {
      console.log(
        `[IIIF ${this.id}] Level changed: ${this.lastLevel} → ${level} (sf=${sf}, idealSF=${idealSF.toFixed(2)}, camZoom=${camZoom.toFixed(3)}, dpr=${dpr})`
      )
      this.lastLevel = level
      this.needsRebuild = true
    }

    // ── Visible tile calculation ──
    // Image top-left in world space (center-anchored display)
    const imgWorldLeft = displayX - displayW / 2
    const imgWorldTop = displayY - displayH / 2

    // World-to-image-pixel conversion (separate axes for non-matching aspect ratios)
    const worldToImgX = imgW / displayW
    const worldToImgY = imgH / displayH

    // Camera viewport bounds in world pixel space.
    // With scene scale = zoom * pixelToUnit, camera center in pixel coords is just
    // the world position (no pixelToUnit conversion needed).
    const camWorldX = -camTrueX / camZoom
    const camWorldY = -camTrueY / camZoom
    const halfVW = camViewW / (2 * camZoom)
    const halfVH = camViewH / (2 * camZoom)

    // Visible region in image pixels
    const visLeft = (camWorldX - halfVW - imgWorldLeft) * worldToImgX
    const visTop = (camWorldY - halfVH - imgWorldTop) * worldToImgY
    const visRight = (camWorldX + halfVW - imgWorldLeft) * worldToImgX
    const visBottom = (camWorldY + halfVH - imgWorldTop) * worldToImgY

    // Tile grid at this level
    const tilePixelSize = tileSize * sf
    const maxCol = Math.ceil(imgW / tilePixelSize) - 1
    const maxRow = Math.ceil(imgH / tilePixelSize) - 1

    // +1 tile buffer on each side accounts for floating-point imprecision
    // in the perspective projection chain and provides a small prefetch margin
    const startCol = Math.max(0, Math.floor(visLeft / tilePixelSize) - 1)
    const startRow = Math.max(0, Math.floor(visTop / tilePixelSize) - 1)
    const endCol = Math.min(maxCol, Math.floor(visRight / tilePixelSize) + 1)
    const endRow = Math.min(maxRow, Math.floor(visBottom / tilePixelSize) + 1)

    // Early-out: image is entirely outside the viewport
    if (startCol > endCol || startRow > endRow) {
      this.currentQuads = []
      this.needsRebuild = false
      return this.currentQuads
    }

    // Center tile for priority calculation
    const centerCol = (startCol + endCol) / 2
    const centerRow = (startRow + endRow) / 2

    // Image-pixel to world-unit conversion (separate axes)
    const imgToWorldX = displayW / imgW
    const imgToWorldY = displayH / imgH

    // Seam padding: expand each tile by 0.5 device pixels in world pixel units
    // to prevent sub-pixel gaps from floating-point rounding (matches Juniper approach)
    const padWorld = 0.5 / (camZoom * dpr)

    // ── Build quads and queue missing tiles ──
    const quads: QuadState[] = []
    const neededTiles: TileFetchEntry[] = []
    const visibleKeys = new Set<string>()
    const addedFallbacks = new Set<string>()

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const key = `${level}-${col}-${row}`
        visibleKeys.add(key)

        // Tile region in image pixels
        const tileImgX = col * tilePixelSize
        const tileImgY = row * tilePixelSize
        const tileImgW = Math.min(tilePixelSize, imgW - tileImgX)
        const tileImgH = Math.min(tilePixelSize, imgH - tileImgY)

        // Edge flags (no padding on image borders)
        const isLeft = col === 0
        const isTop = row === 0
        const isRight = col === maxCol
        const isBottom = row === maxRow

        // Padding per side
        const padL = isLeft ? 0 : padWorld
        const padT = isTop ? 0 : padWorld
        const padR = isRight ? 0 : padWorld
        const padB = isBottom ? 0 : padWorld

        // Tile center in world space (shifted by asymmetric padding)
        const baseX = imgWorldLeft + (tileImgX + tileImgW / 2) * imgToWorldX
        const baseY = imgWorldTop + (tileImgY + tileImgH / 2) * imgToWorldY
        const baseW = tileImgW * imgToWorldX
        const baseH = tileImgH * imgToWorldY

        const quadX = baseX + (padR - padL) / 2
        const quadY = baseY + (padB - padT) / 2
        const quadW = baseW + padL + padR
        const quadH = baseH + padT + padB

        const cached = this.textureCache.get(key)
        if (cached) {
          // Update access time
          cached.lastAccess = now
          quads.push({
            id: `${this.id}-${key}`,
            x: quadX,
            y: quadY,
            z: displayZ,
            width: quadW,
            height: quadH,
            opacity,
            texture: cached.texture,
            texWidth: cached.texWidth,
            texHeight: cached.texHeight,
          })
        } else {
          // Queue fetch if not already loading
          if (
            !this.activeFetches.has(key) &&
            !this.uploadQueue.some((u) => u.key === key)
          ) {
            const priority =
              Math.abs(col - centerCol) + Math.abs(row - centerRow)
            const url = this.buildTileUrl(col, row, sf)
            neededTiles.push({ key, url, priority })
          }

          // Multi-level coverage: find a lower-res tile that covers this area
          // Render the parent tile at ITS OWN world position (not the target's)
          const fallback = this.findCoveringTile(col, row, level, sf)
          if (fallback) {
            const fallbackKey = `${fallback.level}-${fallback.col}-${fallback.row}`
            // Deduplicate: multiple target tiles may map to the same parent
            if (!addedFallbacks.has(fallbackKey)) {
              addedFallbacks.add(fallbackKey)
              fallback.entry.lastAccess = now

              // Calculate the parent tile's own world position and size
              const parentSF = scaleFactors[fallback.level]
              const parentTilePixels = tileSize * parentSF
              const parentImgX = fallback.col * parentTilePixels
              const parentImgY = fallback.row * parentTilePixels
              const parentImgW = Math.min(parentTilePixels, imgW - parentImgX)
              const parentImgH = Math.min(parentTilePixels, imgH - parentImgY)

              const parentWorldX = imgWorldLeft + (parentImgX + parentImgW / 2) * imgToWorldX
              const parentWorldY = imgWorldTop + (parentImgY + parentImgH / 2) * imgToWorldY
              const parentWorldW = parentImgW * imgToWorldX
              const parentWorldH = parentImgH * imgToWorldY

              quads.push({
                id: `${this.id}-fallback-${fallbackKey}`,
                x: parentWorldX,
                y: parentWorldY,
                z: displayZ - 0.001, // Behind target tiles
                width: parentWorldW,
                height: parentWorldH,
                opacity,
                texture: fallback.entry.texture,
                texWidth: fallback.entry.texWidth,
                texHeight: fallback.entry.texHeight,
              })
            }
          }
        }
      }
    }

    // Sort fetch queue by priority (center tiles first)
    if (neededTiles.length > 0) {
      neededTiles.sort((a, b) => a.priority - b.priority)
      // Cancel fetches for tiles no longer visible
      this.cancelInvisibleFetches(visibleKeys)
      // Add to fetch queue (deduplicate)
      for (const entry of neededTiles) {
        if (
          !this.fetchQueue.some((f) => f.key === entry.key) &&
          !this.activeFetches.has(entry.key)
        ) {
          this.fetchQueue.push(entry)
        }
      }
      // Re-sort entire queue by priority
      this.fetchQueue.sort((a, b) => a.priority - b.priority)
    }

    this.currentQuads = quads
    this.needsRebuild = false
    return quads
  }

  // ── Tile URL generation (IIIF Image API) ──

  private buildTileUrl(col: number, row: number, sf: number): string {
    const { baseUrl, width: imgW, height: imgH, tileSize } = this.manifest

    const regionX = col * tileSize * sf
    const regionY = row * tileSize * sf
    const regionW = Math.min(tileSize * sf, imgW - regionX)
    const regionH = Math.min(tileSize * sf, imgH - regionY)
    const outputW = Math.ceil(regionW / sf)
    const outputH = Math.ceil(regionH / sf)

    // Use "full" region when tile covers the entire image (IIIF canonical form)
    const region =
      regionX === 0 && regionY === 0 && regionW === imgW && regionH === imgH
        ? 'full'
        : `${regionX},${regionY},${regionW},${regionH}`

    return `${baseUrl}/${region}/${outputW},${outputH}/0/default.jpg`
  }

  // ── Multi-level coverage ──

  private findCoveringTile(
    col: number,
    row: number,
    targetLevel: number,
    targetSF: number
  ): { entry: TileCacheEntry; level: number; col: number; row: number } | null {
    const { tileSize, scaleFactors } = this.manifest

    // Walk UP toward lower resolution (higher level = larger scaleFactor)
    // These tiles are more likely to be cached from previous zoom levels
    for (let lvl = targetLevel + 1; lvl < scaleFactors.length; lvl++) {
      const parentSF = scaleFactors[lvl]
      const parentTilePixels = tileSize * parentSF

      // Map this tile's image-pixel position to parent tile coords
      const tileImgX = col * tileSize * targetSF
      const tileImgY = row * tileSize * targetSF
      const parentCol = Math.floor(tileImgX / parentTilePixels)
      const parentRow = Math.floor(tileImgY / parentTilePixels)

      const parentKey = `${lvl}-${parentCol}-${parentRow}`
      const cached = this.textureCache.get(parentKey)
      if (cached) {
        return { entry: cached, level: lvl, col: parentCol, row: parentRow }
      }
    }
    return null
  }

  // ── Cancel fetches for tiles no longer in viewport ──

  private cancelInvisibleFetches(visibleKeys: Set<string>): void {
    for (const [key, controller] of this.activeFetches) {
      // Extract level from key to check if it's the current level
      const keyLevel = parseInt(key.split('-')[0])
      if (!visibleKeys.has(key) && keyLevel === this.lastLevel) {
        controller.abort()
        this.activeFetches.delete(key)
      }
    }
    // Remove invisible tiles from fetch queue
    this.fetchQueue = this.fetchQueue.filter(
      (f) => visibleKeys.has(f.key) || parseInt(f.key.split('-')[0]) !== this.lastLevel
    )
  }

  // ── Parallel tile fetch pipeline ──

  processFetchQueue(): void {
    while (
      this.activeFetches.size < this.maxConcurrentFetches &&
      this.fetchQueue.length > 0
    ) {
      const entry = this.fetchQueue.shift()!
      this.fetchTile(entry.key, entry.url)
    }
  }

  private fetchTile(key: string, url: string): void {
    const controller = new AbortController()
    this.activeFetches.set(key, controller)

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.blob()
      })
      .then((blob) =>
        createImageBitmap(blob, { premultiplyAlpha: 'premultiply' })
      )
      .then((bitmap) => {
        this.activeFetches.delete(key)
        this.uploadQueue.push({ key, bitmap })
        this.needsRebuild = true
      })
      .catch((err) => {
        this.activeFetches.delete(key)
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.warn(`[IIIF] Failed to load tile ${key}:`, err)
      })
  }

  // ── GPU upload pipeline (max N per frame) ──

  processUploadQueue(): void {
    let uploads = 0
    while (this.uploadQueue.length > 0 && uploads < this.maxUploadsPerFrame) {
      const { key, bitmap } = this.uploadQueue.shift()!
      const result = this.renderer.uploadTexture(bitmap)
      this.renderer.finalizeMipmaps(result.texture)
      bitmap.close()

      this.textureCache.set(key, {
        texture: result.texture,
        texWidth: result.texWidth,
        texHeight: result.texHeight,
        lastAccess: performance.now(),
      })
      this.budget.add()

      this.needsRebuild = true
      uploads++
    }

    // Evict old tiles if global budget exceeded
    if (this.budget.needsEviction()) {
      this.evictOldTiles()
    }
  }

  // ── LRU cache eviction (respects global budget) ──

  // Returns the lastAccess time of the oldest evictable tile, or Infinity if none
  oldestEvictableTime(): number {
    const lowestLevel = `${this.manifest.scaleFactors.length - 1}-`
    let oldest = Infinity
    for (const [key, entry] of this.textureCache) {
      if (!key.startsWith(lowestLevel) && entry.lastAccess < oldest) {
        oldest = entry.lastAccess
      }
    }
    return oldest
  }

  evictOldTiles(): number {
    const lowestLevel = `${this.manifest.scaleFactors.length - 1}-`

    // Sort by lastAccess ascending (oldest first), but never evict backdrop tiles
    const entries = Array.from(this.textureCache.entries())
      .filter(([key]) => !key.startsWith(lowestLevel))
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess)

    let evicted = 0
    for (let i = 0; i < entries.length && this.budget.needsEviction(); i++) {
      const [key, entry] = entries[i]
      this.renderer.deleteTexture(entry.texture)
      this.textureCache.delete(key)
      this.budget.remove()
      evicted++
    }
    return evicted
  }

  // ── Cleanup ──

  destroy(): void {
    // Abort all fetches
    for (const controller of this.activeFetches.values()) {
      controller.abort()
    }
    this.activeFetches.clear()
    this.fetchQueue = []

    // Close pending bitmaps
    for (const { bitmap } of this.uploadQueue) {
      bitmap.close()
    }
    this.uploadQueue = []

    // Delete all textures and release budget
    for (const entry of this.textureCache.values()) {
      this.renderer.deleteTexture(entry.texture)
      this.budget.remove()
    }
    this.textureCache.clear()

    this.currentQuads = []
  }
}
