import { useWorld } from '../../context/WorldContext'
import { useCamera } from '../../context/CameraContext'

/**
 * EXAMPLE 1: Island Navigator
 * Shows all islands and lets user switch between them
 */
export function IslandNavigator() {
  const { islands, activeIslandId, setActiveIslandId } = useWorld()

  return (
    <nav>
      <h2>Navigate Islands</h2>
      {islands.map(island => (
        <button
          key={island.id}
          onClick={() => setActiveIslandId(island.id)}
          style={{
            backgroundColor: island.color,
            fontWeight: activeIslandId === island.id ? 'bold' : 'normal'
          }}
        >
          {island.name}
        </button>
      ))}
    </nav>
  )
}

/**
 * EXAMPLE 2: Section List
 * Shows all sections for the current island
 */
export function CurrentIslandSections() {
  const {
    activeIslandId,
    getSectionsByIsland,
    activeSectionId,
    setActiveSectionId
  } = useWorld()

  if (!activeIslandId) return <div>No island selected</div>

  const sections = getSectionsByIsland(activeIslandId)

  return (
    <div>
      <h3>Sections on this island:</h3>
      <ul>
        {sections.map(section => (
          <li
            key={section.id}
            onClick={() => setActiveSectionId(section.id)}
            style={{ fontWeight: activeSectionId === section.id ? 'bold' : 'normal' }}
          >
            {section.name} - {section.route}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * EXAMPLE 3: World Info Display
 * Shows current world state (read-only)
 */
export function WorldDebugInfo() {
  const {
    islands,
    activeIslandId,
    sections,
    activeSectionId,
    worldRotation,
    isDragging,
    getIslandById,
    getSectionById
  } = useWorld()

  const activeIsland = activeIslandId ? getIslandById(activeIslandId) : null
  const activeSection = activeSectionId ? getSectionById(activeSectionId) : null

  return (
    <div style={{ padding: '10px', background: '#f0f0f0' }}>
      <h3>World State</h3>
      <p>Total Islands: {islands.length}</p>
      <p>Total Sections: {sections.length}</p>
      <p>Active Island: {activeIsland?.name || 'None'}</p>
      <p>Active Section: {activeSection?.name || 'None'}</p>
      <p>World Rotation: [{worldRotation.join(', ')}]</p>
      <p>Is Dragging: {isDragging ? 'Yes' : 'No'}</p>
    </div>
  )
}

/**
 * EXAMPLE 4: Draggable World Controller
 * Controls world rotation and drag state
 */
export function WorldController() {
  const { worldRotation, setWorldRotation, isDragging, setIsDragging } = useWorld()

  const rotateWorld = (axis: 'x' | 'y' | 'z', amount: number) => {
    const newRotation: [number, number, number] = [...worldRotation]
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
    newRotation[axisIndex] += amount
    setWorldRotation(newRotation)
  }

  return (
    <div>
      <h3>World Controls</h3>
      <div>
        <button onClick={() => rotateWorld('x', 0.1)}>Rotate X+</button>
        <button onClick={() => rotateWorld('y', 0.1)}>Rotate Y+</button>
        <button onClick={() => rotateWorld('z', 0.1)}>Rotate Z+</button>
      </div>
      <div>
        <button onClick={() => setWorldRotation([0, 0, 0])}>Reset Rotation</button>
      </div>
      <div>
        <label>
          <input
            type="checkbox"
            checked={isDragging}
            onChange={(e) => setIsDragging(e.target.checked)}
          />
          Dragging Mode
        </label>
      </div>
      <p>Current: [{worldRotation[0].toFixed(2)}, {worldRotation[1].toFixed(2)}, {worldRotation[2].toFixed(2)}]</p>
    </div>
  )
}

/**
 * EXAMPLE 5: Combined World + Camera
 * Uses both WorldContext and CameraContext together
 */
export function IslandCamera() {
  const { activeIslandId, getIslandById } = useWorld()
  const { cameraPosition, setCameraPosition } = useCamera()

  const activeIsland = activeIslandId ? getIslandById(activeIslandId) : null

  const moveCameraToIsland = () => {
    if (activeIsland) {
      // Move camera to look at the active island
      const [x, y, z] = activeIsland.position
      setCameraPosition([x, y + 2, z + 5])  // Position camera above and in front
    }
  }

  return (
    <div>
      <h3>Camera Control</h3>
      {activeIsland && (
        <>
          <p>Active Island: {activeIsland.name}</p>
          <p>Island Position: [{activeIsland.position.join(', ')}]</p>
          <button onClick={moveCameraToIsland}>
            Move Camera to {activeIsland.name}
          </button>
        </>
      )}
      <p>Camera Position: [{cameraPosition.join(', ')}]</p>
    </div>
  )
}

/**
 * HOW TO USE THESE EXAMPLES:
 *
 * 1. Import the component you want:
 *    import { IslandNavigator } from './components/examples/WorldContextExamples'
 *
 * 2. Use it anywhere inside the providers:
 *    <IslandNavigator />
 *
 * 3. Mix and match - you can use multiple at once:
 *    <IslandNavigator />
 *    <CurrentIslandSections />
 *    <WorldDebugInfo />
 */