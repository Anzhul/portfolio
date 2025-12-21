import { BrowserRouter} from 'react-router-dom'
import './App.scss'
import { MenuProvider } from './context/MenuContext'
import { CameraProvider } from './context/CameraContext'
import { WorldProvider } from './context/WorldContext'
import { BoundaryProvider } from './context/BoundaryContext'
import Navigation from './components/UI/navigation/Navigation'
import { World } from './components/world/World'
import { HomeIsland } from './island/home/home'
import { SceneProvider } from './context/SceneContext'
import { CameraViewport } from './components/canvas/CameraViewport'
import {Plane} from './components/canvas/3DObjects/Plane'

function App() {
  return (
    <BrowserRouter>
      <MenuProvider>
        <WorldProvider>
          <SceneProvider>
            <CameraProvider>
              <BoundaryProvider>
                {/* Navigation - fixed position, separate from camera transforms */}
                <Navigation />

                {/* Camera viewport wraps world for pan/zoom control */}
                <CameraViewport>
                    {/* World with 2D content */}
                    <World dimensions={[10000, 10000]}>
                      {/* Demo content - replace with your islands/sections */}
                      <Plane position={[0, 0, 0]} height={10000} width={10000} emmissive={1.0} color="#ffffff" />
                      <HomeIsland />
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
