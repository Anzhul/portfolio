import { Island } from '../../components/world/Island'
import { IIIFImagePlane } from '../../components/canvas/3DObjects/IIIFImagePlane'
import { useViewport } from '../../context/ViewportContext'
import './in_the_desert.scss'

// Museum-style label positioned to the LEFT of each image (desktop)
// or below each image left-aligned (mobile)
function DesertLabel({ imageX, imageY, mobileX, mobileY, title, desc }: {
  imageX: number; imageY: number; mobileX: number; mobileY: number
  title: string; desc: string
}) {
  const { isMobileOnly } = useViewport()

  const style: React.CSSProperties = isMobileOnly
    ? {
        position: 'absolute',
        left: `${mobileX - 390}px`,
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

// Summary plate positioned at the center of the island
function DesertSummary() {
  const { isMobileOnly } = useViewport()

  const style: React.CSSProperties = isMobileOnly
    ? {
        position: 'absolute',
        left: '-150px',
        top: '-150px',
        width: '300px',
      }
    : {
        position: 'absolute',
        left: '-175px',
        top: '-150px',
        width: '350px',
      }

  return (
    <div className="desert-summary" style={style}>
      <h2 className="desert-summary__title">In the Desert</h2>
      <p className="desert-summary__desc">
        A series of ink illustrations exploring solitude, shelter, and stillness
        in a vast and unforgiving landscape.
      </p>
      <p className="desert-summary__medium">Ink on paper, 2024</p>
    </div>
  )
}

// Desktop: Summary at center, images in a horizontal row to the right (1500px spacing)
// Mobile: Same layout, tighter spacing (880px)

export function InTheDesertIsland() {
  return (
    <Island
      id="in_the_desert"
      position={[8000, 0, 0]}
      name="in the desert"
      boundaries={{
        loadRadius: 12000,
        activeRadius: 9000,
      }}
    >
      <DesertSummary />

      {/* Images in a horizontal row to the right of the summary */}

      {/* #0 - Cloaked figure */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/0/info.json"
        position={[2200, 0, -1]}
        mobilePosition={[1200, 0, -1]}
        width={1200} height={1440}
        mobileWidth={780} mobileHeight={936}
      />
      <DesertLabel
        imageX={2200} imageY={0} mobileX={1200} mobileY={0}
        title="The Wanderer"
        desc="A cloaked figure traverses the vast desert, searching for something only they understand."
      />

      {/* #1 - Couple in desert town */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/1/info.json"
        position={[4400, 0, -1]}
        mobilePosition={[2400, 0, -1]}
        width={1200} height={1440}
        mobileWidth={780} mobileHeight={936}
      />
      <DesertLabel
        imageX={4400} imageY={0} mobileX={2400} mobileY={0}
        title="The Settlement"
        desc="Two figures find shelter in an ancient town, where the walls hold stories of those who came before."
      />

      {/* #2 - Pool scene */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/2/info.json"
        position={[6600, 0, -1]}
        mobilePosition={[3600, 0, -1]}
        width={1200} height={1440}
        mobileWidth={780} mobileHeight={936}
      />
      <DesertLabel
        imageX={6600} imageY={0} mobileX={3600} mobileY={0}
        title="Still Waters"
        desc="A moment of rest by the pool — the only calm in an otherwise relentless landscape."
      />

      {/* #3 - Girl on rooftop */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/3/info.json"
        position={[8800, 0, -1]}
        mobilePosition={[4800, 0, -1]}
        width={1200} height={1440}
        mobileWidth={780} mobileHeight={936}
      />
      <DesertLabel
        imageX={8800} imageY={0} mobileX={4800} mobileY={0}
        title="Above It All"
        desc="Perched on a rooftop at dusk, watching the town below settle into evening."
      />

      {/* #4 - Night scene */}
      <IIIFImagePlane
        infoUrl="/iiif/in_the_desert/4/info.json"
        position={[11000, 0, -1]}
        mobilePosition={[6000, 0, -1]}
        width={1200} height={1440}
        mobileWidth={780} mobileHeight={936}
      />
      <DesertLabel
        imageX={11000} imageY={0} mobileX={6000} mobileY={0}
        title="Desert Night"
        desc="Under a sky full of stars, the desert reveals its quieter side."
      />

    </Island>
  )
}
