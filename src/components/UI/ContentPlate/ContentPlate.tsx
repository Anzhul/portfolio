import { type ReactNode } from 'react'
import { useMenu } from '../../../context/MenuContext'
import './ContentPlate.scss'

interface ContentPlateProps {
  children: ReactNode
}

function ContentPlate({ children }: ContentPlateProps) {
  const { isMenuOpen } = useMenu()

  return (
    <div className={`content-plate ${isMenuOpen ? 'menu-open' : ''}`}>
      {children}
    </div>
  )
}

export default ContentPlate
