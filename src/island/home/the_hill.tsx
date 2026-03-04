import { Island } from '../../components/world/Island'
// import { HomeGreetings } from './section1'
import './the_hill.scss'
import { SectionLoader } from '../../components/loading/SectionLoader'
import { getLazySectionsForIsland } from '../../config/sectionRegistry'
import { ImagePlane } from '../../components/canvas/3DObjects/ImagePlane'

export function TheHillIsland() {
  // Get lazy sections for this island
  const lazySections = getLazySectionsForIsland('the_hill')

  return (
    <Island
      id="the_hill"
      position={[0, 0, 0]}
      name="the hill"
      boundaries={{
        loadRadius: 3000,
        activeRadius: 1600,
      }}
    >
      {/* Moon */}
      <ImagePlane
        position={[450, -1350, -800]}
        mobilePosition={[300, -1000, -500]}
        height={350}
        width={350}
        mobileHeight={250}
        mobileWidth={250}
        imageUrl="/moon.png"
        transparent={true}
        opacity={1}
        emmissive={0.5}
        islandId="the_hill"
      />

      <ImagePlane
        position={[1700, 950, -300]}
        mobilePosition={[800, 500, -200]}
        height={400}
        width={1600}
        mobileHeight={250}
        mobileWidth={1000}
        imageUrl="/Range.png"
        transparent={true}
        opacity={1}
        emmissive={0.5}
        islandId="the_hill"
      />

      <ImagePlane
        position={[-2500, 350, -200]}
        mobilePosition={[-1200, 250, -150]}
        height={750}
        width={3000}
        mobileHeight={500}
        mobileWidth={2000}
        imageUrl="/mountains.png"
        transparent={true}
        opacity={1}
        emmissive={0.5}
        islandId="the_hill"
      />

      {/* Spaceship */}
      <ImagePlane
        position={[25, 625, 0]}
        mobilePosition={[60, 440, -50]}
        height={1450}
        width={2900}
        mobileHeight={900}
        mobileWidth={1800}
        imageUrl="/spaceship.png"
        transparent={true}
        opacity={1}
        emmissive={0.5}
        islandId="the_hill"
      />

      {/* Me */}
      <ImagePlane
        position={[-580, 450, 40]}
        mobilePosition={[-100, 360, 60]}
        height={360}
        width={180}
        mobileHeight={200}
        mobileWidth={100}
        imageUrl="/me.png"
        transparent={true}
        opacity={1}
        emmissive={0.5}
        islandId="the_hill"
      />

      {/* Tree */}
      <ImagePlane
        position={[-950, -225, 50]}
        mobilePosition={[-400, -100, 100]}
        width={2800}
        height={2800}
        mobileWidth={1800}
        mobileHeight={1800}
        imageUrl="/tree.png"
        transparent={true}
        opacity={1}
        emmissive={0.5}
        islandId="the_hill"
      />

      <ImagePlane
        position={[-1150, 1000, 300]}
        mobilePosition={[-200, 800, 350]}
        width={3200}
        height={1600}
        mobileWidth={2200}
        mobileHeight={1100}
        imageUrl="/Hill.png"
        transparent={true}
        opacity={1}
        emmissive={0.5}
        islandId="the_hill"
      />

{/*}
      <HomeGreetings />
*/}
      {/* Lazy-loaded sections with their own boundaries */}
      {lazySections.map((sectionConfig) => (
        <SectionLoader key={sectionConfig.id} config={sectionConfig} />
      ))}

      {/* Test cube to verify R3F camera sync
      <TestCube position={[0, 600, 300]} />
      */}
    </Island>
  )
}