import React from 'react';
import './Home.scss';
import { usePageTransition } from '../../context/PageTransitionContext';
import { projects } from './Projects';

interface HomeProps {
  isVisible?: boolean;
}

export const Home: React.FC<HomeProps> = () => {
  const { isActive, triggerTransition } = usePageTransition();

  const handleClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    triggerTransition(href);
  };

  return (
    <div className={`home ${isActive ? 'active' : ''}`}>
      <main className="home-content">
        <div className="home-grid">
          {projects.map((project) => {
            const isVideo = project.image.endsWith('.webm') || project.image.endsWith('.mp4');
            return (
              <a
                key={project.href}
                href={project.href}
                className="home-grid-item"
                onClick={(e) => handleClick(e, project.href)}
              >
                {isVideo ? (
                  <video
                    className="home-grid-video"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source src={project.image} type="video/webm" />
                  </video>
                ) : (
                  <div
                    className="home-grid-image"
                    style={{ backgroundImage: `url('${project.image}')` }}
                  />
                )}
              </a>
            );
          })}
        </div>
      </main>
    </div>
  );
};
