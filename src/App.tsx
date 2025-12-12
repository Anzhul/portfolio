import { BrowserRouter} from 'react-router-dom'
import './App.scss'
import { MenuProvider } from './context/MenuContext'
import { CameraProvider } from './context/CameraContext'
import { WorldProvider } from './context/WorldContext'
import Navigation from './components/UI/navigation/Navigation'

function App() {
  return (
    <BrowserRouter>
      <MenuProvider>
        <WorldProvider>
          <CameraProvider>
            <div className="app">
              {/* Navigation menu */}
              <Navigation />

              {/* Content plate wraps all page content */}
            </div>
          </CameraProvider>
        </WorldProvider>
      </MenuProvider>
    </BrowserRouter>
  )
}

export default App
