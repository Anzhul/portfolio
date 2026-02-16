import React, { useState, useEffect } from 'react';
import { FooterCanvas } from './FooterCanvas';
import './footer.scss';

export const Footer: React.FC = () => {
  const [gameReady, setGameReady] = useState(false);

  // Defer the heavy canvas game until after window.load
  useEffect(() => {
    const show = () => setGameReady(true);
    if (document.readyState === 'complete') {
      show();
    } else {
      window.addEventListener('load', show);
      return () => window.removeEventListener('load', show);
    }
  }, []);

  return (
    <footer className="footer">
      <h2>Here we are, trapped in the amber of the moment.</h2>

      <div className="footer-about">
        <div className="footer-canvas">
          {gameReady && <FooterCanvas />}
        </div>
      </div>
      <div className="footer-links">
        <ul>
          <li><a href="https://github.com/anzhul" target="_blank" rel="noopener noreferrer">GitHub</a></li>
          <li><a href="https://instagram.com/anzhul/" target="_blank" rel="noopener noreferrer">Instagram</a></li>
          <li><a href="mailto:anzhul@umich.edu">anzhul@umich.edu</a></li>
        </ul>
      </div>
    </footer>
  );
};