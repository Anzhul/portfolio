import React, { lazy, useRef, useState, useEffect, useMemo } from 'react';
import './Home.scss';
import { Lazy3DObject } from '../../components/lazy/Lazy3DObject';
import { usePageTransition } from '../../context/PageTransitionContext';
import { useViewport } from '../../context/ViewportContext';

// Lazy load combined 3D scene with both models
const HomeScene = lazy(() => import('../../components/canvas/home/HomeScene'));

interface HomeProps {
  isVisible?: boolean;
}

export const Home: React.FC<HomeProps> = ({ isVisible = true }) => {
  const { isActive, triggerTransition } = usePageTransition();
  const { breakpoint } = useViewport();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  const handleProjectClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    triggerTransition(path);
  };

  // Breakpoint-specific pen/cap positions and rotations
  const { penPosition, capPosition, penRotation, capRotation, penScale, capScale } = useMemo(() => {
    switch (breakpoint) {
      case 'mobile':
        return {
          penPosition: [0, 1.0, 0] as [number, number, number],
          capPosition: [0, 2.5, 0] as [number, number, number],
          penRotation: [-Math.PI/2, -Math.PI/5, 36] as [number, number, number],
          capRotation: [-Math.PI/2, Math.PI/10, 0.5] as [number, number, number],
          penScale: 0.025,
          capScale: 0.025,
        };
      case 'tablet':
        return {
          penPosition: [0, 1.0, 0] as [number, number, number],
          capPosition: [0, 2.5, 0] as [number, number, number],
          penRotation: [-Math.PI/2, -Math.PI/5, 36] as [number, number, number],
          capRotation: [-Math.PI/2, Math.PI/10, 0.5] as [number, number, number],
          penScale: 0.025,
          capScale: 0.025,
        };
      case 'desktop': // 1024–1439px
        return {
          penPosition: [0, 1.0, 0] as [number, number, number],
          capPosition: [0, 2.5, 0] as [number, number, number],
          penRotation: [-Math.PI/2, -Math.PI/5, 36] as [number, number, number],
          capRotation: [-Math.PI/2, Math.PI/10, 0.5] as [number, number, number],
          penScale: 0.025,
          capScale: 0.025,
        };
      case 'wide': // 1440px+
      default:
        return {
          penPosition: [-0.25, 0.75, 0] as [number, number, number],
          capPosition: [-0.25, 2.0, 0] as [number, number, number],
          penRotation: [-Math.PI/2, -Math.PI/5, 36] as [number, number, number],
          capRotation: [-Math.PI/2, Math.PI/10, 0.5] as [number, number, number],
          penScale: 0.025,
          capScale: 0.025,
        };
    }
  }, [breakpoint]);

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
      {/* Full-screen canvas with pen and cap */}
      <Lazy3DObject
        loadStrategy="immediate"
        component={HomeScene}
        componentProps={{
          isVisible,
          scrollContainer: containerRef,
          penScale,
          capScale,
          penPosition,
          capPosition,
          penRotation,
          capRotation,
          penMaterialOverrides: [
            {
              materialName: 'Brown',
              color: '#A0624A',
              roughness: 0.3,
              metalness: 0.2,
              //map: '/pen_text.png',
              flipX: true,
            },
            {
              materialName: 'Brown2',
              color: '#A0624A',
              roughness: 0.3,
              metalness: 0.2,
              //map: '/pen_text.png',
              flipX: true,
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
          ]
        }}
        className="home-scene-container"
        placeholder={null}
        loadingFallback={null}
      />

      <div className="home-intro">
        <header className="home-header">
          <div className="home-intro-content">
            <h1>Hi,</h1>
            <h1>I'm Anzhu—</h1>
            <p className="tagline">An artist currently entangled with design and development.</p>
            <br></br>
          </div>
        </header>
      </div>

      <main className="home-content">
        <div className="home-projects">
          <h2>Projects</h2>
          <div className="project-list">

            <a href="/iiifviewer" onClick={(e) => handleProjectClick(e, '/iiifviewer')} className="project-card project-card-1">
              <div className="project-info project-info-1">
                <h3 className="project-title">Juniper</h3>
                <p className="project-date">January 2026</p>
              </div>
              <div
                className="project-image project-image-1"
                style={{ backgroundImage: `url('/Untitled.png')` }}
              ></div>
            </a>

            <a href="/rydmboat" onClick={(e) => handleProjectClick(e, '/rydmboat')} className="project-card project-card-2">
              <div className="project-info project-info-2">
                <h3 className="project-title">Rymdboat</h3>
                <p className="project-date">November 2025</p>
              </div>
              <div
                className="project-image"
                style={{ backgroundImage: `url('/spaceship2.png')` }}
              ></div>
            </a>

            <a href="/syrte" onClick={(e) => handleProjectClick(e, '/syrte')} className="project-card project-card-3">
              <div className="project-info project-info-3">
                <h3 className="project-title">Syrte World</h3>
                <p className="project-date">November 2025</p>
              </div>
              <div
                className="project-image"
                style={{ backgroundImage: `url('/syrte1.png')` }}
              ></div>
            </a>
            <a href="/arcade_ship" onClick={(e) => handleProjectClick(e, '/arcade_ship')} className="project-card project-card-4">
              <div className="project-info project-info-4">
                <h3 className="project-title">Arcade Ship</h3>
                <p className="project-date">November 2025</p>
              </div>
              <video
                className="project-video"
                autoPlay
                loop
                muted
                playsInline
              >
                <source src="/arcade.webm" type="video/webm" />
              </video>
            </a>
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
    </div>
    
  );
};
