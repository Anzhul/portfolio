import React, { useState, useEffect } from 'react';
import './RydmBoat.scss';
import { usePageTransition } from '../../../context/PageTransitionContext';

interface RydmBoatProps {
  isVisible?: boolean;
}

export const RydmBoat: React.FC<RydmBoatProps> = () => {
  const { isActive } = usePageTransition();
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
    <div className={`rydmboat-page ${isActive ? 'active' : ''} ${isPageLoaded ? 'loaded' : ''}`}>
      <div className="rydmboat-image-wrapper">
        <img
          src="/public//rymdboat/rymdboat2.webp"
          alt="Rymdboat concept"
          className="rydmboat-static-image"
        />
      </div>

      <div className="rydmboat-construction-overlay">
        <div className="construction-content">
          <p className="construction-label">Under Construction</p>
          <div className="progress-track">
            <div className="progress-bar" />
          </div>
        </div>
      </div>
    </div>
  );
};
