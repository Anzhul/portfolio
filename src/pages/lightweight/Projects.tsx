import React from 'react';
import './Projects.scss';
import { usePageTransition } from '../../context/PageTransitionContext';

interface ProjectCardProps {
  href: string;
  image: string;
  title: string;
  tags: string[];
  date: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ href, image, title, tags, date }) => {
  const { triggerTransition } = usePageTransition();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerTransition(href);
  };

  const isVideo = image.endsWith('.webm') || image.endsWith('.mp4');

  return (
    <a href={href} onClick={handleClick} className="project-card">
      <div className="project-media-wrapper">
        {isVideo ? (
          <video
            className="project-video"
            autoPlay
            loop
            muted
            playsInline
            style={{ objectFit: 'cover' }}
          >
            <source src={image} type="video/webm" />
          </video>
        ) : (
          <div className="project-image" style={{ backgroundImage: `url('${image}')` }}></div>
        )}
        <div className="project-info">
          <h3 className="project-title">{title}</h3>
        </div>
      </div>
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
            title="Juniper"
            tags={['React', 'TypeScript']}
            date="2026"
          />
          <ProjectCard
            href="/rydmboat"
            image="/spaceship2.png"
            title="Rymdboat"
            tags={['3D', 'WebGL', 'Three.js']}
            date="2025"
          />
          <ProjectCard
            href="/syrte"
            image="/syrte1.png"
            title="Syrte World"
            tags={['3D', 'WebGL']}
            date="2025"
          />
          <ProjectCard
            href="/arcade_ship"
            image="/arcade.webm"
            title="Arcade Ship"
            tags={['3D', 'WebGL']}
            date="2025"
          />
        </div>
      </main>
    </div>
  );
};
