import React, { lazy, useRef, useState, useEffect } from 'react';
import './Home.scss';
import { Lazy3DObject } from '../../components/lazy/Lazy3DObject';
import { usePageTransition } from '../../context/PageTransitionContext';

// Lazy load combined 3D scene with both models
const HomeScene = lazy(() => import('../../components/canvas/home/HomeScene'));

export const Home: React.FC = () => {
  const { isActive } = usePageTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  useEffect(() => {
    // Wait for all resources to load
    const handleLoad = () => {
      // Small delay to ensure header is visible first
      setTimeout(() => {
        setIsPageLoaded(true);
      }, 100);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);


  return (
    <div
      ref={containerRef}
      className={`home ${isActive ? 'active' : ''} ${isPageLoaded ? 'loaded' : ''}`}
    >
      <div className="home-intro">
        <header className="home-header">
          <h1>Hi,</h1>
          <h1>I'm Anzhu—</h1>
          <p className="tagline">An artist currently focused on visualization and design.</p>
          <br></br>
        </header>

        {/* Combined 3D scene with pen and cap */}
        <Lazy3DObject
          loadStrategy="immediate"
          component={HomeScene}
          componentProps={{
            scrollContainer: containerRef,
            penScale: 0.032,
            capScale: 0.032,
            inkScale: 0.12,
            // Positions [x, y, z]
            penPosition: [0.5, 1.3, 0],    // Pen on the right
            capPosition: [-0.25, 2.55, 0],    // Cap on the left
            inkPosition: [1.5, 0.5, 0],      // Ink in the center lower
            // Rotations [x, y, z] in radians
            inkRotation: [Math.PI/2, -4.6, 0],
            penRotation: [-Math.PI/2, Math.PI/10, 36],
            capRotation: [-Math.PI/2, -Math.PI/10, 0.5],
            penMaterialOverrides: [
              {
                materialName: 'Brown',
                color: '#A0624A',
                roughness: 0.3,
                metalness: 0.2,
              },
              {
                materialName: 'Yellow',
                color: '#FDBC65',
                roughness: 0.3,
                metalness: 0.2,
              },
              {
                materialName: 'Metal',
                color: '#DCDCDC',
                metalness: 0.8,
                roughness: 0.1,
              }
            ],
            capMaterialOverrides: [
              {
                materialName: 'Brown.001',
                color: '#A0624A',
                roughness: 0.3,
                metalness: 0.2,
              },
              {
                materialName: 'Default style',
                color: '#DCDCDC',
                metalness: 0.8,
                roughness: 0.1,
              }
            ],
            inkMaterialOverrides: [
              {
                materialName: 'Sticker',  // Use the exact material name from your ink.glb
                map: '/ink_Sticker.png',
                emissiveMap: '/ink_Sticker.png',
                emissive: '#ffffff',
                emissiveIntensity: 0,
                flipX: true,  // Flip horizontally
                // Optional: adjust texture repeat/offset if needed
                // mapRepeat: [1, 1],
                // mapOffset: [0, 0],
              },
              {
                materialName: 'Default style',
                color: '#DCDCDC',
                metalness: 0.8,
                roughness: 0.1,
              }
            ]
          }}
          className="home-scene-container"
          placeholder={null}
          loadingFallback={null}
        />
      </div>

      <main className="home-content">
        <div className="home-projects">
          <h2>Projects</h2>
          <div className="project-list">

            <div className="project-card project-card-1">
              <div className="project-info project-info-1">
                <h3 className="project-title">IIIFViewer</h3>
                <p className="project-date">January 2026</p>
              </div>
              <div
                className="project-image project-image-1"
                style={{ backgroundImage: `url('/Untitled.png')` }}
              ></div>
            </div>

            <div className="project-card project-card-3">
              <div className="project-info project-info-3">
                <h3 className="project-title">Rymdboat</h3>
                <p className="project-date">November 2025</p>
              </div>
              <div
                className="project-image"
                style={{ backgroundImage: `url('/spaceship2.png')` }}
              ></div>
            </div>

            <div className="project-card project-card-2">
              <div className="project-info project-info-2">
                <h3 className="project-title">New Project</h3>
                <p className="project-date">January 2026</p>
              </div>
              <div
                className="project-image"
                style={{ backgroundImage: `url('/placeholder.png')` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="home-philosophy">
          <h2>Core Beliefs</h2>
          <h3>Simplicity</h3>
          <p>Less is more– the competition between empty space and encroaching information defines ninety percent of a composition. I make personal art on the assumption the viewer is inherently inquisitive, but design with retrograde intuition.</p>
          <h3>Performance</h3>
          <p>Good design is clear design. Every element must have a purpose, and that purpose must be immediately obvious to the viewer. If something needs explanation, it has failed in its function.</p>
          <h3>Identity</h3>
          <p>Design is a conversation between creator and user. Understanding the needs, desires, and limitations of the audience is crucial to crafting meaningful experiences that resonate on a personal level.</p>
        </div>
      </main>


      <footer className="home-footer">
        <h2>Those who believe in telekinetics, raise my hand.</h2>
        <div className ="footer-about">
        <div className ="footer-canvas">

        </div>
        </div>
        <div className="footer-links">
        <ul>
          <li><a href="https://github.com/anzhul">GitHub</a></li>
          <li><a href="https://instagram.com/anzhul/">Instagram</a></li>
          <li><a href="mailto:anzhul@umich.edu">anzhul@umich.edu</a></li>
        </ul>
        </div>
      </footer>
    </div>
  );
};
