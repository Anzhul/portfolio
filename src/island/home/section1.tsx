import { Section } from '../../components/world/Section'
import './section1.scss'

export function HomeSection1() {
  return (
    <Section id="section1" islandId="home" name="section1" position={[10, 0, 0]}>
      <div className="section1-content">Home Section 1 Content</div>
    </Section>
  )
}