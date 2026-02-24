import { Island } from '../../components/world/Island'
import { IIIFImagePlane } from '../../components/canvas/3DObjects/IIIFImagePlane'

export function InTheDesertIsland() {
  return (
    <Island
      id="in_the_desert"
      position={[8000, 0, 0]}
      name="in the desert"
      boundaries={{
        loadRadius: 3000,
        activeRadius: 1600,
      }}
    >
      {/* #0 - Cloaked figure in desert */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/0/info.json"
        position={[-1800, -400, -100]}
        mobilePosition={[-800, -300, -100]}
        height={1600}
        width={1360}
        mobileHeight={1100}
        mobileWidth={940}
      />

      {/* #1 - Couple in desert town */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/1/info.json"
        position={[-600, 200, -50]}
        mobilePosition={[-300, 100, -50]}
        height={1600}
        width={1400}
        mobileHeight={1100}
        mobileWidth={960}
      />

      {/* #2 - Pool scene */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/2/info.json"
        position={[600, -600, -80]}
        mobilePosition={[300, -400, -80]}
        height={1700}
        width={1400}
        mobileHeight={1160}
        mobileWidth={960}
      />

      {/* #3 - Girl sitting on rooftop */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/3/info.json"
        position={[1800, -200, -60]}
        mobilePosition={[800, -100, -60]}
        height={1640}
        width={1360}
        mobileHeight={1120}
        mobileWidth={940}
      />

      {/* #4 - Night scene with figures */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/4/info.json"
        position={[3000, 300, -40]}
        mobilePosition={[1200, 200, -40]}
        height={1700}
        width={1500}
        mobileHeight={1160}
        mobileWidth={1020}
      />
    </Island>
  )
}
