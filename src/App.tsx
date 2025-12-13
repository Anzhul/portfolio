import { BrowserRouter} from 'react-router-dom'
import './App.scss'
import { MenuProvider } from './context/MenuContext'
import { CameraProvider } from './context/CameraContext'
import { WorldProvider } from './context/WorldContext'
import Navigation from './components/UI/navigation/Navigation'
import { World } from './components/world/World'
import { HomeIsland } from './island/home/home'

function App() {
  return (
    <BrowserRouter>
      <MenuProvider>
        <WorldProvider>
          <CameraProvider>
            <div className="app">
              {/* Navigation menu */}
              <Navigation />

              {/* World canvas with zoom and pan */}
              <World dimensions={[10000, 10000]}>
                {/* Demo content - replace with your islands/sections */}
                <HomeIsland />
              </World>
            </div>
          </CameraProvider>
        </WorldProvider>
      </MenuProvider>
    </BrowserRouter>
  )
}

export default App
