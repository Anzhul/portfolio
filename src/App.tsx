import { BrowserRouter} from 'react-router-dom'
import './App.scss'
import { MenuProvider } from './context/MenuContext'
import { CameraProvider } from './context/CameraContext'
import { WorldProvider } from './context/WorldContext'
import Navigation from './components/UI/navigation/Navigation'
import { World } from './components/world/World'
import { HomeIsland } from './island/home/home'
import { SceneProvider } from './context/SceneContext'
import { CameraViewport } from './components/canvas/CameraViewport'

function App() {
  return (
    <BrowserRouter>
      <MenuProvider>
        <WorldProvider>
          <SceneProvider>
            <CameraProvider>
              {/* Navigation - fixed position, separate from camera transforms */}
              <Navigation />

              {/* Camera viewport wraps world for pan/zoom control */}
              <CameraViewport>
                <div className="app">
                  {/* World with 2D content */}
                  <World dimensions={[10000, 10000]}>
                    {/* Demo content - replace with your islands/sections */}
                    <HomeIsland />
                  </World>
                </div>
              </CameraViewport>
            </CameraProvider>
          </SceneProvider>
        </WorldProvider>
      </MenuProvider>
    </BrowserRouter>
  )
}

export default App 
