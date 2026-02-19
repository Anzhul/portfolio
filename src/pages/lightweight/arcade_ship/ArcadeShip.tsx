import React from 'react';
import './ArcadeShip.scss';
import { usePageTransition } from '../../../context/PageTransitionContext';

export const ArcadeShip: React.FC = () => {
  const { isActive } = usePageTransition();

  return (
    <div className={`arcadeship-page ${isActive ? 'active' : ''}`}>
      <header className="arcadeship-header">
        <h1>Arcade Ship–</h1>
        <p>Exploring the control mechanisms of a retro-inspired spaceship game.</p>
      </header>

      <main className="arcadeship-content">
        <div className="arcadeship-details">
          <h2>Background</h2>
          <p>
            The Arcade Ship project is a personal exploration into the mechanics of a retro-inspired spaceship game. The game features a simple control scheme, where players navigate a spaceship through a series of obstacles and challenges. The design of the game is heavily influenced by classic arcade games, with pixel art graphics and a chiptune soundtrack.
          </p>
          <h2>Development</h2>
          <p>
            The development of the Arcade Ship game involved several stages, including concept development, prototyping, and testing. The initial concept was to create a game that captures the essence of classic arcade games while incorporating modern gameplay mechanics. 
            <br></br>
            <br></br>
            The prototyping phase involved creating a basic version of the game using simple shapes and placeholder graphics. This allowed for rapid iteration and testing of the core gameplay mechanics. Once the basic mechanics were solidified, I moved on to creating the final pixel art graphics and implementing the chiptune soundtrack.
          </p>
        </div>
      </main>
    </div>
  );
};
