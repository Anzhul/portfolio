import React from 'react';
import './Projects.scss';
import { usePageTransition } from '../../context/PageTransitionContext';

export const Projects: React.FC = () => {
  const { transitionState } = usePageTransition();

  // Example project data - replace with your actual projects
  const projects = [
    {
      id: 1,
      title: 'Project One',
      description: 'A brief description of this amazing project and what technologies were used.',
      tags: ['React', 'TypeScript', 'Three.js'],
      link: '#',
      image: '/placeholder-project.jpg'
    },
  ];

  return (
    <div className={`projects page-transition ${transitionState === 'exiting' ? 'page-exit' : ''} ${transitionState === 'entering' ? 'page-enter' : ''}`}>
      <header className="projects-header">
        <h1>Projects</h1>
        <p>A collection of my work and experiments</p>
      </header>

      <main className="projects-content">
        <div className="projects-grid">
          {projects.map((project) => (
            <article key={project.id} className="project-card">
              <div className="project-image">
                <img src={project.image} alt={project.title} />
              </div>
              <div className="project-info">
                <h2>{project.title}</h2>
                <p>{project.description}</p>
                <div className="project-tags">
                  {project.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
                <a href={project.link} className="project-link">
                  View Project →
                </a>
              </div>
            </article>
          ))}
        </div>

        <aside className="cta-section">
          <h3>Want to see more?</h3>
          <p>Explore my work in the immersive 3D experience</p>
          <a href="/home" className="cta-button">
            Enter 3D Experience
          </a>
        </aside>
      </main>

      <footer className="page-footer">
        <a href="/">← Back to Home</a>
        <a href="/links">View Links →</a>
      </footer>
    </div>
  );
};
