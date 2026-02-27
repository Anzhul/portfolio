import React from 'react';
import { useLocation } from 'react-router-dom';
import './Footer.scss';
import { projects } from '../../../pages/lightweight/Projects';
import { usePageTransition } from '../../../context/PageTransitionContext';

interface FooterProps {
  showProjects?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ showProjects = false }) => {
  const { triggerTransition } = usePageTransition();
  const location = useLocation();
  const isProjectsPage = location.pathname === '/projects';

  const handleProjectClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    triggerTransition(href);
  };

  return (
    <footer className="footer">
      {showProjects && !isProjectsPage && (
        <div className="footer-projects">
          <div className="footer-projects-grid">
            {projects.map((project) => {
              const isVideo = project.image.endsWith('.webm') || project.image.endsWith('.mp4');
              const isActive = location.pathname === project.href;
              return (
                <a
                  key={project.href}
                  href={project.href}
                  className={`footer-project-card${isActive ? ' active' : ''}`}
                  onClick={(e) => {
                    if (isActive) { e.preventDefault(); return; }
                    handleProjectClick(e, project.href);
                  }}
                >
                  {isVideo ? (
                    <video
                      className="footer-project-video"
                      autoPlay
                      loop
                      muted
                      playsInline
                    >
                      <source src={project.image} type="video/webm" />
                    </video>
                  ) : (
                    <div
                      className="footer-project-image"
                      style={{ backgroundImage: `url('${project.image}')` }}
                    />
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
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
