import * as THREE from 'three'

export interface MaterialOverride {
  materialName: string // Name of the material in the GLB file
  color?: string
  emissive?: string
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
  opacity?: number
  transparent?: boolean
}

/**
 * Apply material overrides to a GLB scene
 * Traverses the scene and applies custom materials based on material names
 *
 * @param scene - The loaded GLB scene
 * @param overrides - Array of material overrides to apply
 */
export function applyMaterialOverrides(
  scene: THREE.Object3D,
  overrides: MaterialOverride[]
): void {
  // Create a map of material overrides for quick lookup
  const overrideMap = new Map(
    overrides.map(override => [override.materialName, override])
  )

  scene.traverse((child: any) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh

      if (mesh.material && !Array.isArray(mesh.material)) {
        const materialName = mesh.material.name
        const override = overrideMap.get(materialName)

        if (override) {
          // Apply material override
          const newMaterial = new THREE.MeshStandardMaterial({
            // Start with existing material properties if it's a standard material
            ...(mesh.material.type === 'MeshStandardMaterial' && {
              color: (mesh.material as THREE.MeshStandardMaterial).color,
              roughness: (mesh.material as THREE.MeshStandardMaterial).roughness,
              metalness: (mesh.material as THREE.MeshStandardMaterial).metalness,
              map: (mesh.material as THREE.MeshStandardMaterial).map,
            }),
            // Apply overrides
            ...(override.color && { color: new THREE.Color(override.color) }),
            ...(override.emissive && { emissive: new THREE.Color(override.emissive) }),
            ...(override.emissiveIntensity !== undefined && { emissiveIntensity: override.emissiveIntensity }),
            ...(override.roughness !== undefined && { roughness: override.roughness }),
            ...(override.metalness !== undefined && { metalness: override.metalness }),
            ...(override.opacity !== undefined && { opacity: override.opacity }),
            ...(override.transparent !== undefined && { transparent: override.transparent }),
          })
          mesh.material = newMaterial
        } else if (mesh.material.type === 'MeshBasicMaterial') {
          // Convert basic materials to standard for lighting compatibility
          const oldMaterial = mesh.material as THREE.MeshBasicMaterial
          mesh.material = new THREE.MeshStandardMaterial({
            color: oldMaterial.color,
            map: oldMaterial.map,
            transparent: oldMaterial.transparent,
            opacity: oldMaterial.opacity,
          })
        }
      }
    }
  })
}
