import { Section } from '../../components/world/Section'
import './section1.scss'

export function HomeGreetings() {
  return (
    <Section id="section1" islandId="home" name="section1" position={[2000, -300, 0]}>
      <div className="section1-content">
        <h2 id="greeting1" className="greeting1">Hi, I'm Anzhu-</h2>
        <h2 id="greeting2" className="greeting2">honing my skills as a<span id="n" className='n'>n</span></h2>
        <div className="word-carousel">
          <div className="word-slide1">Developer</div>
          <div className="word-slide2">Designer</div>
          <div className="word-slide3">Illustrator</div>
        </div>
      </div>
    </Section>
  )
}