import { Island } from '../../components/world/Island'

export function AboutIsland() {
  return (
    <Island
      id="about"
      position={[4000, 4000, 0]}
      name="about"
      boundaries={{
        loadRadius: 3000,
        activeRadius: 1600,
      }}
    >
      <div className="about-content">About Island Content</div>

    </Island>
  )
}