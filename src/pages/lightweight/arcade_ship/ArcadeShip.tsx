import React from 'react';
import './ArcadeShip.scss';
import { usePageTransition } from '../../../context/PageTransitionContext';

export const ArcadeShip: React.FC = () => {
  const { isActive } = usePageTransition();

  return (
    <div className={`arcadeship-page ${isActive ? 'active' : ''}`}>
      <header className="arcadeship-header">
        <h1>Arcade Ship</h1>
        <p>Project description</p>
      </header>

      <main className="arcadeship-content">
        <div className="arcadeship-details">
        </div>
      </main>
    </div>
  );
};
