import React from 'react';
import './IIIFViewer.scss';
import { usePageTransition } from '../../../context/PageTransitionContext';

export const IIIFViewer: React.FC = () => {
  const { isActive } = usePageTransition();

  return (
    <div className={`iiifviewer-page ${isActive ? 'active' : ''}`}>
      <header className="iiifviewer-header">
        <h1>IIIF Viewer</h1>
        <p>Project description</p>
      </header>

      <main className="iiifviewer-content">
        <div className="iiifviewer-details">
        </div>
      </main>
    </div>
  );
};
