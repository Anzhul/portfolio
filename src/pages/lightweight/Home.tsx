import React, { lazy, useRef } from 'react';
import './Home.scss';
import { Lazy3DObject } from '../../components/lazy/Lazy3DObject';
import { usePageTransition } from '../../context/PageTransitionContext';
import { PortfolioCard } from '../../components/portfolio/PortfolioCard';
import { SplitText } from '../../components/UI/SplitText';

// Lazy load combined 3D scene with both models
const HomeScene = lazy(() => import('../../components/canvas/home/HomeScene'));

export const Home: React.FC = () => {
  const { transitionState } = usePageTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Featured projects for home page with grid dimensions
  const featuredProjects = [
    {
      id: 1,
      title: 'Custom IIIF Viewer',
      date: 'January 2026',
      tags: ['React', 'Three.js', 'TypeScript'],
      image: '/Untitled.png',
      gridWidth: 2 as const,
      gridHeight: 2 as const
    },
    {
      id: 3,
      title: 'Lunar Landscape',
      date: 'November 2025',
      tags: ['Three.js', 'Canvas'],
      image: '/moon.webp',
      gridWidth: 1 as const,
      gridHeight: 1 as const
    },
  ];

  return (
    <div
      ref={containerRef}
      className={`home page-transition ${transitionState === 'exiting' ? 'page-exit' : ''} ${transitionState === 'entering' ? 'page-enter' : ''}`}
    >
      <div className="home-intro">
        <header className="home-header">
          <h1>
            <SplitText
              text="Hi,"
              animate={transitionState === 'idle'}
              staggerDelay={0.05}
            />
          </h1>
          <h1>
            <SplitText
              text="I'm Anzhu—"
              animate={transitionState === 'idle'}
              baseDelay={0.2}
              staggerDelay={0.05}
              charConfigs={{
                4: { delay: 0.5, duration: 0.8 }, // 'A'
                5: { delay: 0.55, duration: 0.8 }, // 'n'
                6: { delay: 0.6, duration: 0.8 }, // 'z'
                7: { delay: 0.65, duration: 0.8 }, // 'h'
                8: { delay: 0.7, duration: 0.8 }, // 'u'
              }}
            />
          </h1>
          <p className="tagline">
            <SplitText
              text="An artist currently focused on visualization and design."
              animate={transitionState === 'idle'}
              baseDelay={1.25}
              staggerDelay={0.025}
              baseDuration={0.85}
              splitBy="word"
            />
          </p>
        </header>

        {/* Combined 3D scene with pen and cap - always mounted, transitions between active/inactive */}
        <Lazy3DObject
          loadStrategy="delayed"
          delay={10}
          component={HomeScene}
          componentProps={{
            scrollContainer: containerRef,
            penScale: 0.03,
            capScale: 0.03,
            inkScale: 0.13,
            // Positions [x, y, z]
            penPosition: [4.5, 1, 0],    // Pen on the right
            capPosition: [3.5, 2, 0],    // Cap on the left
            inkPosition: [2, 0.5, 0],      // Ink in the center lower
            // Rotations [x, y, z] in radians
            inkRotation: [Math.PI/2, -4.6, 0],
            penRotation: [-Math.PI/2, Math.PI/10, 36],
            capRotation: [-Math.PI/2, -Math.PI/20, 0.5],
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
            {featuredProjects.map((project) => (
              <PortfolioCard
                key={project.id}
                gridWidth={project.gridWidth}
                gridHeight={project.gridHeight}
              >
                <div className="project-card-content">
                  <div
                    className="project-image"
                    style={{ backgroundImage: `url('/Untitled.png')` }}
                  ></div>
                </div>
              </PortfolioCard>
            ))}
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
