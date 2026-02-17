import React, { lazy, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import './Home.scss';
import { Lazy3DObject } from '../../components/lazy/Lazy3DObject';
import { usePageTransition } from '../../context/PageTransitionContext';
import { useViewport } from '../../context/ViewportContext';

// Lazy load combined 3D scene with TV + game
const HomeScene = lazy(() => import('../../components/canvas/home/HomeScene'));

interface HomeProps {
  isVisible?: boolean;
}

export const Home: React.FC<HomeProps> = ({ isVisible = true }) => {
  const { isActive, triggerTransition } = usePageTransition();
  const { breakpoint } = useViewport();
  const internalRef = useRef<HTMLDivElement>(null);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  const handleProjectClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    triggerTransition(path);
  };

  // Breakpoint-specific TV position and scale
  const { tvPosition, tvScale, platePosition, plateScale, vasePosition, vaseScale } = useMemo(() => {
    switch (breakpoint) {
      case 'mobile':
        return {
          tvPosition: [0.5, -0.8, 0] as [number, number, number],
          tvScale: 0.04,
          platePosition: [-0.5, -1.1, 0.2] as [number, number, number],
          plateScale: 0.5,
          vasePosition: [-0.5, -0.8, -0.2] as [number, number, number],
          vaseScale: 0.4,
        };
      case 'tablet':
        return {
          tvPosition: [1.75, -0.8, 0] as [number, number, number],
          tvScale: 0.05,
          platePosition: [0.5, -1.1, 0.2] as [number, number, number],
          plateScale: 0.6,
          vasePosition: [0.5, -0.8, -0.2] as [number, number, number],
          vaseScale: 0.5,
        };
      case 'desktop':
        return {
          tvPosition: [2.0, -0.8, 0] as [number, number, number],
          tvScale: 0.06,
          platePosition: [0.8, -1.1, 0.2] as [number, number, number],
          plateScale: 0.7,
          vasePosition: [0.8, -0.8, -0.2] as [number, number, number],
          vaseScale: 0.6,
        };
      case 'wide':
      default:
        return {
          tvPosition: [1.5, -1.0, 0] as [number, number, number],
          tvScale: 0.045,
          platePosition: [4.8, -1.0, 0.2] as [number, number, number],
          plateScale: 0.0125,
          vasePosition: [4, -1.06, -6] as [number, number, number],
          vaseScale: 0.2,
        };
    }
  }, [breakpoint]);

  // Disable scroll until 3D models are ready (with timeout fallback)
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    // Fallback: show page after 5s even if 3D scene hasn't loaded
    const fallbackTimer = setTimeout(() => {
      if (!isPageLoaded) {
        setIsPageLoaded(true);
        document.body.style.overflow = '';
      }
    }, 5000);

    return () => {
      clearTimeout(fallbackTimer);
      document.body.style.overflow = '';
    };
  }, []);

  const handleSceneReady = useCallback(() => {
    setIsPageLoaded(true);
    document.body.style.overflow = '';
  }, []);


  return (
    <div
      ref={internalRef}
      className={`home ${isActive ? 'active' : ''} ${isPageLoaded ? 'loaded' : ''}`}
    >
      {/* Canvas with TV + game */}
      <Lazy3DObject
        loadStrategy="immediate"
        component={HomeScene}
        componentProps={{
          isVisible,
          scrollContainer: internalRef,
          onReady: handleSceneReady,
          tvScale,
          tvPosition,
          plateScale,
          platePosition,
          vaseScale,
          vasePosition,
        }}
        className="home-scene-container"
        placeholder={null}
        loadingFallback={null}
      />

      <div className="home-intro">
        <header className="home-header">
          <div className="home-intro-content">
            <h1>Hi,</h1>
            <h1>I'm <span>Anzhu</span>—</h1>
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
                style={{ backgroundImage: `url('/syrte/syrte1.png')` }}
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
