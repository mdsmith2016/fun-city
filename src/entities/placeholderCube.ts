import * as THREE from 'three';
import type { Keyboard } from '../input/keyboard';
import { lowPolyMesh } from '../utils/lowpoly';

// PLACEHOLDER: proves input -> update -> render works. Replace once the game premise exists.
export class PlaceholderCube {
  readonly mesh: THREE.Mesh;
  private readonly speed = 5;
  private readonly prev = new THREE.Vector3();
  private readonly curr = new THREE.Vector3();

  constructor() {
    this.mesh = lowPolyMesh(new THREE.BoxGeometry(1, 1, 1), 0xe07a5f);
    this.curr.set(0, 0.5, 0);
    this.prev.copy(this.curr);
    this.mesh.position.copy(this.curr);
  }

  update(dt: number, keys: Keyboard): void {
    this.prev.copy(this.curr);
    const x = keys.axis(['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD']);
    const z = keys.axis(['ArrowUp', 'KeyW'], ['ArrowDown', 'KeyS']);
    const len = Math.hypot(x, z) || 1;
    this.curr.x += (x / len) * this.speed * dt;
    this.curr.z += (z / len) * this.speed * dt;
    if (x || z) this.mesh.rotation.y = Math.atan2(x, z);
  }

  /** Interpolate between fixed steps for smooth motion at any refresh rate. */
  render(alpha: number): void {
    this.mesh.position.lerpVectors(this.prev, this.curr, alpha);
  }
}
