import React from 'react';
import './Projects.scss';
import { usePageTransition } from '../../context/PageTransitionContext';

interface ProjectCardProps {
  href: string;
  image: string;
  tags: string[];
  date: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ href, image, tags, date }) => {
  const { triggerTransition } = usePageTransition();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerTransition(href);
  };

  return (
    <a href={href} onClick={handleClick} className="project-card">
      <div className="project-card-image" style={{ backgroundImage: `url('${image}')` }}></div>
      <div className="project-card-info">
        <div className="project-tags">
          {tags.map((tag, index) => (
            <span key={tag} className="project-tag">{tag}{index < tags.length - 1 && ','}</span>
          ))}
        </div>
        <span className="project-date">{date}</span>
      </div>
    </a>
  );
};

export const Projects: React.FC = () => {
  const { isActive } = usePageTransition();

  return (
    <div className={`projects ${isActive ? 'active' : ''}`}>
      <main className="projects-content">
        <div className="projects-grid">
          <ProjectCard
            href="/iiifviewer"
            image="/Untitled.png"
            tags={['React', 'TypeScript']}
            date="2026"
          />
          <ProjectCard
            href="/rydmboat"
            image="/spaceship2.png"
            tags={['3D', 'WebGL', 'Three.js']}
            date="2025"
          />
        </div>
      </main>
    </div>
  );
};
