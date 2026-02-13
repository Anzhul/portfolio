import React, { lazy, useRef, useState, useEffect } from 'react';
import './RydmBoat.scss';
import { usePageTransition } from '../../../context/PageTransitionContext';
import { ScrollProvider } from '../../../context/ScrollContext';
import { Lazy3DObject } from '../../../components/lazy/Lazy3DObject';

// Lazy load the 3D scene
const RydmBoatScene = lazy(() => import('../../../components/canvas/rydmboat/RydmBoatScene'));

interface RydmBoatProps {
  isVisible?: boolean;
}

export const RydmBoat: React.FC<RydmBoatProps> = ({ isVisible = true }) => {
  const { isActive } = usePageTransition();
  const internalRef = useRef<HTMLDivElement>(null);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  useEffect(() => {
    const handleLoad = () => {
      setTimeout(() => setIsPageLoaded(true), 100);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  return (
    <ScrollProvider>
      <div
        ref={internalRef}
        className={`rydmboat-page ${isActive ? 'active' : ''} ${isPageLoaded ? 'loaded' : ''}`}
      >
        {/* Fixed 3D Scene - stays in viewport while content scrolls */}
        <div className="rydmboat-scene-wrapper">
          <Lazy3DObject
            loadStrategy="immediate"
            component={RydmBoatScene}
            componentProps={{
              isVisible,
              scrollContainer: internalRef.current,
              // Add your boat model here when available:
              // modelPath: '/boat.glb',
              modelScale: 1.2,
            }}
            className="rydmboat-scene-container"
            placeholder={null}
            loadingFallback={null}
          />
        </div>

        {/* Scrollable Content */}
        <div className="rydmboat-scroll-content">
          {/* Section 1: Hero */}
          <section className="rydmboat-section rydmboat-hero">
            <div className="section-content">
              <h1>Rymdboat</h1>
              <p className="tagline">A journey through space and time</p>
              <div className="scroll-hint">
                <span>Scroll to explore</span>
                <div className="scroll-arrow"></div>
              </div>
            </div>
          </section>

          {/* Section 2: About */}
          <section className="rydmboat-section rydmboat-about">
            <div className="section-content">
              <h2>About the Project</h2>
              <p>
                Rymdboat is an exploration of 3D web experiences, combining
                scroll-driven animations with interactive storytelling.
              </p>
              <p>
                As you scroll, the boat rotates and transforms, demonstrating
                how scroll position can drive complex 3D animations without
                relying on heavy animation libraries.
              </p>
            </div>
          </section>

          {/* Section 3: Technical */}
          <section className="rydmboat-section rydmboat-technical">
            <div className="section-content">
              <h2>Technical Details</h2>
              <div className="tech-grid">
                <div className="tech-item">
                  <h3>Scroll Tracking</h3>
                  <p>Custom ScrollContext with smoothed progress (0-1)</p>
                </div>
                <div className="tech-item">
                  <h3>Animation</h3>
                  <p>Frame-based updates via AnimationTicker</p>
                </div>
                <div className="tech-item">
                  <h3>Triggers</h3>
                  <p>GSAP-like timeline phases with callbacks</p>
                </div>
                <div className="tech-item">
                  <h3>Performance</h3>
                  <p>Ref-based state to avoid React re-renders</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Features */}
          <section className="rydmboat-section rydmboat-features">
            <div className="section-content">
              <h2>Animation Phases</h2>
              <div className="phase-list">
                <div className="phase">
                  <span className="phase-range">0% - 30%</span>
                  <span className="phase-desc">Boat rotates into view, tilts forward</span>
                </div>
                <div className="phase">
                  <span className="phase-range">30% - 70%</span>
                  <span className="phase-desc">Floating motion, comes closer to camera</span>
                </div>
                <div className="phase">
                  <span className="phase-range">70% - 100%</span>
                  <span className="phase-desc">Tilts back, continues rotation</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Footer */}
          <section className="rydmboat-section rydmboat-end">
            <div className="section-content">
              <h2>The End</h2>
              <p>Thanks for scrolling through this demo.</p>
            </div>
          </section>
        </div>
      </div>
    </ScrollProvider>
  );
};
