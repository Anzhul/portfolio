import React, { lazy, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const hoverVideoRef = useRef<HTMLVideoElement>(null);
  const hoverPopupRef = useRef<HTMLDivElement>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const initialPosRef = useRef<{ x: number; y: number } | null>(null);

  const makeVideoHover = useCallback((src: string) => (e: React.MouseEvent) => {
    initialPosRef.current = { x: e.clientX, y: e.clientY };
    setActiveVideo(src);
  }, []);

  // Play video after the portal mounts
  useEffect(() => {
    if (!activeVideo) return;
    const el = hoverPopupRef.current;
    const pos = initialPosRef.current;
    if (el && pos) {
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
    }
    hoverVideoRef.current?.play();
  }, [activeVideo]);

  const handleVideoMove = useCallback((e: React.MouseEvent) => {
    if (hoverPopupRef.current) {
      hoverPopupRef.current.style.left = `${e.clientX}px`;
      hoverPopupRef.current.style.top = `${e.clientY}px`;
    }
  }, []);

  const handleVideoLeave = useCallback(() => {
    setActiveVideo(null);
    hoverVideoRef.current?.pause();
  }, []);

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
              <h1 className="about-intro-name">Hi, I'm Anzhu <span>安竹</span>—</h1>
              <p className="about-p1">I was born in the megacity of <span className="hover-video-trigger" onMouseEnter={makeVideoHover('/chongqing.mp4')} onMouseMove={handleVideoMove} onMouseLeave={handleVideoLeave}>Chongqing</span> and immigrated to <span className="hover-video-trigger" onMouseEnter={makeVideoHover('/abq.mp4')} onMouseMove={handleVideoMove} onMouseLeave={handleVideoLeave}>Albuquerque</span> when I was five. My dad was a graduate student and I spent my childhood growing up in a student family apartment complex west of the Sandia mountains.</p>
              {activeVideo && createPortal(
                <div ref={hoverPopupRef} className="hover-video-popup">
                  <video ref={hoverVideoRef} src={activeVideo} width="325" height="578" muted playsInline loop />
                </div>,
                document.body
              )}
              <p className="about-p2">The formative memories I made there often diffuse into my current work. The quick adaptation of technology I witnessed from other student families is something that I emulate to this day.</p>
            </div>
          </div>
        </div>

        {/* Second section — additional info below the intro */}
        <div className="about-section-2">
          <div className="about-section-2-content">
            <div className="about-section-2-text">
              <h2>Philosophy</h2>
              <p>During my time at the University of Michigan I had the fortune of taking an eclectic set of courses on east asian history and anthropology. These helped further my ability to contextualize the Chinese American experience.</p>
              <br></br>
              <p>From a historical standpoint I'm interested in making connections from Chinese tradition and dynastic periods to what influences have survived and are currently intermixing in the confluence of American culture. I like to combine these explorations with fine art and interactive media.</p>
            </div>
            <div className="about-section-2-image">
              <img src="/placeholder-philosophy.jpg" alt="Philosophy" />
            </div>
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
