import React from 'react';
import './PortfolioCard.scss';

export interface PortfolioCardProps {
  children?: React.ReactNode;
  gridWidth?: 1 | 2;
  gridHeight?: 1 | 2;
  className?: string;
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({
  children,
  gridWidth = 1,
  gridHeight = 1,
  className = ''
}) => {
  const gridClass = `grid-${gridWidth}x${gridHeight}`;

  return (
    <div className={`portfolio-card ${gridClass} ${className}`}>
      {children}
    </div>
  );
};
