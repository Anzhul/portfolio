import React from 'react';
import './RydmBoat.scss';
import { usePageTransition } from '../../../context/PageTransitionContext';

export const RydmBoat: React.FC = () => {
  const { isActive } = usePageTransition();

  return (
    <div className={`rydmboat-page ${isActive ? 'active' : ''}`}>
      <header className="rydmboat-header">
        <h1>RydmBoat</h1>
        <p>Project description</p>
      </header>

      <main className="rydmboat-content">
        <div className="rydmboat-details">
        </div>
      </main>
    </div>
  );
};