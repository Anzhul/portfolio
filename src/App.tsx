import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.scss'
import { MenuProvider } from './context/MenuContext'
import Navigation from './components/UI/navigation/Navigation'
import ContentPlate from './components/UI/ContentPlate/ContentPlate'
import Home from './pages/Home/Home'
import About from './pages/About/About'
import Projects from './pages/Projects/Projects'
import Contact from './pages/Contact/Contact'

function App() {
  return (
    <BrowserRouter>
      <MenuProvider>
        <div className="app">
          {/* Navigation menu */}
          <Navigation />

          {/* Content plate wraps all page content */}
          <ContentPlate>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/contact" element={<Contact />} />
            </Routes>
          </ContentPlate>
        </div>
      </MenuProvider>
    </BrowserRouter>
  )
}

export default App
