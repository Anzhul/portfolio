// Message protocol between main thread and worker

// ── Main → Worker ──

export interface InitMessage {
  type: 'init'
  canvas: OffscreenCanvas
  width: number
  height: number
  dpr: number
}

export interface ResizeMessage {
  type: 'resize'
  width: number
  height: number
  dpr: number
}

export interface CameraMessage {
  type: 'camera'
  truePositionX: number
  truePositionY: number
  zoom: number
  fov: number
  viewportWidth: number
  viewportHeight: number
}

export interface AddImageMessage {
  type: 'addImage'
  id: string
  url: string
  x: number
  y: number
  z: number
  width: number
  height: number
  opacity: number
}

export interface RemoveImageMessage {
  type: 'removeImage'
  id: string
}

export interface UpdateImageMessage {
  type: 'updateImage'
  id: string
  x: number
  y: number
  z: number
  width: number
  height: number
  opacity: number
}

export interface AddIIIFImageMessage {
  type: 'addIIIFImage'
  id: string
  infoUrl: string
  x: number
  y: number
  z: number
  width: number
  height: number
  opacity: number
}

export interface RemoveIIIFImageMessage {
  type: 'removeIIIFImage'
  id: string
}

export interface ModelMaterialOverride {
  color?: [number, number, number, number]
  roughness?: number
  metallic?: number
}

export interface AddModelMessage {
  type: 'addModel'
  id: string
  url: string
  x: number
  y: number
  z: number
  scale: number
  rotationX: number
  rotationY: number
  rotationZ: number
  opacity: number
  materials: Record<number, ModelMaterialOverride> | null
}

export interface RemoveModelMessage {
  type: 'removeModel'
  id: string
}

export interface UpdateModelMessage {
  type: 'updateModel'
  id: string
  x: number
  y: number
  z: number
  scale: number
  rotationX: number
  rotationY: number
  rotationZ: number
  opacity: number
  materials: Record<number, ModelMaterialOverride> | null
}

export type MainToWorkerMessage =
  | InitMessage
  | ResizeMessage
  | CameraMessage
  | AddImageMessage
  | RemoveImageMessage
  | UpdateImageMessage
  | AddIIIFImageMessage
  | RemoveIIIFImageMessage
  | AddModelMessage
  | RemoveModelMessage
  | UpdateModelMessage

// ── Worker → Main ──

export interface ReadyMessage {
  type: 'ready'
}

export interface ImageLoadedMessage {
  type: 'imageLoaded'
  id: string
}

export interface IIIFReadyMessage {
  type: 'iiifReady'
  id: string
  imageWidth: number
  imageHeight: number
}

export interface ModelLoadedMessage {
  type: 'modelLoaded'
  id: string
}

export interface ErrorMessage {
  type: 'error'
  message: string
  id?: string
}

export type WorkerToMainMessage =
  | ReadyMessage
  | ImageLoadedMessage
  | IIIFReadyMessage
  | ModelLoadedMessage
  | ErrorMessage
