import { Section } from '../../components/world/Section'
import './section1.scss'

export function HomeGreetings() {
  return (
    <Section id="section1" islandId="home" name="section1" position={[2000, -300, 0]}>
      <div className="section1-content">
        <h2>你好, I'm Anzhu-</h2>
        <h2>honing my skills as a</h2>
        <div className="word-carousel">
          <div className="word-slide">Web Developer</div>
          <div className="word-slide">3D Artist</div>
          <div className="word-slide">UI/UX Designer</div>
          <div className="word-slide">Game Developer</div>
          <div className="word-slide">Tech Enthusiast</div>
        </div>
      </div>
    </Section>
  )
}