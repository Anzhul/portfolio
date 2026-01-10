import React from 'react';
import './Projects.scss';
import { usePageTransition } from '../../context/PageTransitionContext';

export const Projects: React.FC = () => {
  const { isActive } = usePageTransition();

  return (
    <div className={`projects ${isActive ? 'active' : ''}`}>
      <header className="projects-header">
        <h1>Projects</h1>
        <p>A collection of my work and experiments</p>
      </header>

      <main className="projects-content">
        <div className="projects-grid">
        </div>
      </main>
    </div>
  );
};
