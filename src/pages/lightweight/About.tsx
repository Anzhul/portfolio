import React, { lazy, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import './About.scss';
import { Lazy3DObject } from '../../components/lazy/Lazy3DObject';
import { usePageTransition } from '../../context/PageTransitionContext';
import { useViewport } from '../../context/ViewportContext';
import { ScrollProvider, useScroll } from '../../context/ScrollContext';
import { ticker } from '../../utils/AnimationTicker';

// Lazy load combined 3D scene with TV + game
const HomeScene = lazy(() => import('../../components/canvas/home/HomeScene'));

// Scroll captions — fixed text that fades in/out around each camera keyframe.
// Centers align with camera keyframe progress values (progress 0→1 maps to canvas section scroll).
const SCROLL_CAPTIONS = [
  { text: 'I was born in Chonqing, China and grew up in Albuquerque.', center: 0.15, half: 0.065 },
  { text: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', center: 0.30, half: 0.065 },
  { text: 'Duis aute irure dolor in reprehenderit in voluptate velit esse.', center: 0.55, half: 0.065 },
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
        >
          <p>{caption.text}</p>
        </div>
      ))}
    </div>
  );
}

interface AboutProps {
  isVisible?: boolean;
}

export const About: React.FC<AboutProps> = ({ isVisible = true }) => {
  const { isActive } = usePageTransition();
  const { breakpoint } = useViewport();
  const internalRef = useRef<HTMLDivElement>(null);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  // Breakpoint-specific TV position and scale
  const { tvPosition, tvScale, vasePosition, vaseScale } = useMemo(() => {
    switch (breakpoint) {
      case 'mobile':
        return {
          tvPosition: [-5, -0, -17] as [number, number, number],
          tvScale: 0.07,
          vasePosition: [5, -1.5, -8] as [number, number, number],
          vaseScale: 0.35,
        };
      case 'tablet':
        return {
          tvPosition: [-5, -0, -17] as [number, number, number],
          tvScale: 0.07,
          vasePosition: [5, -1.5, -8] as [number, number, number],
          vaseScale: 0.35,
        };
      case 'desktop':
        return {
          tvPosition: [-5, -0, -17] as [number, number, number],
          tvScale: 0.07,
          vasePosition: [5, -1.5, -8] as [number, number, number],
          vaseScale: 0.35,
        };
      case 'wide':
      default:
        return {
          tvPosition: [-5, -0, -17] as [number, number, number],
          tvScale: 0.07,
          vasePosition: [6, -1.5, -8] as [number, number, number],
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
        className={`about ${isActive ? 'active' : ''} ${isPageLoaded ? 'loaded' : ''}`}
      >
        {/* Top section — scrolls normally above the 3D canvas */}
        <div className="about-top">
          <div className="about-intro">
            <div className="about-portrait">
              <img src="/placeholder-portrait.jpg" alt="Anzhu Ling" />
            </div>
            <div className="about-intro-text">
              <h1>Hi, I'm Anzhu 安竹<span style={{ color: '#222222', fontSize: '2.2rem', fontFamily: 'source-han-sans-cjk-sc, sans-serif', fontWeight: '500', fontStyle: 'normal', display: 'none'}}>安竹</span>—</h1>
              <p>I was born in the megacity of Chongqing and immigrated to Albuquerque when I was five. My dad was a graduate student and I spent my childhood growing up in a student family apartment complex west of the Sandia mountains.</p>
              <br></br>
              <p>Those formative memories of catching lizards in the shrubland and playing sci-fi video games with my friends constantly diffuse into my personal work and interests. It's also the foundation for my curiosity in art, history, and technology.</p>
            </div>
          </div>
        </div>

        {/* Second section — additional info below the intro */}
        <div className="about-section-2">
          <div className="about-section-2-content">
            <h2>Philosophy</h2>
            <p>After attending the University of Michigan my interest has been in the intersection of art and technology, particularly in creating interactive experiences that blend digital and physical spaces.</p>
          </div>
        </div>

        {/* Canvas section — sticky during the camera tour scroll */}
        <div className="about-canvas-section">
          <div className="about-canvas-sticky">
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
              className="about-scene-container"
              placeholder={null}
              loadingFallback={null}
            />
            <ScrollCaptions />
          </div>
          {/* Scroll spacer — creates scroll distance for camera tour */}
          <div className="about-scroll-spacer" />
        </div>

        {/* Bottom section — scrolls normally below the 3D canvas */}
        <div className="about-bottom">
          <div className="about-bottom-content">
            <h2>Contact</h2>
            <p>I was born in Chongqing, China and grew up in Albuquerque, New Mexico. I'm an artist and developer interested in interactive media, 3D graphics, and creative technology.</p>
            <ul className="about-links">
              <li><a href="mailto:anzhul@umich.edu">anzhul@umich.edu</a></li>
              <li><a href="https://github.com/anzhul" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li><a href="https://instagram.com/anzhul/" target="_blank" rel="noopener noreferrer">Instagram</a></li>
            </ul>
          </div>
        </div>
      </div>
    </ScrollProvider>
  );
};
