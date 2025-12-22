import { Island } from '../../components/world/Island'
import { HomeSection1 } from './section1'
import './home.scss'
import { TestCube } from './TestCube'
import { SectionLoader } from '../../components/loading/SectionLoader'
import { getLazySectionsForIsland } from '../../config/sectionRegistry'

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
      <div className="home-content">Home Island Content</div>
      <HomeSection1 />

      {/* Lazy-loaded sections with their own boundaries */}
      {lazySections.map((sectionConfig) => (
        <SectionLoader key={sectionConfig.id} config={sectionConfig} />
      ))}

      {/* Test cube to verify R3F camera sync */}
      <TestCube position={[0, 600, -5]} />
    </Island>
  )
}