import React, { lazy } from 'react';
import './Syrte.scss';
import { usePageTransition } from '../../../context/PageTransitionContext';
import { Lazy3DObject } from '../../../components/lazy/Lazy3DObject';

const SyrteScene = lazy(() => import('../../../components/canvas/syrte/SyrteScene'));

export const Syrte: React.FC = () => {
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
            <img loading="lazy" src="/syrte/syrte0.png" alt="Syrte World screenshot 1" />
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrte/syrte2.jpg" alt="Syrte World screenshot 2" />
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrte/syrte3.jpg" alt="Syrte World screenshot 3" />
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrte/syrte8.png" alt="Syrte World screenshot 4" />
          </div>
        </div>
        <div className="syrte-conception">
          <h2>Conception</h2>
          <p>
          The science fiction I’ve consumed has always featured barren deserts and alien spires. Without greenery, a subconscious understanding emerges: the desert preserves-- so what it buries must be unknowable and ancient.  
          <br></br>
          <br></br>
          To materialize similar worlds, I used Gaea, a node-based terrain creator. After several iterations of experimentation, I settled on a landscape I thought could tell a story:
          </p>
          <div className="syrte-canvas-wrapper">
            <Lazy3DObject
              loadStrategy="immediate"
              component={SyrteScene}
              componentProps={{ isVisible: true, colorMapTifPath: '/syrte/syrte_color.tif' }}
              className="syrte-scene-container"
              placeholder={null}
              loadingFallback={null}
            />
          </div>
          <p>
          This terrain is a 3D fabrication of the Syrte World, a fictional landscape I created using Gaea. The model was exported as an OBJ file and processed in Blender before being 3D printed. The final piece is a hand-painted representation of the barren desert and alien spires that inspired it.
          </p>
        </div>
        <div className="syrte-fabrication">
            <h2>Fabrication</h2>
            <p>
            After exporting the terrain from Gaea, I processed the model in Blender to prepare it for 3D printing. I divided the terrain into four quadrants to fit the print bed of my Prusa MK3S+ printer. Each quadrant was printed with PLA filament at 0.2mm layer height, taking approximately 12 hours per piece.
            <br></br>
            <br></br>
            Once printed, I assembled the quadrants using super glue and filled any gaps with epoxy putty. To enhance the visual appeal, I hand-painted the model using acrylic paints, focusing on earthy tones to mimic a desert landscape.
            </p>
                    <div className="syrte-gallery">
          <div className="gallery-item">
            <img loading="lazy" src="/syrte/syrte9.jpg" alt="Syrte World screenshot 1" />
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrte/syrte10.jpg" alt="Syrte World screenshot 2" />
          </div>
        </div>
        <p>
            The stand for the Syrte World was designed in Blender and 3D printed using PLA filament. The design features a minimalist sci-fi aesthetic, with clean lines and geometric shapes that complement the terrain model. The stand was printed in two parts to accommodate the print bed size, and then assembled using super glue. To finish, I painted the stand with a matte black spray paint to create a sleek, modern look that contrasts with the earthy tones of the terrain.
        </p>
                            <div className="syrte-gallery">
          <div className="gallery-item">
            <img loading="lazy" src="/syrte/syrte15.png" alt="Syrte World screenshot 1" />
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrte/syrte6.jpg" alt="Syrte World screenshot 2" />
          </div>
        </div>
        </div>

        <div className="syrte-stand">
          <h2>Sci-fi stand</h2>
          <p>
          After exporting the terrain from Gaea, I processed the model in Blender to prepare it for 3D printing. I divided the terrain into four quadrants to fit the print bed of my Prusa MK3S+ printer. Each quadrant was printed with PLA filament at 0.2mm layer height, taking approximately 12 hours per piece.
          <br></br>
          <br></br>
          Once printed, I assembled the quadrants using super glue and filled any gaps with epoxy putty. To enhance the visual appeal, I hand-painted the model using acrylic paints, focusing on earthy tones to mimic a desert landscape.
          </p>
          <div className="syrte-gallery">
          <div className="gallery-item">
            <img loading="lazy" src="/syrte/syrte11.png" alt="Syrte World screenshot 1" />
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrte/syrte12.jpg" alt="Syrte World screenshot 2" />
          </div>
          </div>
          <p>
          The stand for the Syrte World was designed in Blender and 3D printed using PLA filament. The design features a minimalist sci-fi aesthetic, with clean lines and geometric shapes that complement the terrain model. The stand was printed in two parts to accommodate the print bed size, and then assembled using super glue. To finish, I painted the stand with a matte black spray paint to create a sleek, modern look that contrasts with the earthy tones of the terrain.
          </p>
      <div className="syrte-gallery">
          <div className="gallery-item">
            <img loading="lazy" src="/syrte/syrte13.png" alt="Syrte World screenshot 1" />
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrte/syrte14.jpg" alt="Syrte World screenshot 2" />
          </div>
        </div>
        <p>

          The stand for the Syrte World was designed in Blender and 3D printed using PLA filament. The design features a minimalist sci-fi aesthetic, with clean lines and geometric shapes that complement the terrain model. The stand was printed in two parts to accommodate the print bed size, and then assembled using super glue. To finish, I painted the stand with a matte black spray paint to create a sleek, modern look that contrasts with the earthy tones of the terrain.
        </p>
              <div className="syrte-gallery">
          <div className="gallery-item">
            <img loading="lazy" src="/syrte/syrte7.jpg" alt="Syrte World screenshot 1" />
          </div>
          <div className="gallery-item">
            <img loading="lazy" src="/syrte/syrte7.png" alt="Syrte World screenshot 2" />
          </div>
        </div>
        </div>

      </main>
    </div>
  );
};
