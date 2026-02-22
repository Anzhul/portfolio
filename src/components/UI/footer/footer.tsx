import React from 'react';
import './Footer.scss';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <h2>Here we are, trapped in the amber of the moment.</h2>
      <img
        className="footer-painting"
        src="/Dream of Butterflies.png"
        alt="Dream of Butterflies"
      />
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
