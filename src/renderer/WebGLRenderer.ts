import { mat4, mat3 } from 'gl-matrix'
import {
  vertexShaderSource,
  fragmentShaderSource,
  meshVertexShaderSource,
  meshFragmentShaderSource,
} from './shaders'
import type { ParsedPrimitive } from './GLBParser'

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

export interface MeshPrimitiveGPU {
  vao: WebGLVertexArrayObject
  indexCount: number
  indexType: number // gl.UNSIGNED_SHORT or gl.UNSIGNED_INT
  materialIndex: number
  baseColor: [number, number, number, number]
  roughness: number
  metallic: number
  texture: WebGLTexture | null
}

export interface MaterialOverride {
  color?: [number, number, number, number]
  roughness?: number
  metallic?: number
}

export interface MeshState {
  id: string
  x: number
  y: number
  z: number
  scale: number
  rotationX: number
  rotationY: number
  rotationZ: number
  opacity: number
  materialOverrides: Record<number, MaterialOverride> | null
  primitives: MeshPrimitiveGPU[]
  nodeTransforms: Float32Array[] // per-submesh node transform from GLB
}

export class WebGLRenderer {
  private gl: WebGL2RenderingContext

  // Quad program
  private program: WebGLProgram
  private vertexBuffer: WebGLBuffer
  private uCombinedMatrix: WebGLUniformLocation
  private uTexture: WebGLUniformLocation
  private uOpacity: WebGLUniformLocation
  private aPosition: number
  private aTexCoord: number

  // Mesh program
  private meshProgram: WebGLProgram
  private meshUMvp: WebGLUniformLocation
  private meshUModelView: WebGLUniformLocation
  private meshUNormalMatrix: WebGLUniformLocation
  private meshUBaseColor: WebGLUniformLocation
  private meshUMeshTexture: WebGLUniformLocation
  private meshUHasTexture: WebGLUniformLocation
  private meshUOpacity: WebGLUniformLocation
  private meshULightDir: WebGLUniformLocation
  private meshUAmbientColor: WebGLUniformLocation
  private meshURoughness: WebGLUniformLocation
  private meshUMetallic: WebGLUniformLocation

  // Anisotropic filtering
  private maxAnisotropy: number = 1

  // Reusable matrices (avoid allocations per frame)
  private projMatrix = mat4.create()
  private viewMatrix = mat4.create()
  private vpSceneMatrix = mat4.create()
  private modelMatrix = mat4.create()
  private mvpMatrix = mat4.create()
  private tempMatrix = mat4.create()
  private sceneMatrix = mat4.create()
  private modelViewMatrix = mat4.create()
  private normalMatrix = mat3.create()

  // Camera state
  private baseCameraZ = 1853

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl

    // Anisotropic filtering extension
    const anisoExt = gl.getExtension('EXT_texture_filter_anisotropic')
    if (anisoExt) {
      this.maxAnisotropy = gl.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
    }

    // ── Quad program ──
    const vs = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource)
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource)
    this.program = this.createProgram(vs, fs)

    this.aPosition = gl.getAttribLocation(this.program, 'a_position')
    this.aTexCoord = gl.getAttribLocation(this.program, 'a_texCoord')
    this.uCombinedMatrix = gl.getUniformLocation(this.program, 'u_combinedMatrix')!
    this.uTexture = gl.getUniformLocation(this.program, 'u_texture')!
    this.uOpacity = gl.getUniformLocation(this.program, 'u_opacity')!

    // Create unit quad buffer
    // prettier-ignore
    const quadData = new Float32Array([
      -0.5, -0.5,  0.0, 1.0,
       0.5, -0.5,  1.0, 1.0,
       0.5,  0.5,  1.0, 0.0,
      -0.5, -0.5,  0.0, 1.0,
       0.5,  0.5,  1.0, 0.0,
      -0.5,  0.5,  0.0, 0.0,
    ])
    this.vertexBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW)

    // ── Mesh program ──
    const mvs = this.compileShader(gl.VERTEX_SHADER, meshVertexShaderSource)
    const mfs = this.compileShader(gl.FRAGMENT_SHADER, meshFragmentShaderSource)
    this.meshProgram = this.createProgram(mvs, mfs)

    this.meshUMvp = gl.getUniformLocation(this.meshProgram, 'u_mvp')!
    this.meshUModelView = gl.getUniformLocation(this.meshProgram, 'u_modelView')!
    this.meshUNormalMatrix = gl.getUniformLocation(this.meshProgram, 'u_normalMatrix')!
    this.meshUBaseColor = gl.getUniformLocation(this.meshProgram, 'u_baseColor')!
    this.meshUMeshTexture = gl.getUniformLocation(this.meshProgram, 'u_meshTexture')!
    this.meshUHasTexture = gl.getUniformLocation(this.meshProgram, 'u_hasTexture')!
    this.meshUOpacity = gl.getUniformLocation(this.meshProgram, 'u_meshOpacity')!
    this.meshULightDir = gl.getUniformLocation(this.meshProgram, 'u_lightDir')!
    this.meshUAmbientColor = gl.getUniformLocation(this.meshProgram, 'u_ambientColor')!
    this.meshURoughness = gl.getUniformLocation(this.meshProgram, 'u_roughness')!
    this.meshUMetallic = gl.getUniformLocation(this.meshProgram, 'u_metallic')!

    // Premultiplied alpha blending
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
    // Near=10 (not 0.1) — closest geometry is ~1253 units from camera at max
    // zoom, so 10 has huge margin. The 100× tighter near/far ratio eliminates
    // z-fighting between adjacent mesh primitives (pen grip/body/ferrule).
    mat4.perspective(this.projMatrix, fov, aspect, 10, 10000)

    // View: camera at (0, 0, baseCameraZ) looking down -Z
    mat4.identity(this.viewMatrix)
    mat4.translate(this.viewMatrix, this.viewMatrix, [0, 0, -this.baseCameraZ])

    // VP = Projection * View
    mat4.multiply(this.vpSceneMatrix, this.projMatrix, this.viewMatrix)

    // Scene transform: translate then scale.
    // Scale includes pixelToUnit so that 1 pixel-unit in content space = 1 CSS pixel.
    // Without this, the camera translate (which uses pixelToUnit) and content
    // positions (raw pixel units) are in mismatched coordinate spaces, causing
    // WebGL content to drift from HTML elements at non-zero island positions.
    const effectiveScale = zoom * pixelToUnit
    mat4.identity(this.sceneMatrix)
    mat4.translate(this.sceneMatrix, this.sceneMatrix, [sceneX, sceneY, 0])
    mat4.scale(this.sceneMatrix, this.sceneMatrix, [effectiveScale, effectiveScale, effectiveScale])

    // VPScene = VP * SceneTransform
    mat4.multiply(this.vpSceneMatrix, this.vpSceneMatrix, this.sceneMatrix)
  }

  /**
   * Renders a set of quads sorted by z-order (painter's algorithm).
   * Quads without a texture are skipped.
   */
  renderQuads(quads: QuadState[]): void {
    const gl = this.gl

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    // Quads use painter's algorithm (sorted back-to-front) — no depth testing.
    // Depth testing caused z-fighting with transparent PNGs writing depth for
    // invisible pixels. Depth buffer is still cleared for 3D meshes rendered after.
    gl.disable(gl.DEPTH_TEST)
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
   * Render 3D meshes using the mesh shader program.
   * Should be called after renderQuads (depth buffer already cleared).
   */
  renderMeshes(meshes: MeshState[]): void {
    const gl = this.gl

    gl.useProgram(this.meshProgram)
    gl.enable(gl.DEPTH_TEST)

    // Lighting uniforms — gentle directional + high ambient for soft look
    const lx = 0.2, ly = 0.5, lz = 0.4
    const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz)
    gl.uniform3f(this.meshULightDir, lx / lLen, ly / lLen, lz / lLen)
    gl.uniform3f(this.meshUAmbientColor, 0.75, 0.75, 0.75)

    gl.activeTexture(gl.TEXTURE0)
    gl.uniform1i(this.meshUMeshTexture, 0)

    for (const mesh of meshes) {
      // Build object model matrix: translate(x, -y, z) * rotateXYZ * scale
      mat4.identity(this.modelMatrix)
      mat4.translate(this.modelMatrix, this.modelMatrix, [
        mesh.x,
        -mesh.y, // Y inversion (CSS Y+ down → GL Y+ up)
        mesh.z,
      ])
      mat4.rotateX(this.modelMatrix, this.modelMatrix, mesh.rotationX)
      mat4.rotateY(this.modelMatrix, this.modelMatrix, mesh.rotationY)
      mat4.rotateZ(this.modelMatrix, this.modelMatrix, mesh.rotationZ)
      mat4.scale(this.modelMatrix, this.modelMatrix, [mesh.scale, mesh.scale, mesh.scale])

      for (let i = 0; i < mesh.primitives.length; i++) {
        const prim = mesh.primitives[i]
        const nodeTransform = mesh.nodeTransforms[i]

        // Final model = objectModel * nodeTransform
        mat4.multiply(this.tempMatrix, this.modelMatrix, nodeTransform)

        // ModelView = View * SceneTransform * Model
        mat4.multiply(this.modelViewMatrix, this.viewMatrix, this.sceneMatrix)
        mat4.multiply(this.modelViewMatrix, this.modelViewMatrix, this.tempMatrix)
        gl.uniformMatrix4fv(this.meshUModelView, false, this.modelViewMatrix as Float32Array)

        // MVP = Projection * ModelView
        mat4.multiply(this.mvpMatrix, this.projMatrix, this.modelViewMatrix)
        gl.uniformMatrix4fv(this.meshUMvp, false, this.mvpMatrix as Float32Array)

        // Normal matrix (from model-view for correct view-space lighting)
        mat3.normalFromMat4(this.normalMatrix, this.modelViewMatrix)
        gl.uniformMatrix3fv(this.meshUNormalMatrix, false, this.normalMatrix as Float32Array)

        // Material — apply per-material overrides if provided
        const matOverride = mesh.materialOverrides?.[prim.materialIndex]
        const c = matOverride?.color ?? prim.baseColor
        gl.uniform4f(this.meshUBaseColor, c[0], c[1], c[2], c[3])
        gl.uniform1f(this.meshUOpacity, mesh.opacity)
        gl.uniform1f(this.meshURoughness, matOverride?.roughness ?? prim.roughness)
        gl.uniform1f(this.meshUMetallic, matOverride?.metallic ?? prim.metallic)

        if (prim.texture) {
          gl.uniform1i(this.meshUHasTexture, 1)
          gl.bindTexture(gl.TEXTURE_2D, prim.texture)
        } else {
          gl.uniform1i(this.meshUHasTexture, 0)
        }

        // Draw
        gl.bindVertexArray(prim.vao)
        gl.drawElements(gl.TRIANGLES, prim.indexCount, prim.indexType, 0)
        gl.bindVertexArray(null)
      }
    }
  }

  /**
   * Upload a parsed mesh primitive to GPU buffers and create a VAO.
   */
  uploadMesh(parsed: ParsedPrimitive): MeshPrimitiveGPU {
    const gl = this.gl
    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)

    // Position buffer (attribute 0 in mesh shader)
    const aPos = gl.getAttribLocation(this.meshProgram, 'a_position3D')
    const posBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
    gl.bufferData(gl.ARRAY_BUFFER, parsed.positions, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0)

    // Normal buffer (attribute 1)
    const aNorm = gl.getAttribLocation(this.meshProgram, 'a_normal')
    if (parsed.normals && aNorm >= 0) {
      const normBuf = gl.createBuffer()!
      gl.bindBuffer(gl.ARRAY_BUFFER, normBuf)
      gl.bufferData(gl.ARRAY_BUFFER, parsed.normals, gl.STATIC_DRAW)
      gl.enableVertexAttribArray(aNorm)
      gl.vertexAttribPointer(aNorm, 3, gl.FLOAT, false, 0, 0)
    } else if (aNorm >= 0) {
      // No normals — provide a default (0, 1, 0)
      gl.disableVertexAttribArray(aNorm)
      gl.vertexAttrib3f(aNorm, 0, 1, 0)
    }

    // TexCoord buffer (attribute 2)
    const aUv = gl.getAttribLocation(this.meshProgram, 'a_texCoord3D')
    if (parsed.texCoords && aUv >= 0) {
      const uvBuf = gl.createBuffer()!
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
      gl.bufferData(gl.ARRAY_BUFFER, parsed.texCoords, gl.STATIC_DRAW)
      gl.enableVertexAttribArray(aUv)
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0)
    } else if (aUv >= 0) {
      gl.disableVertexAttribArray(aUv)
      gl.vertexAttrib2f(aUv, 0, 0)
    }

    // Index buffer
    const indexBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, parsed.indices, gl.STATIC_DRAW)

    const indexType = parsed.indices instanceof Uint32Array
      ? gl.UNSIGNED_INT
      : gl.UNSIGNED_SHORT

    gl.bindVertexArray(null)

    // Upload texture if present
    let texture: WebGLTexture | null = null
    if (parsed.textureImage) {
      texture = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, parsed.textureImage)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
      parsed.textureImage.close()
    }

    return {
      vao,
      indexCount: parsed.indices.length,
      indexType,
      materialIndex: parsed.materialIndex,
      baseColor: parsed.baseColor,
      roughness: parsed.roughness,
      metallic: parsed.metallic,
      texture,
    }
  }

  /**
   * Delete GPU resources for mesh primitives.
   */
  deleteMesh(primitives: MeshPrimitiveGPU[]): void {
    const gl = this.gl
    for (const prim of primitives) {
      gl.deleteVertexArray(prim.vao)
      if (prim.texture) gl.deleteTexture(prim.texture)
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
