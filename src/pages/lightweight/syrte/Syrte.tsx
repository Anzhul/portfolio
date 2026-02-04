import React, { lazy } from 'react';
import './Syrte.scss';
import { usePageTransition } from '../../../context/PageTransitionContext';
import { Lazy3DObject } from '../../../components/lazy/Lazy3DObject';

const SyrteScene = lazy(() => import('../../../components/canvas/syrte/SyrteScene'));

export const Syrte: React.FC = () => {
  const { isActive } = usePageTransition();

  return (
    <div className={`syrte-page ${isActive ? 'active' : ''}`}>
      <header className="syrte-header">
        <h1>Syrte</h1>
        <p>Project description</p>
      </header>

      <main className="syrte-content">
        <div className="syrte-gallery">
          <div className="gallery-item">
            <img src="/syrte1.png" alt="Syrte World screenshot 1" />
          </div>
          <div className="gallery-item">
            <img src="/syrte2.png" alt="Syrte World screenshot 2" />
          </div>
          <div className="gallery-item">
            <img src="/syrte3.png" alt="Syrte World screenshot 3" />
          </div>
          <div className="gallery-item">
            <img src="/syrte4.png" alt="Syrte World screenshot 4" />
          </div>
        </div>

        <div className="syrte-canvas-wrapper">
          <Lazy3DObject
            loadStrategy="immediate"
            component={SyrteScene}
            componentProps={{ isVisible: true, colorMapTifPath: '/syrte_color.tif' }}
            className="syrte-scene-container"
            placeholder={null}
            loadingFallback={null}
          />
        </div>
      </main>
    </div>
  );
};
