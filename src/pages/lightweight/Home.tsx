import React from 'react';
import './Home.scss';

export const Home: React.FC = () => {
  return (
    <div className="home">
      <div className="home-intro">
        <header className="home-header">
          <h1>Hi,</h1>
          <h1>I'm Anzhu Ling—</h1>
          <p className="tagline">An artist who has wandered into development and design.</p>
        </header>
      </div>

      <main className="home-content">
        <div className="home-projects">

        </div>
        <div className="home-philosophy">
        </div>
      </main>


      <footer className="home-footer">
      </footer>
    </div>
  );
};
