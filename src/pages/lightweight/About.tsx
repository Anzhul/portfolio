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

// Video sources for hover triggers — kept persistently mounted so they only load once
const HOVER_VIDEOS = ['/chongqing.mp4', '/abq.mp4', '/annarbor.mp4'];

// Scroll captions — fixed text that fades in/out around each camera keyframe.
// Centers align with camera keyframe progress values (progress 0→1 maps to canvas section scroll).
const SCROLL_CAPTIONS = [
  { text: 'Games can tell intricate and complex stories.', center: 0.22, half: 0.065 },
  { text: 'Places, ideas, and cultures can be captured indirectly.', center: 0.35, half: 0.065 },
  { text: 'Traditional forms provide a foundation for digital innovation.', center: 0.55, half: 0.065 },
  { text: 'Each discipline informs the others.', center: 0.75, half: 0.065 },
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
  const videoRefsMap = useRef<Map<string, HTMLVideoElement>>(new Map());
  const hoverPopupRef = useRef<HTMLDivElement>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const initialPosRef = useRef<{ x: number; y: number } | null>(null);

  const triggerRefs = useRef<Set<HTMLElement>>(new Set());

  const makeVideoHover = useCallback((src: string) => (e: React.MouseEvent) => {
    initialPosRef.current = { x: e.clientX, y: e.clientY };
    setActiveVideo(src);
  }, []);

  // Position popup and play when activeVideo changes
  useEffect(() => {
    if (!activeVideo) return;
    const el = hoverPopupRef.current;
    const pos = initialPosRef.current;
    if (el && pos) {
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
    }
    videoRefsMap.current.get(activeVideo)?.play();
  }, [activeVideo]);

  const handleVideoMove = useCallback((e: React.MouseEvent) => {
    if (hoverPopupRef.current) {
      hoverPopupRef.current.style.left = `${e.clientX}px`;
      hoverPopupRef.current.style.top = `${e.clientY}px`;
    }
  }, []);

  const handleVideoLeave = useCallback(() => {
    setActiveVideo(null);
    videoRefsMap.current.forEach(video => video.pause());
  }, []);

  // Touch: tap trigger to show, tap anywhere else to dismiss
  const handleTriggerTouch = useCallback((src: string) => (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    initialPosRef.current = { x: touch.clientX, y: touch.clientY };
    setActiveVideo(prev => prev === src ? null : src);
  }, []);

  useEffect(() => {
    if (!activeVideo) return;
    const dismiss = (e: TouchEvent) => {
      for (const el of triggerRefs.current) {
        if (el.contains(e.target as Node)) return;
      }
      setActiveVideo(null);
      videoRefsMap.current.forEach(video => video.pause());
    };
    document.addEventListener('touchstart', dismiss, { passive: true });
    return () => document.removeEventListener('touchstart', dismiss);
  }, [activeVideo]);

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
        <div className="about-section-1">
          <div className="about-intro">
            <div className="about-portrait">
              <img src="about/anzhu.jpg" alt="Anzhu Ling" />
            </div>
            <div className="about-intro-text">
              <h1 className="about-intro-name">Hi, I'm Anzhu <span>安竹</span>—</h1>
              <p className="about-p1">I was born in <span className="hover-video-trigger" ref={el => { if (el) triggerRefs.current.add(el); }} onMouseEnter={makeVideoHover('/chongqing.mp4')} onMouseMove={handleVideoMove} onMouseLeave={handleVideoLeave} onTouchStart={handleTriggerTouch('/chongqing.mp4')}>Chongqing</span> and immigrated to <span className="hover-video-trigger" ref={el => { if (el) triggerRefs.current.add(el); }} onMouseEnter={makeVideoHover('/abq.mp4')} onMouseMove={handleVideoMove} onMouseLeave={handleVideoLeave} onTouchStart={handleTriggerTouch('/abq.mp4')}>Albuquerque</span> when I was five. My dad was a graduate student and I grew up in a student family apartment complex before moving to <span className="hover-video-trigger" ref={el => { if (el) triggerRefs.current.add(el); }} onMouseEnter={makeVideoHover('/annarbor.mp4')} onMouseMove={handleVideoMove} onMouseLeave={handleVideoLeave} onTouchStart={handleTriggerTouch('/annarbor.mp4')}>Ann Arbor</span>.</p>
              {createPortal(
                <div
                  ref={hoverPopupRef}
                  className="hover-video-popup"
                  style={{ display: activeVideo ? '' : 'none' }}
                >
                  {HOVER_VIDEOS.map(src => (
                    <video
                      key={src}
                      ref={el => { if (el) videoRefsMap.current.set(src, el); }}
                      src={src}
                      width="325"
                      height="578"
                      muted
                      playsInline
                      loop
                      preload="auto"
                      style={{ display: activeVideo === src ? 'block' : 'none' }}
                    />
                  ))}
                </div>,
                document.body
              )}
              <p className="about-p2">The formative memories of my childhood as a Chinese American immigrant often diffuse into my work. My current focus is on MCP server development, 3D graphics, and interactive media. Reach me at <a href="mailto:anzhul@umich.edu" style={{ fontWeight: '500', color: '#1a87be', textDecoration: 'none' }}>anzhul@umich.edu</a></p>
            </div>
          </div>
        </div>

        {/* Methods section — holistic approach */}
        <div className="about-methods">
          <h2>Methods</h2>
          <div className="about-methods-columns">
            <p>During my time at the University of Michigan I had the fortune of taking courses on computer science, east asian history and anthropology. My focus as an artist is to contextualize the Chinese American experience by drawing connections between these respective areas and visual art.</p>
            <p>I consider my approach to art and technology as largely pragmatic: no medium is holier than another— expression comes in many different forms. A fine oil painting, videogame and generative art installation can be equal and effective methods to tell a story depending on the situation.</p>
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

        {/* Influences section — below the 3D canvas */}
        <div className="about-influences">
          <h2>Currently on my mind</h2>
          <div className="influences-columns">
            <div className="influences-text">
              <p>I've been thinking a lot about the intersection of technology and storytelling— how interactive media can preserve cultural narratives that might otherwise be lost. The tools we build shape the stories we tell, and the stories we tell shape the tools we build.</p>
              <p>I'm also exploring how generative systems and traditional craftsmanship can complement each other, rather than compete. There's something powerful about using computational methods to extend, rather than replace, human expression.</p>
            </div>
            <div className="influences-playlist">
              <iframe
                src="https://open.spotify.com/embed/playlist/2xzvs8f2yRzaE6K8XoHAf4?utm_source=generator&theme=0"
                width="100%"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify playlist"
              />
            </div>
          </div>
        </div>
      </div>
    </ScrollProvider>
  );
};
