import React, { lazy } from 'react';
import './Home.scss';
import { Lazy3DObject } from '../../components/lazy/Lazy3DObject';
import { usePageTransition } from '../../context/PageTransitionContext';

// Lazy load combined 3D scene with both models
const HomeScene = lazy(() => import('../../components/canvas/home/HomeScene'));

export const Home: React.FC = () => {
  const { transitionState } = usePageTransition();

  return (
    <div className={`home page-transition ${transitionState === 'exiting' ? 'page-exit' : ''} ${transitionState === 'entering' ? 'page-enter' : ''}`}>
      <div className="home-intro">
        <header className="home-header">
          <h1>Hi,</h1>
          <h1>I'm Anzhu—</h1>
          <p className="tagline">An artist who has wandered into development and design.</p>
        </header>

        {/* Combined 3D scene with pen and cap - always mounted, transitions between active/inactive */}
        <Lazy3DObject
          loadStrategy="delayed"
          delay={10}
          component={HomeScene}
          componentProps={{
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
          <div className = "project-list">
          </div>
        </div>

        <div className="home-philosophy">
          <h2>Core Beliefs</h2>
        </div>
      </main>


      <footer className="home-footer">
      </footer>
    </div>
  );
};
