import type { CameraPosition, CameraTransformMatrices, ViewportDimensions } from './types';
import { DEFAULT_FOV, DEFAULT_NEAR, DEFAULT_FAR } from './types';

export class CameraTransform {
  private fov: number;
  private near: number;
  private far: number;

  constructor(fov = DEFAULT_FOV, near = DEFAULT_NEAR, far = DEFAULT_FAR) {
    this.fov = fov;
    this.near = near;
    this.far = far;
  }

  getCSSTransform(position: CameraPosition, scale: number, rotation: number = 0): string {
    const transforms: string[] = [];

    transforms.push(`translate(${-position.x}px, ${-position.y}px)`);

    if (scale !== 1) {
      transforms.push(`scale(${scale})`);
    }

    if (rotation !== 0) {
      transforms.push(`rotate(${rotation}deg)`);
    }

    return transforms.join(' ');
  }

  getViewMatrix(position: CameraPosition): Float32Array {
    const view = new Float32Array(16);

    view[0] = 1;
    view[1] = 0;
    view[2] = 0;
    view[3] = 0;

    view[4] = 0;
    view[5] = 1;
    view[6] = 0;
    view[7] = 0;

    view[8] = 0;
    view[9] = 0;
    view[10] = 1;
    view[11] = 0;

    view[12] = -position.x;
    view[13] = -position.y;
    view[14] = -position.z;
    view[15] = 1;

    return view;
  }

  getProjectionMatrix(viewport: ViewportDimensions, scale: number = 1): Float32Array {
    const aspect = viewport.width / viewport.height;
    const f = 1.0 / Math.tan(this.fov / 2);
    const rangeInv = 1.0 / (this.near - this.far);

    const projection = new Float32Array(16);

    projection[0] = f / aspect / scale;
    projection[1] = 0;
    projection[2] = 0;
    projection[3] = 0;

    projection[4] = 0;
    projection[5] = f / scale;
    projection[6] = 0;
    projection[7] = 0;

    projection[8] = 0;
    projection[9] = 0;
    projection[10] = (this.near + this.far) * rangeInv;
    projection[11] = -1;

    projection[12] = 0;
    projection[13] = 0;
    projection[14] = this.near * this.far * rangeInv * 2;
    projection[15] = 0;

    return projection;
  }

  getMatrices(
    position: CameraPosition,
    viewport: ViewportDimensions,
    scale: number = 1
  ): CameraTransformMatrices {
    return {
      view: this.getViewMatrix(position),
      projection: this.getProjectionMatrix(viewport, scale)
    };
  }

  setFOV(fov: number): void {
    this.fov = fov;
  }

  setClippingPlanes(near: number, far: number): void {
    this.near = near;
    this.far = far;
  }
}
