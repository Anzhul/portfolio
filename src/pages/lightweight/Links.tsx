import React from 'react';
import './Links.scss';

export const Links: React.FC = () => {
  // Example links - replace with your actual social/professional links
  const links = [
    {
      id: 1,
      title: 'GitHub',
      description: 'Check out my code and open source contributions',
      url: 'https://github.com/yourusername',
      icon: '💻'
    },
    {
      id: 2,
      title: 'LinkedIn',
      description: 'Connect with me professionally',
      url: 'https://linkedin.com/in/yourusername',
      icon: '💼'
    },
    {
      id: 3,
      title: 'Twitter',
      description: 'Follow me for updates and thoughts',
      url: 'https://twitter.com/yourusername',
      icon: '🐦'
    },
    {
      id: 4,
      title: 'Email',
      description: 'Get in touch directly',
      url: 'mailto:your.email@example.com',
      icon: '📧'
    },
    {
      id: 5,
      title: 'CodePen',
      description: 'View my creative experiments and demos',
      url: 'https://codepen.io/yourusername',
      icon: '🎨'
    },
    {
      id: 6,
      title: 'Medium',
      description: 'Read my articles and tutorials',
      url: 'https://medium.com/@yourusername',
      icon: '✍️'
    }
  ];

  return (
    <div className="links-page">
      <header className="links-header">
        <nav className="breadcrumb">
          <a href="/">Home</a>
          <span>/</span>
          <span>Links</span>
        </nav>
        <h1>Connect With Me</h1>
        <p>Find me across the web</p>
      </header>

      <main className="links-content">
        <div className="links-grid">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              className="link-item"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="link-icon">{link.icon}</div>
              <div className="link-info">
                <h2>{link.title}</h2>
                <p>{link.description}</p>
              </div>
              <div className="link-arrow">→</div>
            </a>
          ))}
        </div>

        <aside className="experience-cta">
          <div className="cta-content">
            <h3>Explore More</h3>
            <p>Dive into my immersive 3D portfolio experience</p>
            <a href="/home" className="cta-button">
              Enter 3D World
            </a>
          </div>
        </aside>
      </main>

      <footer className="page-footer">
        <a href="/">← Back to Home</a>
        <a href="/projects">View Projects →</a>
      </footer>
    </div>
  );
};
