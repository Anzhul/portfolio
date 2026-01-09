import React, { useEffect, useState } from 'react';
import './SplitText.scss';

export interface CharConfig {
  delay?: number;
  duration?: number;
  className?: string;
}

interface SplitTextProps {
  text: string;
  animate?: boolean;
  baseDelay?: number;
  baseDuration?: number;
  staggerDelay?: number;
  randomizeStagger?: boolean;
  randomStaggerMin?: number;
  randomStaggerMax?: number;
  charConfigs?: { [index: number]: CharConfig };
  className?: string;
  splitBy?: 'char' | 'word';
}

export const SplitText: React.FC<SplitTextProps> = ({
  text,
  animate = false,
  baseDelay = 0,
  baseDuration = 0.6,
  staggerDelay = 0.1,
  randomizeStagger = false,
  randomStaggerMin = 0,
  randomStaggerMax = 0.3,
  charConfigs = {},
  className = '',
  splitBy = 'char',
}) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  const [randomDelays] = useState<number[]>(() => {
    // Generate random delays once on component mount
    const segments = splitBy === 'word' ? text.split(' ') : text.split('');
    if (randomizeStagger) {
      return segments.map(() =>
        Math.random() * (randomStaggerMax - randomStaggerMin) + randomStaggerMin
      );
    }
    return [];
  });

  const segments = splitBy === 'word' ? text.split(' ') : text.split('');

  useEffect(() => {
    if (animate) {
      // Small delay to ensure initial state is rendered before animating
      const timer = setTimeout(() => {
        setShouldAnimate(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setShouldAnimate(false);
    }
  }, [animate]);

  return (
    <span className={`split-text ${shouldAnimate ? 'animate' : ''} ${className}`}>
      {segments.map((segment, index) => {
        const config = charConfigs[index] || {};
        const calculatedDelay = randomizeStagger
          ? baseDelay + randomDelays[index]
          : baseDelay + (index * staggerDelay);
        const delay = config.delay ?? calculatedDelay;
        const duration = config.duration ?? baseDuration;

        return (
          <span
            key={index}
            className={splitBy === 'word' ? 'word' : 'char'}
            style={{
              '--char-delay': `${delay}s`,
              '--char-duration': `${duration}s`,
            } as React.CSSProperties}
          >
            {splitBy === 'word' ? (
              <>
                {segment}
                {index < segments.length - 1 ? '\u00A0' : ''}
              </>
            ) : (
              segment === ' ' ? '\u00A0' : segment
            )}
          </span>
        );
      })}
    </span>
  );
};
