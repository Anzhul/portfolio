import { useMenu } from '../../../context/MenuContext'
import './MobileNavigation.scss'

interface MobileNavigationNameProps {
  name: string
}

function MobileNavigationName({ name }: MobileNavigationNameProps) {
  const { isMenuOpen } = useMenu()

  // Split name into individual letters
  const letters = name.split('')

  // Array of different easing functions for variety
  const easingFunctions = [
    'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // bounce
    'cubic-bezier(0.34, 1.56, 0.64, 1)', // overshoot
    'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // ease-out-quad
    'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // back-out
    'cubic-bezier(0.77, 0, 0.175, 1)', // ease-in-out-quart
  ]

  return (
    <div className="animated-name">
      {letters.map((letter, index) => {
        // Calculate delay - 0.3s base delay + stagger for each letter
        const delay = 0.3 + (index * 0.05) // 300ms base + 50ms between each letter

        // Pick an easing function (cycle through the array)
        const easing = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';

        return (
          <span
            key={index}
            className={`letter ${isMenuOpen ? 'animate' : ''}`}
            style={{
              transitionDelay: `${delay}s`,
              transitionTimingFunction: easing,
            }}
          >
            {letter === ' ' ? '\u00A0' : letter}
          </span>
        )
      })}
    </div>
  )
}

export default MobileNavigationName