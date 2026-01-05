import { Island } from '../../components/world/Island'

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
      <div className="about-content">The Studio Content</div>

    </Island>
  )
}