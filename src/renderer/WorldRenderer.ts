import type { MainToWorkerMessage, WorkerToMainMessage } from './types'

type ImageLoadedCallback = (id: string) => void
type IIIFReadyCallback = (id: string, imageWidth: number, imageHeight: number) => void
type ModelLoadedCallback = (id: string) => void
type ErrorCallback = (message: string, id?: string) => void

/**
 * Main-thread API for the off-screen WebGL renderer.
 * All GPU work happens in a Web Worker via OffscreenCanvas.
 */
export class WorldRenderer {
  private worker: Worker | null = null
  private ready = false
  private messageBuffer: MainToWorkerMessage[] = []
  private onImageLoaded?: ImageLoadedCallback
  private onIIIFReady?: IIIFReadyCallback
  private onModelLoaded?: ModelLoadedCallback
  private onError?: ErrorCallback

  /**
   * Initialize the renderer by transferring canvas control to the worker.
   */
  init(canvas: HTMLCanvasElement, dpr: number): void {
    if (this.worker) return // Already initialized

    const offscreen = canvas.transferControlToOffscreen()

    this.worker = new Worker(
      new URL('./renderer.worker.ts', import.meta.url),
      { type: 'module' }
    )

    this.worker.onmessage = (e: MessageEvent<WorkerToMainMessage>) => {
      const msg = e.data
      switch (msg.type) {
        case 'ready':
          this.ready = true
          // Flush buffered messages
          for (const buffered of this.messageBuffer) {
            this.worker!.postMessage(buffered)
          }
          this.messageBuffer = []
          break
        case 'imageLoaded':
          this.onImageLoaded?.(msg.id)
          break
        case 'iiifReady':
          this.onIIIFReady?.(msg.id, msg.imageWidth, msg.imageHeight)
          break
        case 'modelLoaded':
          this.onModelLoaded?.(msg.id)
          break
        case 'error':
          console.warn('[WorldRenderer]', msg.message, msg.id ?? '')
          this.onError?.(msg.message, msg.id)
          break
      }
    }

    const width = canvas.clientWidth
    const height = canvas.clientHeight

    // Transfer canvas to worker (must use transferable)
    this.worker.postMessage(
      {
        type: 'init',
        canvas: offscreen,
        width,
        height,
        dpr,
      } satisfies MainToWorkerMessage,
      [offscreen]
    )
  }

  /**
   * Send camera state to the worker. Called every animation frame.
   */
  updateCamera(
    truePositionX: number,
    truePositionY: number,
    zoom: number,
    fov: number,
    viewportWidth: number,
    viewportHeight: number
  ): void {
    this.send({
      type: 'camera',
      truePositionX,
      truePositionY,
      zoom,
      fov,
      viewportWidth,
      viewportHeight,
    })
  }

  /**
   * Register an image quad in the world.
   */
  addImage(
    id: string,
    url: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    opacity: number = 1
  ): void {
    this.send({ type: 'addImage', id, url, x, y, z, width, height, opacity })
  }

  /**
   * Remove an image quad from the world.
   */
  removeImage(id: string): void {
    this.send({ type: 'removeImage', id })
  }

  /**
   * Update an existing image quad's transform/opacity.
   */
  updateImage(
    id: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    opacity: number
  ): void {
    this.send({ type: 'updateImage', id, x, y, z, width, height, opacity })
  }

  /**
   * Register an IIIF tiled image in the world.
   */
  addIIIFImage(
    id: string,
    infoUrl: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    opacity: number = 1
  ): void {
    this.send({ type: 'addIIIFImage', id, infoUrl, x, y, z, width, height, opacity })
  }

  /**
   * Remove an IIIF tiled image from the world.
   */
  removeIIIFImage(id: string): void {
    this.send({ type: 'removeIIIFImage', id })
  }

  /**
   * Register a 3D GLB model in the world.
   */
  addModel(
    id: string,
    url: string,
    x: number,
    y: number,
    z: number,
    scale: number,
    rotationX: number,
    rotationY: number,
    rotationZ: number,
    opacity: number = 1,
    materials: Record<number, { color?: [number, number, number, number]; roughness?: number; metallic?: number }> | null = null
  ): void {
    this.send({ type: 'addModel', id, url, x, y, z, scale, rotationX, rotationY, rotationZ, opacity, materials })
  }

  /**
   * Remove a 3D model from the world.
   */
  removeModel(id: string): void {
    this.send({ type: 'removeModel', id })
  }

  /**
   * Update an existing 3D model's transform/opacity.
   */
  updateModel(
    id: string,
    x: number,
    y: number,
    z: number,
    scale: number,
    rotationX: number,
    rotationY: number,
    rotationZ: number,
    opacity: number,
    materials: Record<number, { color?: [number, number, number, number]; roughness?: number; metallic?: number }> | null = null
  ): void {
    this.send({ type: 'updateModel', id, x, y, z, scale, rotationX, rotationY, rotationZ, opacity, materials })
  }

  /**
   * Set callback for when a 3D model finishes loading.
   */
  setOnModelLoaded(cb: ModelLoadedCallback): void {
    this.onModelLoaded = cb
  }

  /**
   * Notify the worker of a viewport resize.
   */
  resize(width: number, height: number, dpr: number): void {
    this.send({ type: 'resize', width, height, dpr })
  }

  /**
   * Terminate the worker and release resources.
   */
  destroy(): void {
    this.worker?.terminate()
    this.worker = null
    this.ready = false
    this.messageBuffer = []
  }

  /**
   * Set callback for when an image texture finishes loading.
   */
  setOnImageLoaded(cb: ImageLoadedCallback): void {
    this.onImageLoaded = cb
  }

  /**
   * Set callback for when an IIIF manifest is loaded and tiles begin rendering.
   */
  setOnIIIFReady(cb: IIIFReadyCallback): void {
    this.onIIIFReady = cb
  }

  /**
   * Set callback for worker errors.
   */
  setOnError(cb: ErrorCallback): void {
    this.onError = cb
  }

  private send(msg: MainToWorkerMessage): void {
    if (msg.type === 'addIIIFImage' || msg.type === 'removeIIIFImage') {
      console.log(`[WorldRenderer] send(${msg.type}) ready=${this.ready} hasWorker=${!!this.worker} bufferSize=${this.messageBuffer.length}`)
    }
    if (this.ready && this.worker) {
      this.worker.postMessage(msg)
    } else {
      this.messageBuffer.push(msg)
    }
  }
}

/** Singleton instance — shared between WorldCanvas and ImagePlane */
export const worldRenderer = new WorldRenderer()
