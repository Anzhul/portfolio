import React, { lazy } from 'react';
import './Home.scss';
import { Lazy3DObject } from '../../components/lazy/Lazy3DObject';

// Lazy load combined 3D scene with both models
const HomeScene = lazy(() => import('../../components/canvas/home/HomeScene'));

export const Home: React.FC = () => {
  return (
    <div className="home">
      <div className="home-intro">
        <header className="home-header">
          <h1>Hi,</h1>
          <h1>I'm Anzhu—</h1>
          <p className="tagline">An artist who has wandered into development and design.</p>
        </header>

        {/* Combined 3D scene with pen and cap - loads after 1.5 seconds */}
        <Lazy3DObject
          loadStrategy="delayed"
          delay={10}
          component={HomeScene}
          componentProps={{
            penScale: 0.03,
            capScale: 0.03,
            // Positions [x, y, z]
            penPosition: [3.75, 1, 0],    // Pen on the right
            capPosition: [2.75, 2, 0],    // Cap on the left
            // Rotations [x, y, z] in radians
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
