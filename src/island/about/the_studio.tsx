import { Island } from '../../components/world/Island'
import { PenIslandObject } from '../../components/canvas/experience/PenIslandObject'

export function TheStudioIsland() {
  return (
    <Island
      id="the_studio"
      position={[4000, 4000, 0]}
      name="the studio"
      boundaries={{
        loadRadius: 3000,
        activeRadius: 1600,
      }}
    >
      <PenIslandObject
        penPosition={[4000, 4100, 50]}
        capPosition={[4000, 3800, 50]}
        penScale={30}
        capScale={30}
        penRotation={[-Math.PI/2, -Math.PI/5, 36]}
        capRotation={[-Math.PI/2, Math.PI/10, 0.5]}
        penMaterialOverrides={[
          {
            materialName: 'Brown',
            color: '#A0624A',
            roughness: 0.3,
            metalness: 0.2,
            flipX: true,
          },
          {
            materialName: 'Brown2',
            color: '#A0624A',
            roughness: 0.3,
            metalness: 0.2,
            flipX: true,
          },
          {
            materialName: 'Yellow',
            color: '#FDBC65',
            roughness: 0.3,
            metalness: 0.2,
          },
          {
            materialName: 'Metal',
            color: '#DCDCDC',
            metalness: 0.8,
            roughness: 0.1,
          }
        ]}
        capMaterialOverrides={[
          {
            materialName: 'Brown.001',
            color: '#A0624A',
            roughness: 0.3,
            metalness: 0.2,
          },
          {
            materialName: 'Default style',
            color: '#DCDCDC',
            metalness: 0.8,
            roughness: 0.1,
          }
        ]}
      />
      <div className="about-content">The Studio Content</div>

    </Island>
  )
}
