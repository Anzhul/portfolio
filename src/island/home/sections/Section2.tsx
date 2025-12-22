import { Section } from '../../../components/world/Section'

export function HomeSection2() {
  return (
    <Section
      id="home-section2-wrapper"
      islandId="home"
      name="section2"
      position={[1200, 1200, 0]}  // Match position from sectionRegistry
      boundaries={{
        loadRadius: 2000,
        activeRadius: 1000,
      }}
      showBoundaries={true}  // Show visual boundaries
    >
      <div className="home-section2" style={{ padding: '40px' }}>
        <h2>Section 2: Lazy Loaded Content</h2>
        <p>This section is lazy-loaded when you scroll down or get within its boundaries!</p>
        <p>It has its own load and active boundaries, independent of the home island.</p>

        <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px', marginTop: '20px' }}>
          <h3>Features:</h3>
          <ul>
            <li>Independent boundary detection</li>
            <li>Preloads at 2x load radius</li>
            <li>Shows custom skeleton while loading</li>
            <li>Stays mounted after loading</li>
          </ul>
        </div>
      </div>
    </Section>
  )
}
