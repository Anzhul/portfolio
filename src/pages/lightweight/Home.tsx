import React, { lazy, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import './Home.scss';
import { Lazy3DObject } from '../../components/lazy/Lazy3DObject';
import { usePageTransition } from '../../context/PageTransitionContext';
import { useViewport } from '../../context/ViewportContext';
import { ScrollProvider, useScroll } from '../../context/ScrollContext';
import { ticker } from '../../utils/AnimationTicker';

// Lazy load combined 3D scene with TV + game
const HomeScene = lazy(() => import('../../components/canvas/home/HomeScene'));

// Scroll captions — fixed text that fades in/out around each camera keyframe.
// Centers are in scroll-progress space: cameraProgress * 0.75 (camera uses first 75% of scroll).
const SCROLL_CAPTIONS = [
  { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', center: 0.1875, half: 0.065 },
  { text: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', center: 0.375, half: 0.065 },
  { text: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.', center: 0.525, half: 0.065 },
  { text: 'Duis aute irure dolor in reprehenderit in voluptate velit esse.', center: 0.6375, half: 0.065 },
  { text: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa.', center: 0.75, half: 0.065 },
];
const CAPTION_FADE = 0.02;

function ScrollCaptions() {
  const scroll = useScroll();
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const update = () => {
      const { smoothProgress } = scroll.getState();

      for (let i = 0; i < SCROLL_CAPTIONS.length; i++) {
        const el = refs.current[i];
        if (!el) continue;

        const { center, half } = SCROLL_CAPTIONS[i];
        const start = center - half;
        const end = center + half;

        let opacity = 0;
        if (smoothProgress >= start && smoothProgress <= end) {
          const fadeInEnd = start + CAPTION_FADE;
          const fadeOutStart = end - CAPTION_FADE;

          if (smoothProgress < fadeInEnd) {
            opacity = (smoothProgress - start) / CAPTION_FADE;
          } else if (smoothProgress > fadeOutStart) {
            opacity = (end - smoothProgress) / CAPTION_FADE;
          } else {
            opacity = 1;
          }
        }

        el.style.opacity = String(Math.max(0, Math.min(1, opacity)));
      }
    };

    ticker.add(update);
    return () => ticker.remove(update);
  }, [scroll]);

  return (
    <div className="scroll-captions">
      {SCROLL_CAPTIONS.map((caption, i) => (
        <div
          key={i}
          ref={el => { refs.current[i] = el; }}
          className="scroll-caption"
          style={{ opacity: 0 }}
        >
          <p>{caption.text}</p>
        </div>
      ))}
    </div>
  );
}

interface HomeProps {
  isVisible?: boolean;
}

export const Home: React.FC<HomeProps> = ({ isVisible = true }) => {
  const { isActive } = usePageTransition();
  const { breakpoint } = useViewport();
  const internalRef = useRef<HTMLDivElement>(null);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  // Breakpoint-specific TV position and scale
  const { tvPosition, tvScale, vasePosition, vaseScale } = useMemo(() => {
    switch (breakpoint) {
      case 'mobile':
        return {
          tvPosition: [0, -0.35, 0] as [number, number, number],
          tvScale: 0.01,
          vasePosition: [-0.5, -0.8, -0.2] as [number, number, number],
          vaseScale: 0.0,
        };
      case 'tablet':
        return {
          tvPosition: [0, -3.5, -17] as [number, number, number],
          tvScale: 0.1,
          vasePosition: [3, -3.75, -14] as [number, number, number],
          vaseScale: 0,
        };
      case 'desktop':
        return {
          tvPosition: [-5.5, -3.5, -17] as [number, number, number],
          tvScale: 0.073,
          vasePosition: [4.5, -3.75, -14] as [number, number, number],
          vaseScale: 0.4,
        };
      case 'wide':
      default:
        return {
          tvPosition: [-5, -0, -17] as [number, number, number],
          tvScale: 0.07,
          vasePosition: [5, -1.5, -8] as [number, number, number],
          vaseScale: 0.35,
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
    <ScrollProvider>
      <div
        ref={internalRef}
        className={`home ${isActive ? 'active' : ''} ${isPageLoaded ? 'loaded' : ''}`}
      >
        {/* Fixed captions — fade in/out at each camera keyframe */}
        <ScrollCaptions />

        {/* Fixed canvas layer — stays in place while content scrolls over it */}
        <div className="home-canvas-fixed">
          <Lazy3DObject
            loadStrategy="immediate"
            component={HomeScene}
            componentProps={{
              isVisible,
              scrollContainer: internalRef,
              onReady: handleSceneReady,
              tvScale,
              tvPosition,
              vaseScale,
              vasePosition,
            }}
            className="home-scene-container"
            placeholder={null}
            loadingFallback={null}
          />
        </div>

        {/* Scrollable content */}
        <div className="home-intro">
          <header className="home-header">
            <div className="home-intro-text">
              <h1>Hi, I'm Anzhu<span style={{ color: '#222222', fontSize: '2.2rem', fontFamily: 'source-han-sans-cjk-sc, sans-serif', fontWeight: '500', fontStyle: 'normal', display: 'none'}}>安竹</span>— an artist & developer</h1>
            </div>
          </header>
        </div>

        {/* Scroll spacer — creates scroll distance for camera tour */}
        <div className="home-scroll-spacer" />

        {/* Extra scroll room — canvas scrolls up after keyframes finish */}
        <div className="home-scroll-out" />
      </div>
    </ScrollProvider>
  );
};
