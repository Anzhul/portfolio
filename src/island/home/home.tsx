import { Island } from '../../components/world/Island'
import { HomeSection1 } from './section1'
import './home.scss'
import { TestCube } from './TestCube'

export function HomeIsland() {
  return (
    <Island id="home" position={[0, 0, 0]} name="home">
      <div className="home-content">Home Island Content</div>
      <HomeSection1 />

      {/* Test cube to verify R3F camera sync */}
    <TestCube position={[0, 1, -5]} />
    </Island>
  )
}