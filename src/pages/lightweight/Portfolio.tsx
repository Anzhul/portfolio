import React from 'react';
import './Portfolio.scss';
import { usePageTransition } from '../../context/PageTransitionContext';

export const Portfolio: React.FC = () => {
  const { isActive } = usePageTransition();

  return (
    <div className={`portfolio-page ${isActive ? 'active' : ''}`}>
      <header className="portfolio-header">
        <h1>Portfolio</h1>
        <p>A collection of selected works</p>
      </header>


      <footer className="portfolio-footer">
        <a href="/">← Back to Home</a>
        <a href="/links">View Links →</a>
      </footer>
    </div>
  );
};
