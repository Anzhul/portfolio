import { useRef, useEffect } from 'react'
import { useTicker } from '../../../hooks/useAnimation'
import { compileShader, createProgram, createPerspectiveMatrix, createModelViewMatrix, createNormalMatrix } from './webgl/utils'
import vertexShaderSource from './shaders/vertex.glsl?raw'
import fragmentShaderSource from './shaders/fragment.glsl?raw'
import { loadAllGLTF } from './webgl/gltfLoader'
import './Navigation.scss'

function Vase() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const rotationRef = useRef(0)
  const indexCountRef = useRef(0)
  const indexTypeRef = useRef<number>(WebGLRenderingContext.UNSIGNED_SHORT)

  useEffect(() => {
    let cancelled = false
    let positionBuffer: WebGLBuffer | null = null
    let normalBuffer: WebGLBuffer | null = null
    let indexBuffer: WebGLBuffer | null = null
    let program: WebGLProgram | null = null
    let resizeObserver: ResizeObserver | null = null

    const handleResize = () => {
      const canvas = canvasRef.current
      const gl = glRef.current
      const program = programRef.current
      if (!canvas || !gl || !program) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)

      // Update projection matrix with new aspect ratio
      const aspect = canvas.width / canvas.height
      const projectionMatrix = createPerspectiveMatrix(Math.PI / 64, aspect, 0.1, 10000)
      const projectionMatrixLocation = gl.getUniformLocation(program, 'uProjectionMatrix')
      gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix)
    }

    const initWebGL = async () => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Initialize WebGL context
      const glContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!glContext) {
        console.error('WebGL not supported')
        return
      }
      const gl = glContext as WebGLRenderingContext
      glRef.current = gl

      // Set canvas size
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      //(x, y, width, height)
      gl.viewport(0, 0, canvas.width, canvas.height)

      // Compile shaders
      const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER)
      const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER)

      if (!vertexShader || !fragmentShader) {
        console.error('Failed to compile shaders')
        return
      }

      // Create program
      program = createProgram(gl, vertexShader, fragmentShader)
      if (!program) {
        console.error('Failed to create program')
        return
      }
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)

      // Keep program reference for later use
      programRef.current = program

      // Any subsequent WebGL calls will use this program
      gl.useProgram(program)

      // Load all GLTF geometry with correct orientation
      // The vase was exported from Blender with Z-up orientation
      // Transform it to GLTF Y-up standard and scale appropriately
      let geometry
      try {
        geometry = await loadAllGLTF('/vase.glb', {
          rotationX: Math.PI / 2,  // Z-up (Blender) → Y-up (GLTF)
          scale: 0.01              // Scale down from ~66 units to ~0.66 units
        })
        console.log(geometry);
        
      } catch (error) {
        console.error('Failed to load GLTF:', error)
        return
      }

      // Check if component was unmounted during async operation
      if (cancelled) return

      indexCountRef.current = geometry.indices.length
      indexTypeRef.current = geometry.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT

      // Create and bind position buffer
      positionBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW)

      const positionLocation = gl.getAttribLocation(program, 'aPosition')
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)

      // Create and bind normal buffer
      normalBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, geometry.normals, gl.STATIC_DRAW)

      const normalLocation = gl.getAttribLocation(program, 'aNormal')
      gl.enableVertexAttribArray(normalLocation)
      gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0)

      // Create and bind index buffer
      indexBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW)

      // Set up WebGL state
      gl.enable(gl.DEPTH_TEST)
      gl.disable(gl.CULL_FACE) // Disable culling to see both sides of edges
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.clearColor(0.0, 0.0, 0.0, 0.0)

      // Set projection matrix
      const aspect = canvas.width / canvas.height
      // Reduce FOV to minimize perspective distortion (Math.PI / 4 = 45°, Math.PI / 6 = 30°)
      const projectionMatrix = createPerspectiveMatrix(Math.PI / 64, aspect, 0.1, 10000)
      const projectionMatrixLocation = gl.getUniformLocation(program, 'uProjectionMatrix')
      gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix)

      // Set lighting uniforms
      const lightPositionLocation = gl.getUniformLocation(program, 'uLightPosition')
      const ambientColorLocation = gl.getUniformLocation(program, 'uAmbientColor')
      const diffuseColorLocation = gl.getUniformLocation(program, 'uDiffuseColor')
      const specularColorLocation = gl.getUniformLocation(program, 'uSpecularColor')
      const shininessLocation = gl.getUniformLocation(program, 'uShininess')

      gl.uniform3f(lightPositionLocation, 2, 3, 4)
      gl.uniform3f(ambientColorLocation, 0.2, 0.2, 0.25)
      gl.uniform3f(diffuseColorLocation, 0.6, 0.65, 0.7)
      gl.uniform3f(specularColorLocation, 0.8, 0.85, 0.9)
      gl.uniform1f(shininessLocation, 32.0)

      // Initial render
      render()

      // Set up ResizeObserver
      resizeObserver = new ResizeObserver(() => {
        handleResize()
      })
      resizeObserver.observe(canvas)
    }

    initWebGL()

    // Cleanup function
    return () => {
      cancelled = true
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      const gl = glRef.current
      if (gl) {
        if (positionBuffer) gl.deleteBuffer(positionBuffer)
        if (normalBuffer) gl.deleteBuffer(normalBuffer)
        if (indexBuffer) gl.deleteBuffer(indexBuffer)
        if (program) gl.deleteProgram(program)
      }
    }
  }, [])

  // Render function
  const render = () => {
    const gl = glRef.current
    const program = programRef.current
    if (!gl || !program) return

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    // Update model view matrix with rotation and camera position
    const modelViewMatrix = createModelViewMatrix(
      rotationRef.current,  // Y-axis rotation (animation)
      15,                   // Distance from origin
      0,                    // X-axis rotation
      0,                    // Z-axis rotation
      { x: 0, y: -3.2, z: -120 }  // Camera position (translate camera up by 2 units)
    )
    const normalMatrix = createNormalMatrix(modelViewMatrix)

    const modelViewMatrixLocation = gl.getUniformLocation(program, 'uModelViewMatrix')
    const normalMatrixLocation = gl.getUniformLocation(program, 'uNormalMatrix')

    gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix)
    gl.uniformMatrix4fv(normalMatrixLocation, false, normalMatrix)

    // Draw
    gl.drawElements(gl.TRIANGLES, indexCountRef.current, indexTypeRef.current, 0)
  }

  // Animation loop using ticker
  useTicker((_timestamp, deltaTime) => {
    // Update rotation
    rotationRef.current += deltaTime * 0.0005

    // Render
    render()
  })

  return <canvas ref={canvasRef} className="vase-canvas"></canvas>
}

export default Vase
