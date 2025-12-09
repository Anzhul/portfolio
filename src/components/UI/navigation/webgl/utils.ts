export function compileShader(
  gl: WebGLRenderingContext,
  source: string,
  type: number
): WebGLShader | null {
  //Creates an empty shader object and compiles the source code into it.
  const shader = gl.createShader(type)
  if (!shader) return null

  // Attach the source code to the shader, send from js heap to gpu memory, and compile it.
  gl.shaderSource(shader, source)
  // Converts the GLSL code into a binary format that the GPU can understand.
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}

export function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {

  //Allocates a program object in GPU memory
  const program = gl.createProgram()
  if (!program) return null

  //Creates a link between the program and compiled vertex shader
  gl.attachShader(program, vertexShader)
  //Creates a link between the program and compiled fragment shader
  gl.attachShader(program, fragmentShader)
  //Validate vertex and fragment shaders are compatible
  //Combines shader binaries into a unified executable
  //creates gpu pipeline state
  //Allocates memory for attribute and uniforms
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }

  return program
}

export function createPerspectiveMatrix(
  fov: number,
  aspect: number,
  near: number,
  far: number
): Float32Array {
  const f = 1.0 / Math.tan(fov / 2)
  const rangeInv = 1 / (near - far)

  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0
  ])
}

export interface CameraPosition {
  x?: number
  y?: number
  z?: number
}

export function createModelViewMatrix(
  rotationY: number,
  distance: number = 4,
  rotationX: number = 0,
  rotationZ: number = 0,
  cameraPos: CameraPosition = {}
): Float32Array {
  const { x = 0, y = 0, z = 0 } = cameraPos

  const cosY = Math.cos(rotationY)
  const sinY = Math.sin(rotationY)
  const cosX = Math.cos(rotationX)
  const sinX = Math.sin(rotationX)
  const cosZ = Math.cos(rotationZ)
  const sinZ = Math.sin(rotationZ)

  // Combined rotation matrix (Y * X * Z)
  const m00 = cosY * cosZ - sinY * sinX * sinZ
  const m01 = -cosY * sinZ - sinY * sinX * cosZ
  const m02 = -sinY * cosX

  const m10 = cosX * sinZ
  const m11 = cosX * cosZ
  const m12 = -sinX

  const m20 = sinY * cosZ + cosY * sinX * sinZ
  const m21 = -sinY * sinZ + cosY * sinX * cosZ
  const m22 = cosY * cosX

  return new Float32Array([
    m00, m01, m02, 0,
    m10, m11, m12, 0,
    m20, m21, m22, 0,
    x, y, -(distance - z), 1  // Camera position (x, y, z) with distance
  ])
}

export function createNormalMatrix(modelView: Float32Array): Float32Array {
  // Simplified normal matrix (inverse transpose of upper 3x3)
  // For rotation-only transforms, the normal matrix is the same as model view
  return new Float32Array([
    modelView[0], modelView[1], modelView[2], 0,
    modelView[4], modelView[5], modelView[6], 0,
    modelView[8], modelView[9], modelView[10], 0,
    0, 0, 0, 1
  ])
}
