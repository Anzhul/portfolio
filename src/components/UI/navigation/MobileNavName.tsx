import { useMenu } from '../../../context/MenuContext'
import './MobileNavigation.scss'

interface MobileNavigationNameProps {
  name: string
}

function MobileNavigationName({ name }: MobileNavigationNameProps) {
  const { isMenuOpen } = useMenu()

  // Split name into individual letters
  const letters = name.split('')

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