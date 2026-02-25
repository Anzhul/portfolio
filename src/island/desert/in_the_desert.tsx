import { Island } from '../../components/world/Island'
import { IIIFImagePlane } from '../../components/canvas/3DObjects/IIIFImagePlane'
import { ModelObject } from '../../components/canvas/3DObjects/ModelObject'
import { useViewport } from '../../context/ViewportContext'
import './in_the_desert.scss'

// Museum-style label positioned to the LEFT of each image (desktop)
// or below each image left-aligned (mobile)
function DesertLabel({ imageX, imageY, mobileY, title, desc }: {
  imageX: number; imageY: number; mobileY: number
  title: string; desc: string
}) {
  const { isMobileOnly } = useViewport()

  const style: React.CSSProperties = isMobileOnly
    ? {
        position: 'absolute',
        left: '-390px',
        top: `${mobileY + 498}px`,
        width: '250px',
      }
    : {
        position: 'absolute',
        left: `${imageX - 640}px`,
        top: `${imageY + 720}px`,
        transform: 'translate(-100%, -100%)',
        width: '250px',
      }

  return (
    <div className="desert-label" style={style}>
      <h3 className="desert-label__title">{title}</h3>
      <p className="desert-label__desc">{desc}</p>
    </div>
  )
}

// Desktop: 1800px center-to-center spacing, 1200×1440 images, labels to the left
// Mobile: 780x936 images stacked vertically, labels below

export function InTheDesertIsland() {
  return (
    <Island
      id="in_the_desert"
      position={[8000, 0, 0]}
      name="in the desert"
      boundaries={{
        loadRadius: 5000,
        activeRadius: 3400,
      }}
    >
      {/* Row 1: Three images */}

      {/* #0 - Cloaked figure */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/0/info.json"
        position={[-1800, -900, -1]}
        mobilePosition={[0, -2640, -1]}
        width={1200} height={1440}
        mobileWidth={780} mobileHeight={936}
      />
      <DesertLabel
        imageX={-1800} imageY={-900} mobileY={-2640}
        title="The Wanderer"
        desc="A cloaked figure traverses the vast desert, searching for something only they understand."
      />

      {/* #1 - Couple in desert town */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/1/info.json"
        position={[0, -900, -1]}
        mobilePosition={[0, -1560, -1]}
        width={1200} height={1440}
        mobileWidth={780} mobileHeight={936}
      />
      <DesertLabel
        imageX={0} imageY={-900} mobileY={-1560}
        title="The Settlement"
        desc="Two figures find shelter in an ancient town, where the walls hold stories of those who came before."
      />

      {/* #2 - Pool scene */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/2/info.json"
        position={[1800, -900, -1]}
        mobilePosition={[0, -480, -1]}
        width={1200} height={1440}
        mobileWidth={780} mobileHeight={936}
      />
      <DesertLabel
        imageX={1800} imageY={-900} mobileY={-480}
        title="Still Waters"
        desc="A moment of rest by the pool — the only calm in an otherwise relentless landscape."
      />

      {/* Row 2: Two images */}

      {/* #3 - Girl on rooftop */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/3/info.json"
        position={[-900, 840, -1]}
        mobilePosition={[0, 600, -1]}
        width={1200} height={1440}
        mobileWidth={780} mobileHeight={936}
      />
      <DesertLabel
        imageX={-900} imageY={840} mobileY={600}
        title="Above It All"
        desc="Perched on a rooftop at dusk, watching the town below settle into evening."
      />

      {/* #4 - Night scene */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/4/info.json"
        position={[900, 840, -1]}
        mobilePosition={[0, 1680, -1]}
        width={1200} height={1440}
        mobileWidth={780} mobileHeight={936}
      />
      <DesertLabel
        imageX={900} imageY={840} mobileY={1680}
        title="Desert Night"
        desc="Under a sky full of stars, the desert reveals its quieter side."
      />

      {/* Pen used to draw the series */}
      <ModelObject
        src="/pen.glb"
        position={[2280, 1800, 0]}
        mobilePosition={[0, 2880, 0]}
        scale={10}
        mobileScale={20}
        rotation={[-1.5708, 0, 0]}
        materials={{
          0: { color: [0.4, 0.2, 0.1, 1], roughness: 0.7 },
          1: { color: [0.36, 0.22, 0.17, 1], roughness: 0.65 },
          2: { color: [0.05, 0.05, 0.05, 1], roughness: 0.3 },
          3: { color: [0.75, 0.75, 0.75, 1], roughness: 0.1, metallic: 0.9 },
          4: { color: [0.90, 0.65, 0.35, 1], roughness: 0.35 },
          5: { color: [0.7, 0.12, 0.08, 1], roughness: 0.45 },
        }}
      />
    </Island>
  )
}
