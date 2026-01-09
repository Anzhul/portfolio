import React from 'react';
import './Portfolio.scss';
import { usePageTransition } from '../../context/PageTransitionContext';
import { PortfolioCard } from '../../components/portfolio/PortfolioCard';

export const Portfolio: React.FC = () => {
  const { transitionState } = usePageTransition();

  // Example portfolio data - replace with your actual projects
  const portfolioItems = [
    {
      id: 1,
      title: 'Mountain Range Explorer',
      date: 'January 2026',
      tags: ['React', 'Three.js', 'TypeScript'],
      image: '/mountains.png'
    },
    {
      id: 2,
      title: 'Lunar Landscape',
      date: 'December 2025',
      tags: ['WebGL', 'Shaders', 'React'],
      image: '/moon.webp'
    },
    {
      id: 3,
      title: 'Space Navigation',
      date: 'November 2025',
      tags: ['Three.js', 'Animation', 'Canvas'],
      image: '/spaceship.webp'
    },
    {
      id: 4,
      title: 'Natural Environments',
      date: 'October 2025',
      tags: ['3D Modeling', 'React', 'WebGL'],
      image: '/tree.webp'
    },
    {
      id: 5,
      title: 'Hill Visualization',
      date: 'September 2025',
      tags: ['D3.js', 'Canvas', 'TypeScript'],
      image: '/Hill.png'
    },
    {
      id: 6,
      title: 'Terrain Generator',
      date: 'August 2025',
      tags: ['Procedural', 'WebGL', 'Shaders'],
      image: '/Range.png'
    },
  ];

  return (
    <div className={`portfolio-page page-transition ${transitionState === 'exiting' ? 'page-exit' : ''} ${transitionState === 'entering' ? 'page-enter' : ''}`}>
      <header className="portfolio-header">
        <h1>Portfolio</h1>
        <p>A collection of selected works</p>
      </header>

      <main className="portfolio-content">
        <div className="portfolio-grid">
          {portfolioItems.map((item) => (
            <PortfolioCard
              key={item.id}
            >
              {/* Add your own custom div structure here */}
            </PortfolioCard>
          ))}
        </div>
      </main>

      <footer className="portfolio-footer">
        <a href="/">← Back to Home</a>
        <a href="/links">View Links →</a>
      </footer>
    </div>
  );
};
