import * as THREE from 'three'
import { ticker } from './AnimationTicker'
import type { CameraContextType } from '../context/CameraContext'

/**
 * Centralized manager for updating zoom uniforms on all ImagePlane shader materials.
 * Instead of each ImagePlane registering its own ticker callback (6+ callbacks),
 * this manager uses a single ticker callback to update all planes at once.
 *
 * Performance: Reduces ticker callback count from O(N) to O(1) where N = number of ImagePlanes
 */
class ImagePlaneZoomManager {
  private meshes: Map<string, THREE.Mesh> = new Map()
  private camera: CameraContextType | null = null
  private lastZoom = -1
  private tickerAdded = false

  /**
   * Initialize the manager with camera context
   */
  initialize(camera: CameraContextType) {
    this.camera = camera

    if (!this.tickerAdded) {
      ticker.add(this.updateAllZooms)
      this.tickerAdded = true
    }
  }

  /**
   * Register a mesh to have its zoom uniform updated
   */
  registerMesh(id: string, mesh: THREE.Mesh) {
    this.meshes.set(id, mesh)
  }

  /**
   * Unregister a mesh when component unmounts
   */
  unregisterMesh(id: string) {
    this.meshes.delete(id)
  }

  /**
   * Single ticker callback that updates all registered meshes
   */
  private updateAllZooms = () => {
    if (!this.camera) return

    const currentZoom = this.camera.getState().zoom

    // Only update if zoom actually changed (with small epsilon for floating point)
    if (Math.abs(currentZoom - this.lastZoom) > 0.001) {
      // Update all registered meshes at once
      this.meshes.forEach((mesh) => {
        const material = mesh.material as THREE.ShaderMaterial
        if (material.uniforms && material.uniforms.zoomLevel) {
          material.uniforms.zoomLevel.value = currentZoom
        }
      })

      this.lastZoom = currentZoom
    }
  }

  /**
   * Cleanup - remove ticker callback
   */
  destroy() {
    if (this.tickerAdded) {
      ticker.remove(this.updateAllZooms)
      this.tickerAdded = false
    }
    this.meshes.clear()
    this.camera = null
  }
}

// Export singleton instance
export const imagePlaneZoomManager = new ImagePlaneZoomManager()