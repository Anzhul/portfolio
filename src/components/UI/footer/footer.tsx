import React from 'react';
import './footer.scss';

export const Footer: React.FC = () => {

  return (
      <footer className="home-footer">
        <h2>Those who believe in telekinetics, raise my hand.</h2>
        <div className ="footer-about">
        <div className ="footer-canvas">

        </div>
        </div>
        <div className="footer-links">
        <ul>
          <li><a href="https://github.com/anzhul">GitHub</a></li>
          <li><a href="https://instagram.com/anzhul/">Instagram</a></li>
          <li><a href="mailto:anzhul@umich.edu">anzhul@umich.edu</a></li>
        </ul>
        </div>
      </footer>
  );
};