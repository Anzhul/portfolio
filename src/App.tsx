import { BrowserRouter} from 'react-router-dom'
import { useRef } from 'react'
import './App.scss'
import { MenuProvider } from './context/MenuContext'
import { CameraProvider } from './context/CameraContext'
import { WorldProvider } from './context/WorldContext'
import { BoundaryProvider } from './context/BoundaryContext'
import Navigation from './components/UI/navigation/Navigation'
import { World } from './components/world/World'
import { SceneProvider } from './context/SceneContext'
import { CameraViewport, type CameraViewportHandle } from './components/canvas/CameraViewport'
import { Plane } from './components/canvas/3DObjects/Plane'
import { IslandLoader } from './components/loading/IslandLoader'
import { ISLAND_REGISTRY } from './config/islandRegistry'
import { RouteSync } from './components/routing/RouteSync'
import { Map } from './components/UI/map/Map'

function App() {
  const cameraViewportRef = useRef<CameraViewportHandle>(null)
  return (
    <BrowserRouter>
      <MenuProvider>
        <WorldProvider>
          <SceneProvider>
            <CameraProvider>
              <BoundaryProvider>
                {/* Route synchronization - updates URL based on viewport position */}
                <RouteSync cameraViewportRef={cameraViewportRef} />

                {/* Navigation - fixed position, separate from camera transforms */}
                <Navigation />

                {/* Map - fixed position navigation to islands */}
                <Map cameraViewportRef={cameraViewportRef} />

                {/* Camera viewport wraps world for pan/zoom control */}
                <CameraViewport ref={cameraViewportRef}>
                  {/* World with 2D content */}
                  <World dimensions={[10000, 10000]}>
                    {/* Background plane */}
                    <Plane position={[0, 0, 500]} height={2000} width={2000} emmissive={1.0} color="#ff00ff" />
                    <Plane position={[0, 0, 0]} height={5000} width={5000} emmissive={1.0} color="#00ff00" />

                    {/* Dynamically loaded islands */}
                    {Object.values(ISLAND_REGISTRY).map((config) => (
                      <IslandLoader key={config.id} config={config} />
                    ))}
                  </World>
                </CameraViewport>
              </BoundaryProvider>
            </CameraProvider>
          </SceneProvider>
        </WorldProvider>
      </MenuProvider>
    </BrowserRouter>
  )
}

export default App 
