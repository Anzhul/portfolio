import React, { useState, useMemo, useRef, useEffect } from 'react';
import './Projects.scss';
import { usePageTransition } from '../../context/PageTransitionContext';

interface ProjectData {
  href: string;
  image: string;
  title: string;
  tags: string[];
  year: number;
  size: string;
}

const projects: ProjectData[] = [
  {
    href: '/iiifviewer',
    image: '/Untitled.webp',
    title: 'Juniper',
    tags: ['React', 'TypeScript'],
    year: 2026,
    size: '4x4',
  },
  {
    href: '/rydmboat',
    image: '/rymdboat/rymdboatplanet.webp',
    title: 'Rymdboat',
    tags: ['3D', 'WebGL', 'Three.js'],
    year: 2025,
    size: '4x2',
  },
  {
    href: '/syrte',
    image: 'syrte/syrte1.png',
    title: 'Syrte World',
    tags: ['3D', 'WebGL'],
    year: 2025,
    size: '2x2',
  },
  {
    href: '/arcade_ship',
    image: '/arcade.webm',
    title: 'Arcade Ship',
    tags: ['3D', 'WebGL'],
    year: 2025,
    size: '2x2',
  },
];

const allYears = [...new Set(projects.map((p) => p.year))].sort((a, b) => b - a);

interface ProjectCardProps {
  href: string;
  image: string;
  title: string;
  tags: string[];
  year: number;
  size?: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ href, image, title, tags, year, size = '1x1' }) => {
  const { triggerTransition } = usePageTransition();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerTransition(href);
  };

  const isVideo = image.endsWith('.webm') || image.endsWith('.mp4');

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`project-card project-size-${size}`}
    >
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
          <p className="project-date">{year}</p>
          <div className="project-tags">
            {tags.map((tag, index) => (
              <span key={tag} className="project-tag">{tag}{index < tags.length - 1 && ','}</span>
            ))}
          </div>
        </div>
      </div>
    </a>
  );
};

export const Projects: React.FC = () => {
  const { isActive } = usePageTransition();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProjects = useMemo(() => {
    if (selectedYear === null) return projects;
    return projects.filter((p) => p.year === selectedYear);
  }, [selectedYear]);

  return (
    <div className={`projects ${isActive ? 'active' : ''}`}>
      <main className="projects-content">
        <div className="projects-header">
          <div className="projects-description">
            <h1>Projects</h1>
            <p>A collection of work spanning interactive 3D experiences, web applications, and creative development.</p>
          </div>
          <div className="projects-sort" ref={dropdownRef}>
            <button
              className="sort-dropdown-trigger"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {selectedYear ?? 'All'}
              <span className={`sort-chevron ${dropdownOpen ? 'open' : ''}`}>&#9662;</span>
            </button>
            {dropdownOpen && (
              <div className="sort-dropdown-menu">
                <button
                  className={`sort-dropdown-item ${selectedYear === null ? 'active' : ''}`}
                  onClick={() => { setSelectedYear(null); setDropdownOpen(false); }}
                >
                  All
                </button>
                {allYears.map((year) => (
                  <button
                    key={year}
                    className={`sort-dropdown-item ${selectedYear === year ? 'active' : ''}`}
                    onClick={() => { setSelectedYear(year); setDropdownOpen(false); }}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="projects-grid">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.href}
              href={project.href}
              image={project.image}
              title={project.title}
              tags={project.tags}
              year={project.year}
              size={project.size}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
