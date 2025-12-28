import { Island } from '../../components/world/Island'
import { HomeGreetings } from './section1'
import './home.scss'
import { SectionLoader } from '../../components/loading/SectionLoader'
import { getLazySectionsForIsland } from '../../config/sectionRegistry'
import { ImagePlane } from '../../components/canvas/3DObjects/ImagePlane'

export function HomeIsland() {
  // Get lazy sections for this island
  const lazySections = getLazySectionsForIsland('home')

  return (
    <Island
      id="home"
      position={[0, 0, 0]}
      name="home"
      boundaries={{
        loadRadius: 3000,
        activeRadius: 1600,
      }}
    >
      {/* Moon */}
      <ImagePlane
        position={[0, -1200, -300]}
        mobilePosition={[0, -800, -300]}
        height={350}
        width={350}
        mobileHeight={250}
        mobileWidth={250}
        imageUrl="/moon.png"
        transparent={true}
        opacity={1}
        emmissive={0.5}
        islandId="home"
      />

      <ImagePlane
        position={[-2600, 350, -100]}
        mobilePosition={[0, -800, -300]}
        height={700}
        width={2800}
        mobileHeight={250}
        mobileWidth={250}
        imageUrl="/mountains.png"
        transparent={true}
        opacity={1}
        emmissive={0.5}
        islandId="home"
      />

      {/* Spaceship */}
      <ImagePlane
        position={[-475, 575, 0]}
        mobilePosition={[-500, 500, 0]}
        height={1450}
        width={2900}
        mobileHeight={1000}
        mobileWidth={2000}
        imageUrl="/spaceship.png"
        transparent={true}
        opacity={1}
        emmissive={0.5}
        islandId="home"
      />

      {/* Me */}
      <ImagePlane
        position={[-1080, 400, 40]}
        mobilePosition={[-800, 300, 60]}
        height={360}
        width={180}
        mobileHeight={300}
        mobileWidth={150}
        imageUrl="/me.png"
        transparent={true}
        opacity={1}
        emmissive={0.5}
        islandId="home"
      />

      {/* Tree */}
      <ImagePlane
        position={[-1450, -275, 60]}
        mobilePosition={[-1000, -200, 80]}
        width={2800}
        height={2800}
        mobileWidth={1800}
        mobileHeight={1800}
        imageUrl="/tree.png"
        transparent={true}
        opacity={1}
        emmissive={0.5}
        islandId="home"
      />

      <ImagePlane
        position={[-1650, 760, 200]}
        mobilePosition={[-1000, -200, 80]}
        width={2800}
        height={750}
        mobileWidth={1800}
        mobileHeight={1800}
        imageUrl="/Hill.png"
        transparent={true}
        opacity={1}
        emmissive={0.5}
        islandId="home"
      />

      <HomeGreetings />

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