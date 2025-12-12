export interface GLTFGeometry {

  //Uint16 = 16 bits = 2 bytes (can store 0 to 65,535)
  //Float32 = 32 bits = 4 bytes (can store decimal numbers)
  //Uint32 = 32 bits = 4 bytes (can store 0 to 4,294,967,295)

  vertices: Float32Array
  normals: Float32Array
  indices: Uint16Array | Uint32Array
}

export interface GLTFTransform {
  rotationX?: number  // Rotation in radians around X-axis
  rotationY?: number  // Rotation in radians around Y-axis
  rotationZ?: number  // Rotation in radians around Z-axis
  scale?: number      // Uniform scale factor
}

interface GLTFJson {
  buffers: Array<{ uri?: string; byteLength: number }>
  bufferViews: Array<{
    buffer: number
    byteOffset?: number
    byteLength: number
    target?: number
  }>
  accessors: Array<{
    bufferView: number
    byteOffset?: number
    componentType: number
    count: number
    type: string
    min?: number[]
    max?: number[]
  }>
  meshes: Array<{
    primitives: Array<{
      attributes: {
        POSITION?: number
        NORMAL?: number
        TEXCOORD_0?: number
      }
      indices?: number
      mode?: number
    }>
  }>
}

// WebGL component type constants
const COMPONENT_TYPES: Record<number, { size: number; TypedArray: any }> = {
  5120: { size: 1, TypedArray: Int8Array },
  5121: { size: 1, TypedArray: Uint8Array },
  5122: { size: 2, TypedArray: Int16Array },
  5123: { size: 2, TypedArray: Uint16Array },
  5125: { size: 4, TypedArray: Uint32Array },
  5126: { size: 4, TypedArray: Float32Array },
}

// Number of components per attribute type
const TYPE_SIZES: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
}

/**
 * Fetches and parses a GLTF file, extracting geometry data for WebGL rendering
 * @param url - URL to the .gltf or .glb file
 * @param meshIndex - Which mesh to extract (default: 0)
 * @param primitiveIndex - Which primitive within the mesh (default: 0)
 * @param transform - Optional transform to apply to vertices/normals on load
 * @returns Geometry data ready for WebGL buffers
 */
export async function loadGLTF(
  url: string,
  meshIndex: number = 0,
  primitiveIndex: number = 0,
  transform?: GLTFTransform
): Promise<GLTFGeometry> {
  const isGLB = url.toLowerCase().endsWith('.glb')

  let geometry: GLTFGeometry
  if (isGLB) {
    geometry = await loadGLB(url, meshIndex, primitiveIndex)
  } else {
    geometry = await loadGLTFJson(url, meshIndex, primitiveIndex)
  }

  // Apply transform if provided
  if (transform) {
    return applyTransform(geometry, transform)
  }

  return geometry
}

/**
 * Loads all meshes and primitives from a GLTF file and combines them
 * @param url - URL to the .gltf or .glb file
 * @param transform - Optional transform to apply to all geometry
 * @returns Combined geometry data ready for WebGL buffers
 */
export async function loadAllGLTF(
  url: string,
  transform?: GLTFTransform
): Promise<GLTFGeometry> {
  const isGLB = url.toLowerCase().endsWith('.glb')

  // Load the GLTF file
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch GLTF: ${response.statusText}`)
  }

  let gltf: GLTFJson
  let buffers: ArrayBuffer[]

  if (isGLB) {
    const arrayBuffer = await response.arrayBuffer()
    const result = parseGLB(arrayBuffer)
    gltf = result.gltf
    buffers = result.buffers
  } else {
    gltf = await response.json()
    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1)
    buffers = await loadBuffers(gltf, baseUrl)
  }

  // Combine all meshes and primitives
  const allVertices: number[] = []
  const allNormals: number[] = []
  const allIndices: number[] = []
  let indexOffset = 0

  for (let meshIndex = 0; meshIndex < gltf.meshes.length; meshIndex++) {
    const mesh = gltf.meshes[meshIndex]

    for (let primIndex = 0; primIndex < mesh.primitives.length; primIndex++) {
      const geometry = parseGLTFGeometry(gltf, buffers, meshIndex, primIndex)

      // Add vertices and normals
      allVertices.push(...geometry.vertices)
      allNormals.push(...geometry.normals)

      // Add indices with offset
      for (let i = 0; i < geometry.indices.length; i++) {
        allIndices.push(geometry.indices[i] + indexOffset)
      }

      indexOffset += geometry.vertices.length / 3
    }
  }

  // Determine index type based on vertex count
  const IndexType = indexOffset > 65535 ? Uint32Array : Uint16Array

  let combinedGeometry: GLTFGeometry = {
    vertices: new Float32Array(allVertices),
    normals: new Float32Array(allNormals),
    indices: new IndexType(allIndices)
  }

  // Apply transform if provided
  if (transform) {
    combinedGeometry = applyTransform(combinedGeometry, transform)
  }

  return combinedGeometry
}

/**
 * Helper function to parse GLB format
 */
function parseGLB(arrayBuffer: ArrayBuffer): { gltf: GLTFJson; buffers: ArrayBuffer[] } {
  const dataView = new DataView(arrayBuffer)

  // Parse GLB header
  const magic = dataView.getUint32(0, true)
  if (magic !== 0x46546c67) {
    throw new Error('Invalid GLB file: wrong magic number')
  }

  const version = dataView.getUint32(4, true)
  if (version !== 2) {
    throw new Error(`Unsupported GLB version: ${version}`)
  }

  // Parse JSON chunk
  const jsonChunkLength = dataView.getUint32(12, true)
  const jsonData = new TextDecoder().decode(
    new Uint8Array(arrayBuffer, 20, jsonChunkLength)
  )
  const gltf: GLTFJson = JSON.parse(jsonData)

  // Parse binary chunk
  const binaryChunkOffset = 20 + jsonChunkLength
  const binaryChunkLength = dataView.getUint32(binaryChunkOffset, true)
  const binaryData = arrayBuffer.slice(
    binaryChunkOffset + 8,
    binaryChunkOffset + 8 + binaryChunkLength
  )

  return { gltf, buffers: [binaryData] }
}

/**
 * Helper function to load external buffers
 */
async function loadBuffers(gltf: GLTFJson, baseUrl: string): Promise<ArrayBuffer[]> {
  const bufferPromises = gltf.buffers.map(async (buffer) => {
    if (buffer.uri) {
      if (buffer.uri.startsWith('data:')) {
        const base64Data = buffer.uri.split(',')[1]
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        return bytes.buffer
      }

      const bufferUrl = baseUrl + buffer.uri
      const bufferResponse = await fetch(bufferUrl)
      if (!bufferResponse.ok) {
        throw new Error(`Failed to fetch buffer: ${bufferResponse.statusText}`)
      }
      return bufferResponse.arrayBuffer()
    }
    throw new Error('Buffer URI missing')
  })

  return Promise.all(bufferPromises)
}

/**
 * Loads a binary GLB file
 */
async function loadGLB(
  url: string,
  meshIndex: number,
  primitiveIndex: number
): Promise<GLTFGeometry> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch GLB: ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const dataView = new DataView(arrayBuffer)

  // Parse GLB header
  const magic = dataView.getUint32(0, true)
  if (magic !== 0x46546c67) {
    throw new Error('Invalid GLB file: wrong magic number')
  }

  const version = dataView.getUint32(4, true)
  if (version !== 2) {
    throw new Error(`Unsupported GLB version: ${version}`)
  }

  // Parse JSON chunk
  const jsonChunkLength = dataView.getUint32(12, true)
  const jsonChunkType = dataView.getUint32(16, true)
  if (jsonChunkType !== 0x4e4f534a) {
    throw new Error('Invalid GLB: JSON chunk not found')
  }

  const jsonData = new TextDecoder().decode(
    new Uint8Array(arrayBuffer, 20, jsonChunkLength)
  )
  const gltf: GLTFJson = JSON.parse(jsonData)

  // Parse binary chunk
  const binaryChunkOffset = 20 + jsonChunkLength
  const binaryChunkLength = dataView.getUint32(binaryChunkOffset, true)
  const binaryChunkType = dataView.getUint32(binaryChunkOffset + 4, true)
  if (binaryChunkType !== 0x004e4942) {
    throw new Error('Invalid GLB: BIN chunk not found')
  }

  const binaryData = arrayBuffer.slice(
    binaryChunkOffset + 8,
    binaryChunkOffset + 8 + binaryChunkLength
  )

  return parseGLTFGeometry(gltf, [binaryData], meshIndex, primitiveIndex)
}

/**
 * Loads a JSON GLTF file with external buffers
 */
async function loadGLTFJson(
  url: string,
  meshIndex: number,
  primitiveIndex: number
): Promise<GLTFGeometry> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch GLTF: ${response.statusText}`)
  }

  const gltf: GLTFJson = await response.json()

  // Fetch all external buffers
  const baseUrl = url.substring(0, url.lastIndexOf('/') + 1)
  const bufferPromises = gltf.buffers.map(async (buffer) => {
    if (buffer.uri) {
      // Handle data URIs (embedded base64)
      if (buffer.uri.startsWith('data:')) {
        const base64Data = buffer.uri.split(',')[1]
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        return bytes.buffer
      }

      // Fetch external .bin file
      const bufferUrl = baseUrl + buffer.uri
      const bufferResponse = await fetch(bufferUrl)
      if (!bufferResponse.ok) {
        throw new Error(`Failed to fetch buffer: ${bufferResponse.statusText}`)
      }
      return bufferResponse.arrayBuffer()
    }
    throw new Error('Buffer URI missing')
  })

  const buffers = await Promise.all(bufferPromises)
  return parseGLTFGeometry(gltf, buffers, meshIndex, primitiveIndex)
}

/**
 * Parses GLTF JSON structure and extracts geometry data
 */
function parseGLTFGeometry(
  gltf: GLTFJson,
  buffers: ArrayBuffer[],
  meshIndex: number,
  primitiveIndex: number
): GLTFGeometry {
  // Validate mesh exists
  if (!gltf.meshes || meshIndex >= gltf.meshes.length) {
    throw new Error(`Mesh index ${meshIndex} not found`)
  }

  const mesh = gltf.meshes[meshIndex]
  if (primitiveIndex >= mesh.primitives.length) {
    throw new Error(`Primitive index ${primitiveIndex} not found`)
  }

  const primitive = mesh.primitives[primitiveIndex]

  // Extract positions
  if (primitive.attributes.POSITION === undefined) {
    throw new Error('GLTF primitive missing POSITION attribute')
  }
  const vertices = extractAccessorData(
    gltf,
    buffers,
    primitive.attributes.POSITION
  ) as Float32Array

  // Extract normals
  if (primitive.attributes.NORMAL === undefined) {
    throw new Error('GLTF primitive missing NORMAL attribute')
  }
  const normals = extractAccessorData(
    gltf,
    buffers,
    primitive.attributes.NORMAL
  ) as Float32Array

  // Extract indices
  if (primitive.indices === undefined) {
    throw new Error('GLTF primitive missing indices')
  }
  const indices = extractAccessorData(
    gltf,
    buffers,
    primitive.indices
  ) as Uint16Array | Uint32Array

  return { vertices, normals, indices }
}

/**
 * Extracts typed array data from a GLTF accessor
 */
function extractAccessorData(
  gltf: GLTFJson,
  buffers: ArrayBuffer[],
  accessorIndex: number
): Float32Array | Uint16Array | Uint32Array {
  const accessor = gltf.accessors[accessorIndex]
  const bufferView = gltf.bufferViews[accessor.bufferView]
  const buffer = buffers[bufferView.buffer]

  const componentTypeInfo = COMPONENT_TYPES[accessor.componentType]
  if (!componentTypeInfo) {
    throw new Error(`Unsupported component type: ${accessor.componentType}`)
  }

  const elementSize = TYPE_SIZES[accessor.type]
  if (!elementSize) {
    throw new Error(`Unsupported accessor type: ${accessor.type}`)
  }

  const byteOffset =
    (bufferView.byteOffset || 0) + (accessor.byteOffset || 0)
  const byteLength = accessor.count * elementSize * componentTypeInfo.size

  return new componentTypeInfo.TypedArray(buffer, byteOffset, accessor.count * elementSize)
}

/**
 * Applies rotation and scale transforms to geometry
 */
function applyTransform(geometry: GLTFGeometry, transform: GLTFTransform): GLTFGeometry {
  const { rotationX = 0, rotationY = 0, rotationZ = 0, scale = 1 } = transform

  // Create rotation matrices
  const cosX = Math.cos(rotationX)
  const sinX = Math.sin(rotationX)
  const cosY = Math.cos(rotationY)
  const sinY = Math.sin(rotationY)
  const cosZ = Math.cos(rotationZ)
  const sinZ = Math.sin(rotationZ)

  // Combined rotation matrix (Z * Y * X order)
  const m00 = cosY * cosZ
  const m01 = sinX * sinY * cosZ - cosX * sinZ
  const m02 = cosX * sinY * cosZ + sinX * sinZ

  const m10 = cosY * sinZ
  const m11 = sinX * sinY * sinZ + cosX * cosZ
  const m12 = cosX * sinY * sinZ - sinX * cosZ

  const m20 = -sinY
  const m21 = sinX * cosY
  const m22 = cosX * cosY

  // Transform vertices
  const newVertices = new Float32Array(geometry.vertices.length)
  for (let i = 0; i < geometry.vertices.length; i += 3) {
    const x = geometry.vertices[i]
    const y = geometry.vertices[i + 1]
    const z = geometry.vertices[i + 2]

    newVertices[i] = (m00 * x + m01 * y + m02 * z) * scale
    newVertices[i + 1] = (m10 * x + m11 * y + m12 * z) * scale
    newVertices[i + 2] = (m20 * x + m21 * y + m22 * z) * scale
  }

  // Transform normals (rotation only, no scale)
  const newNormals = new Float32Array(geometry.normals.length)
  for (let i = 0; i < geometry.normals.length; i += 3) {
    const nx = geometry.normals[i]
    const ny = geometry.normals[i + 1]
    const nz = geometry.normals[i + 2]

    const nnx = m00 * nx + m01 * ny + m02 * nz
    const nny = m10 * nx + m11 * ny + m12 * nz
    const nnz = m20 * nx + m21 * ny + m22 * nz

    // Renormalize
    const len = Math.sqrt(nnx * nnx + nny * nny + nnz * nnz)
    newNormals[i] = nnx / len
    newNormals[i + 1] = nny / len
    newNormals[i + 2] = nnz / len
  }

  return {
    vertices: newVertices,
    normals: newNormals,
    indices: geometry.indices
  }
}
