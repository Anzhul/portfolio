/**
 * Minimal GLB (binary glTF 2.0) parser for the WebGL worker.
 * No Three.js dependency — extracts mesh geometry, materials, and embedded textures
 * directly from the binary format.
 *
 * Handles: mesh primitives (POSITION, NORMAL, TEXCOORD_0, indices),
 * node transforms, base color materials, embedded textures.
 *
 * Does NOT handle: animations, skinning, morphs, sparse accessors, extensions.
 */

import { mat4 } from 'gl-matrix'

// ── Public types ──

export interface ParsedModel {
  meshes: ParsedMesh[]
}

export interface ParsedMesh {
  primitives: ParsedPrimitive[]
  transform: Float32Array // 4x4 node transform matrix
}

export interface ParsedPrimitive {
  positions: Float32Array
  normals: Float32Array | null
  texCoords: Float32Array | null
  indices: Uint16Array | Uint32Array
  materialIndex: number
  baseColor: [number, number, number, number]
  roughness: number
  metallic: number
  textureImage: ImageBitmap | null
}

// ── Internal glTF JSON types ──

interface GltfJson {
  scene?: number
  scenes?: { nodes?: number[] }[]
  nodes?: GltfNode[]
  meshes?: GltfMesh[]
  accessors?: GltfAccessor[]
  bufferViews?: GltfBufferView[]
  materials?: GltfMaterial[]
  textures?: { source?: number; sampler?: number }[]
  images?: GltfImage[]
}

interface GltfNode {
  mesh?: number
  children?: number[]
  translation?: [number, number, number]
  rotation?: [number, number, number, number]
  scale?: [number, number, number]
  matrix?: number[]
}

interface GltfMesh {
  primitives: {
    attributes: Record<string, number>
    indices?: number
    material?: number
  }[]
}

interface GltfAccessor {
  bufferView?: number
  byteOffset?: number
  componentType: number
  count: number
  type: string
}

interface GltfBufferView {
  buffer: number
  byteOffset?: number
  byteLength: number
  byteStride?: number
}

interface GltfMaterial {
  pbrMetallicRoughness?: {
    baseColorFactor?: [number, number, number, number]
    baseColorTexture?: { index: number }
    metallicFactor?: number
    roughnessFactor?: number
  }
}

interface GltfImage {
  bufferView?: number
  mimeType?: string
  uri?: string
}

// ── glTF constants ──

const COMPONENT_TYPE_BYTE = 5120
const COMPONENT_TYPE_UNSIGNED_BYTE = 5121
const COMPONENT_TYPE_SHORT = 5122
const COMPONENT_TYPE_UNSIGNED_SHORT = 5123
const COMPONENT_TYPE_UNSIGNED_INT = 5125
const COMPONENT_TYPE_FLOAT = 5126

const TYPE_ELEMENT_COUNT: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
}

// ── Parser ──

export async function parseGLB(buffer: ArrayBuffer): Promise<ParsedModel> {
  const view = new DataView(buffer)

  // GLB Header (12 bytes)
  const magic = view.getUint32(0, true)
  if (magic !== 0x46546c67) {
    throw new Error('Not a valid GLB file (bad magic)')
  }
  const version = view.getUint32(4, true)
  if (version !== 2) {
    throw new Error(`Unsupported glTF version: ${version}`)
  }

  // Parse chunks
  let jsonChunk: string | null = null
  let binChunk: ArrayBuffer | null = null
  let offset = 12

  while (offset < buffer.byteLength) {
    const chunkLength = view.getUint32(offset, true)
    const chunkType = view.getUint32(offset + 4, true)
    const chunkData = buffer.slice(offset + 8, offset + 8 + chunkLength)

    if (chunkType === 0x4e4f534a) {
      // JSON chunk
      jsonChunk = new TextDecoder().decode(chunkData)
    } else if (chunkType === 0x004e4942) {
      // BIN chunk
      binChunk = chunkData
    }

    offset += 8 + chunkLength
  }

  if (!jsonChunk) throw new Error('GLB missing JSON chunk')
  const json: GltfJson = JSON.parse(jsonChunk)

  // Helper: read accessor data from BIN chunk
  function readAccessor(accessorIndex: number): { data: ArrayBuffer; componentType: number; count: number; elementCount: number } {
    const accessor = json.accessors![accessorIndex]
    const bv = json.bufferViews![accessor.bufferView ?? 0]
    const byteOffset = (bv.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
    const elementCount = TYPE_ELEMENT_COUNT[accessor.type] ?? 1

    let bytesPerComponent: number
    switch (accessor.componentType) {
      case COMPONENT_TYPE_BYTE:
      case COMPONENT_TYPE_UNSIGNED_BYTE:
        bytesPerComponent = 1; break
      case COMPONENT_TYPE_SHORT:
      case COMPONENT_TYPE_UNSIGNED_SHORT:
        bytesPerComponent = 2; break
      case COMPONENT_TYPE_UNSIGNED_INT:
      case COMPONENT_TYPE_FLOAT:
        bytesPerComponent = 4; break
      default:
        bytesPerComponent = 4
    }

    const totalBytes = accessor.count * elementCount * bytesPerComponent
    const data = binChunk!.slice(byteOffset, byteOffset + totalBytes)

    return { data, componentType: accessor.componentType, count: accessor.count, elementCount }
  }

  function toFloat32Array(accessorIndex: number): Float32Array {
    const { data, componentType, count, elementCount } = readAccessor(accessorIndex)
    if (componentType === COMPONENT_TYPE_FLOAT) {
      return new Float32Array(data)
    }
    // Convert non-float to float
    const result = new Float32Array(count * elementCount)
    const view = new DataView(data)
    for (let i = 0; i < result.length; i++) {
      switch (componentType) {
        case COMPONENT_TYPE_BYTE: result[i] = view.getInt8(i); break
        case COMPONENT_TYPE_UNSIGNED_BYTE: result[i] = view.getUint8(i); break
        case COMPONENT_TYPE_SHORT: result[i] = view.getInt16(i * 2, true); break
        case COMPONENT_TYPE_UNSIGNED_SHORT: result[i] = view.getUint16(i * 2, true); break
        default: result[i] = 0
      }
    }
    return result
  }

  function toIndexArray(accessorIndex: number): Uint16Array | Uint32Array {
    const { data, componentType } = readAccessor(accessorIndex)
    if (componentType === COMPONENT_TYPE_UNSIGNED_INT) {
      return new Uint32Array(data)
    }
    if (componentType === COMPONENT_TYPE_UNSIGNED_SHORT) {
      return new Uint16Array(data)
    }
    // Convert bytes to Uint16
    const bytes = new Uint8Array(data)
    const result = new Uint16Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) result[i] = bytes[i]
    return result
  }

  // Helper: decode embedded image from BIN chunk
  async function decodeImage(imageIndex: number): Promise<ImageBitmap | null> {
    const image = json.images?.[imageIndex]
    if (!image) return null

    if (image.bufferView !== undefined && binChunk) {
      const bv = json.bufferViews![image.bufferView]
      const byteOffset = bv.byteOffset ?? 0
      const imageData = binChunk.slice(byteOffset, byteOffset + bv.byteLength)
      const blob = new Blob([imageData], { type: image.mimeType || 'image/png' })
      return createImageBitmap(blob, { premultiplyAlpha: 'none' })
    }

    return null
  }

  // Helper: compute node transform matrix
  function getNodeTransform(node: GltfNode): Float32Array {
    const m = mat4.create()

    if (node.matrix) {
      // Direct matrix
      for (let i = 0; i < 16; i++) m[i] = node.matrix[i]
    } else {
      // TRS decomposition
      const t = node.translation ?? [0, 0, 0]
      const r = node.rotation ?? [0, 0, 0, 1]
      const s = node.scale ?? [1, 1, 1]
      mat4.fromRotationTranslationScale(m, r as unknown as Float32Array, t as unknown as Float32Array, s as unknown as Float32Array)
    }

    return m as Float32Array
  }

  // Walk scene graph and collect meshes with accumulated transforms
  const result: ParsedMesh[] = []

  async function processNode(nodeIndex: number, parentTransform: Float32Array): Promise<void> {
    const node = json.nodes![nodeIndex]
    const localTransform = getNodeTransform(node)
    const worldTransform = mat4.create() as Float32Array
    mat4.multiply(worldTransform, parentTransform, localTransform)

    if (node.mesh !== undefined) {
      const gltfMesh = json.meshes![node.mesh]
      const primitives: ParsedPrimitive[] = []

      for (const prim of gltfMesh.primitives) {
        // Geometry
        const posIdx = prim.attributes.POSITION
        if (posIdx === undefined) continue

        const positions = toFloat32Array(posIdx)
        const normals = prim.attributes.NORMAL !== undefined
          ? toFloat32Array(prim.attributes.NORMAL)
          : null
        const texCoords = prim.attributes.TEXCOORD_0 !== undefined
          ? toFloat32Array(prim.attributes.TEXCOORD_0)
          : null

        // Indices (required for indexed drawing)
        if (prim.indices === undefined) continue
        const indices = toIndexArray(prim.indices)

        // Material
        let baseColor: [number, number, number, number] = [1, 1, 1, 1]
        let roughness = 0.4
        let metallic = 0.0
        let textureImage: ImageBitmap | null = null

        if (prim.material !== undefined) {
          const mat = json.materials?.[prim.material]
          const pbr = mat?.pbrMetallicRoughness
          if (pbr?.baseColorFactor) {
            baseColor = pbr.baseColorFactor
          }
          if (pbr?.roughnessFactor !== undefined) {
            roughness = pbr.roughnessFactor
          }
          if (pbr?.metallicFactor !== undefined) {
            metallic = pbr.metallicFactor
          }
          if (pbr?.baseColorTexture !== undefined) {
            const texInfo = json.textures?.[pbr.baseColorTexture.index]
            if (texInfo?.source !== undefined) {
              textureImage = await decodeImage(texInfo.source)
            }
          }
        }

        primitives.push({ positions, normals, texCoords, indices, materialIndex: prim.material ?? -1, baseColor, roughness, metallic, textureImage })
      }

      if (primitives.length > 0) {
        result.push({ primitives, transform: worldTransform })
      }
    }

    // Process children
    if (node.children) {
      for (const childIdx of node.children) {
        await processNode(childIdx, worldTransform)
      }
    }
  }

  // Start from scene root nodes
  const sceneIndex = json.scene ?? 0
  const scene = json.scenes?.[sceneIndex]
  const rootNodes = scene?.nodes ?? []
  const identity = mat4.create() as Float32Array

  for (const nodeIdx of rootNodes) {
    await processNode(nodeIdx, identity)
  }

  return { meshes: result }
}
