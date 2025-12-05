import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.scss'
import Navigation from './components/UI/Navigation'
import Home from './pages/Home/Home'
import About from './pages/About/About'
import Projects from './pages/Projects/Projects'
import Contact from './pages/Contact/Contact'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        {/* Navigation menu */}
        <Navigation />

        {/* Routes - content changes based on URL */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
