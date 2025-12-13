import { Island } from '../../components/world/Island'
import { HomeSection1 } from './section1'
import './home.scss'

export function HomeIsland() {
  return (
    <Island id="home" position={[0, 0, 0]} name="home">
      <div className="home-content">Home Island Content</div>
      <HomeSection1 />
    </Island>
  )
}