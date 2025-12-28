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
import { ImagePlane } from './components/canvas/3DObjects/ImagePlane'
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
                    {/* Background plane 
                    <Plane position={[0, 0, 500]} height={2000} width={2000} emmissive={1.0} color="#ff00ff" />
                    <Plane position={[0, 0, 0]} height={5000} width={5000} emmissive={1.0} color="#00ff00" />
                    */}

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
                    />

                    <ImagePlane
                      position={[-2600, 350, -100]}
                      mobilePosition={[0, -800, -300]}
                      height={600}
                      width={1800}
                      mobileHeight={250}
                      mobileWidth={250}
                      imageUrl="/mountains.png"
                      transparent={true}
                      opacity={1}
                      emmissive={0.5}
                    />

                    {/* Spaceship */}
                    <ImagePlane
                      position={[-575, 575, 0]}
                      mobilePosition={[-500, 500, 0]}
                      height={1450}
                      width={2900}
                      mobileHeight={1000}
                      mobileWidth={2000}
                      imageUrl="/spaceship.png"
                      transparent={true}
                      opacity={1}
                      emmissive={0.5}
                    />

                    {/* Me */}
                    <ImagePlane
                      position={[-1180, 400, 40]}
                      mobilePosition={[-800, 300, 60]}
                      height={360}
                      width={180}
                      mobileHeight={300}
                      mobileWidth={150}
                      imageUrl="/me.png"
                      transparent={true}
                      opacity={1}
                      emmissive={0.5}
                    />

                    {/* Tree */}
                    <ImagePlane
                      position={[-1550, -275, 60]}
                      mobilePosition={[-1000, -200, 80]}
                      width={2800}
                      height={2800}
                      mobileWidth={1800}
                      mobileHeight={1800}
                      imageUrl="/tree.png"
                      transparent={true}
                      opacity={1}
                      emmissive={0.5}
                    />

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
