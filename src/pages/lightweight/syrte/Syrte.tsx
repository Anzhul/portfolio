import React, { lazy } from 'react';
import './Syrte.scss';
import { usePageTransition } from '../../../context/PageTransitionContext';
import { Lazy3DObject } from '../../../components/lazy/Lazy3DObject';

const SyrteScene = lazy(() => import('../../../components/canvas/syrte/SyrteScene'));

interface SyrteProps {
  isVisible?: boolean;
}

export const Syrte: React.FC<SyrteProps> = ({ isVisible = true }) => {
  const { isActive } = usePageTransition();

  return (
    <div className={`syrte-page ${isActive ? 'active' : ''}`}>
      <header className="syrte-header">
        <h1>Syrte–</h1>
        <p>Just for fun, a 3D fabrication of a faraway landscape.</p>
      </header>
      <main className="syrte-content">
        <div className="syrte-gallery">
          <div className="gallery-item">
            <img loading="lazy" src="/syrtewebp/syrte1.webp" alt="Syrte World screenshot 1" />
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrtewebp/syrte2.webp" alt="Syrte World screenshot 2" style={{ transform: 'rotate(90deg)' }} />
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrtewebp/syrte3.webp" alt="Syrte World screenshot 3" style={{ transform: 'rotate(90deg)' }}/>
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrtewebp/syrte4.webp" alt="Syrte World screenshot 4" />
          </div>
        </div>
        <div className="syrte-conception">
          <h2>Conception</h2>
          <p>
          The science fiction I’ve consumed has always featured barren deserts and alien spires. Without greenery, a subconscious understanding emerges: the desert preserves-- so what it buries must be unknowable and ancient.  
          <br></br>
          <br></br>
          To create similar worlds, I used Gaea, a node-based terrain creator. After several iterations of experimentation, I settled on a landscape I thought could tell a story:
          </p>
          <div className="syrte-canvas-wrapper">
            <Lazy3DObject
              loadStrategy="immediate"
              component={SyrteScene}
              componentProps={{ isVisible, colorMapTifPath: '/syrte/syrte_color.png' }}
              className="syrte-scene-container"
              placeholder={null}
              loadingFallback={null}
            />
          </div>
          <p>
          This terrain was originally output using 8192x8192 image maps. These maps include height, normal, and color data which were used to render the realistic terrain in Blender. Additional data such as protrusion and slope maps were also generated to enhance detail and specify features.
          <br></br>
          <br></br>
          A separate 3D mesh was also created for the CNC machine to utilize. This was generated with a moderate level of detail, enough to capture the jagged spires and undulating dunes. After a few adjustments to the topology, I cropped the mesh into a circle to create a more visually appealing CNC carving.
          </p>
        </div>
        <div className="syrte-fabrication">
          <h2>Fabrication</h2>
          <p>
          For the material of the terrain model, I chose a relatively cheap MDF board. This was chosen for three reasons: affordability, ease of carving and thickness. MDF is a dense, smooth material that can be carved much quicker and easily by the CNC machine, making it ideal for creating detailed terrain models. 
          <br></br>
          <br></br>
          MDF is also available in more varied thicknesses, allowing for the landscape to be carved into two layers instead of three or four. The CNC carving process took 6 hours to complete, with the machine carefully following the contours of my model to create a detailed  representation of the original design.
          </p>
          <div className="syrte-gallery">
            <div className="gallery-item">
              <img loading="lazy" src="/syrtewebp/syrte5.webp" alt="Syrte World screenshot 1" style={{ transform: 'rotate(90deg)' }}/>
            </div>
            <div className="gallery-item">
              <img loading="lazy" src="/syrtewebp/syrte6.webp" alt="Syrte World screenshot 2" />
            </div>
          </div>
        <p>
          Once printed, I assembled the two layers using super glue and sanded down the carving. This project was time constrained, so I opted to leave the carving unpainted. The natural color of the MDF felt appropriate for the desert landscape, reminding me of the faraway dunes of arrakis or a barren planet from Valerian.
        </p>
                            <div className="syrte-gallery">
          <div className="gallery-item">
            <img loading="lazy" src="/syrtewebp/syrte7.webp" alt="Syrte World screenshot 1" />
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrtewebp/syrte8.webp" alt="Syrte World screenshot 2" style={{ transform: 'rotate(90deg)' }} />
          </div>
        </div>
        </div>

        <div className="syrte-stand">
          <h2>Sci-fi stand</h2>
          <p>
            To complement the sci-fi aesthetic of the landscape, I decided to create a futuristic stand. My inspiration came from the landing gear of sci-fi spaceships: overly complex and mechanically unneccessary.
          <br></br>
          <br></br>
            I first designed the stand in my favorite CAD program, Moi3D. While Fusion360 and other CAD software are far more powerful and feature rich, I find Moi3D to be the most effective in hashing out first prototypes. The design process involved sketching out the basic shape using curves, then extruding and refining the geometry to create a moveable structure. 
          <br></br>
          <br></br>
As a child who grew up playing with legos and bionicles, the design process for the moveable joints felt relatively intuitive. The piston-like joints were designed to allow for smooth movement while maintaining stability, and the overall structure was optimized for 3D printing.
          </p>
          <div className="syrte-gallery">
          <div className="gallery-item">
            <img loading="lazy" src="/syrtewebp/syrte9.webp" alt="Syrte World screenshot 1" />
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrtewebp/syrte10.webp" alt="Syrte World screenshot 2" style={{ transform: 'rotate(90deg)' }} />
          </div>
          </div>
          <p>
          The stand for the Syrte World was designed in Blender and 3D printed using PLA filament. The design features a minimalist sci-fi aesthetic, with clean lines and geometric shapes that complement the terrain model. The stand was printed in two parts to accommodate the print bed size, and then assembled using super glue. To finish, I painted the stand with a matte black spray paint to create a sleek, modern look that contrasts with the earthy tones of the terrain.
          </p>
      <div className="syrte-gallery">
          <div className="gallery-item">
            <img loading="lazy" src="/syrtewebp/syrte11.webp" alt="Syrte World screenshot 1"/>
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrtewebp/syrte12.webp" alt="Syrte World screenshot 2" />
          </div>
        </div>
        <p>

          The stand for the Syrte World was designed in Blender and 3D printed using PLA filament. The design features a minimalist sci-fi aesthetic, with clean lines and geometric shapes that complement the terrain model. The stand was printed in two parts to accommodate the print bed size, and then assembled using super glue. To finish, I painted the stand with a matte black spray paint to create a sleek, modern look that contrasts with the earthy tones of the terrain.
        </p>
              <div className="syrte-gallery">
          <div className="gallery-item">
            <img loading="lazy" src="/syrtewebp/syrte13.webp" alt="Syrte World screenshot 1" style={{ transform: 'rotate(90deg)' }}/>
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrtewebp/syrte14.webp" alt="Syrte World screenshot 2"/>
          </div>
        </div>
        </div>

      </main>
    </div>
  );
};
