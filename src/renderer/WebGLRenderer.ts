import { mat4 } from 'gl-matrix'
import { vertexShaderSource, fragmentShaderSource } from './shaders'

export interface QuadState {
  id: string
  x: number
  y: number
  z: number
  width: number
  height: number
  opacity: number
  texture: WebGLTexture | null
  texWidth: number
  texHeight: number
}

export class WebGLRenderer {
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private vertexBuffer: WebGLBuffer

  // Uniform locations
  private uCombinedMatrix: WebGLUniformLocation
  private uTexture: WebGLUniformLocation
  private uOpacity: WebGLUniformLocation

  // Attribute locations
  private aPosition: number
  private aTexCoord: number

  // Anisotropic filtering
  private maxAnisotropy: number = 1

  // Reusable matrices (avoid allocations per frame)
  private projMatrix = mat4.create()
  private viewMatrix = mat4.create()
  private vpSceneMatrix = mat4.create()
  private modelMatrix = mat4.create()
  private mvpMatrix = mat4.create()
  private tempMatrix = mat4.create()

  // Camera state
  private baseCameraZ = 1000

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl

    // Anisotropic filtering extension
    const anisoExt = gl.getExtension('EXT_texture_filter_anisotropic')
    if (anisoExt) {
      this.maxAnisotropy = gl.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
    }

    // Compile shaders and link program
    const vs = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource)
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource)
    this.program = this.createProgram(vs, fs)

    // Get locations
    this.aPosition = gl.getAttribLocation(this.program, 'a_position')
    this.aTexCoord = gl.getAttribLocation(this.program, 'a_texCoord')
    this.uCombinedMatrix = gl.getUniformLocation(this.program, 'u_combinedMatrix')!
    this.uTexture = gl.getUniformLocation(this.program, 'u_texture')!
    this.uOpacity = gl.getUniformLocation(this.program, 'u_opacity')!

    // Create unit quad buffer (centered at origin, matching Three.js PlaneGeometry)
    // Interleaved: position(x,y) + texCoord(u,v)
    // V is flipped (1→0 bottom-to-top) so image top maps to quad top
    // without relying on UNPACK_FLIP_Y_WEBGL (unreliable with ImageBitmap)
    // prettier-ignore
    const quadData = new Float32Array([
      // Triangle 1
      -0.5, -0.5,  0.0, 1.0,
       0.5, -0.5,  1.0, 1.0,
       0.5,  0.5,  1.0, 0.0,
      // Triangle 2
      -0.5, -0.5,  0.0, 1.0,
       0.5,  0.5,  1.0, 0.0,
      -0.5,  0.5,  0.0, 0.0,
    ])
    this.vertexBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW)

    // Premultiplied alpha blending (eliminates dark fringes at transparency edges)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  }

  /**
   * Recomputes the shared view-projection-scene matrix from camera state.
   * Called once per frame before rendering quads.
   */
  updateCamera(
    truePositionX: number,
    truePositionY: number,
    zoom: number,
    fov: number,
    viewportWidth: number,
    viewportHeight: number
  ): void {
    const aspect = viewportWidth / viewportHeight
    const pixelToUnit =
      (2 * Math.tan(fov / 2) * this.baseCameraZ) / viewportHeight
    const sceneX = truePositionX * pixelToUnit
    const sceneY = -truePositionY * pixelToUnit

    // Projection
    mat4.perspective(this.projMatrix, fov, aspect, 0.1, 10000)

    // View: camera at (0, 0, baseCameraZ) looking down -Z
    mat4.identity(this.viewMatrix)
    mat4.translate(this.viewMatrix, this.viewMatrix, [0, 0, -this.baseCameraZ])

    // VP = Projection * View
    mat4.multiply(this.vpSceneMatrix, this.projMatrix, this.viewMatrix)

    // Scene transform: translate then scale (same as Three.js scene.position + scene.scale)
    mat4.identity(this.tempMatrix)
    mat4.translate(this.tempMatrix, this.tempMatrix, [sceneX, sceneY, 0])
    mat4.scale(this.tempMatrix, this.tempMatrix, [zoom, zoom, zoom])

    // VPScene = VP * SceneTransform
    mat4.multiply(this.vpSceneMatrix, this.vpSceneMatrix, this.tempMatrix)
  }

  /**
   * Renders a set of quads sorted by z-order (painter's algorithm).
   * Quads without a texture are skipped.
   */
  renderQuads(quads: QuadState[]): void {
    const gl = this.gl

    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.program)

    // Bind vertex buffer and set up attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    const stride = 4 * 4 // 4 floats * 4 bytes
    gl.enableVertexAttribArray(this.aPosition)
    gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, stride, 0)
    gl.enableVertexAttribArray(this.aTexCoord)
    gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, stride, 2 * 4)

    // Texture unit 0
    gl.activeTexture(gl.TEXTURE0)
    gl.uniform1i(this.uTexture, 0)

    for (const quad of quads) {
      if (!quad.texture) continue

      // Model transform: translate(x, -y, z) * scale(w, h, 1)
      // Y is negated to match Three.js convention (ImagePlaneMesh uses -position[1])
      mat4.identity(this.modelMatrix)
      mat4.translate(this.modelMatrix, this.modelMatrix, [
        quad.x,
        -quad.y,
        quad.z,
      ])
      mat4.scale(this.modelMatrix, this.modelMatrix, [
        quad.width,
        quad.height,
        1,
      ])

      // MVP = VPScene * Model
      mat4.multiply(this.mvpMatrix, this.vpSceneMatrix, this.modelMatrix)

      gl.uniformMatrix4fv(this.uCombinedMatrix, false, this.mvpMatrix as Float32Array)
      gl.uniform1f(this.uOpacity, quad.opacity)
      gl.bindTexture(gl.TEXTURE_2D, quad.texture)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }
  }

  /**
   * Phase 1: Upload pixel data with LINEAR filter (fast, image visible immediately).
   * Mipmaps are deferred to phase 2 to avoid GPU stalls.
   */
  uploadTexture(bitmap: ImageBitmap): { texture: WebGLTexture; texWidth: number; texHeight: number } {
    const gl = this.gl
    const texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap)

    // Start with LINEAR only (no mipmaps yet) for minimal GPU cost
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    return { texture, texWidth: bitmap.width, texHeight: bitmap.height }
  }

  /**
   * Phase 2: Generate mipmaps and apply anisotropic filtering (deferred quality upgrade).
   */
  finalizeMipmaps(texture: WebGLTexture): void {
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)

    if (this.maxAnisotropy > 1) {
      const anisoExt = gl.getExtension('EXT_texture_filter_anisotropic')!
      gl.texParameterf(gl.TEXTURE_2D, anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, this.maxAnisotropy)
    }
  }

  /**
   * Delete a WebGL texture.
   */
  deleteTexture(texture: WebGLTexture): void {
    this.gl.deleteTexture(texture)
  }

  /**
   * Resize the viewport.
   */
  resize(width: number, height: number): void {
    this.gl.viewport(0, 0, width, height)
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error(`Shader compile error: ${info}`)
    }
    return shader
  }

  private createProgram(vs: WebGLShader, fs: WebGLShader): WebGLProgram {
    const gl = this.gl
    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program)
      throw new Error(`Program link error: ${info}`)
    }
    // Shaders can be detached after linking
    gl.detachShader(program, vs)
    gl.detachShader(program, fs)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    return program
  }
}
