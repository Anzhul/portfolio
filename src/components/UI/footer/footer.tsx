import React, { useState } from 'react';
import './footer.scss';

export const Footer: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <footer className="footer">
      <h2>Those who believe in telekinetics, raise my hand.</h2>
      
      {/* Temporary counter to test persistence */}
      <div className="footer-counter">
        <button onClick={() => setCount(count - 1)}>-</button>
        <span className="counter-value">{count}</span>
        <button onClick={() => setCount(count + 1)}>+</button>
      </div>

      <div className="footer-about">
        <div className="footer-canvas">
          {/* Space for future content */}
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