import type * as THREE from 'three';
import type { Bounds, Obstacle } from '../world/types';
import { clamp, damp, lerp, lerpAngle } from '../utils/math';

export interface FollowTarget {
  x: number;
  y: number;
  z: number;
  /** Heading in radians; forward is (sin h, cos h). */
  h: number;
}

/** Third-person chase camera: sits behind the skater, swings round lazily when they turn, widens FOV with speed. */
export class FollowCamera {
  private heading = 0;
  private focusY = 0;
  private camY = 2.2;
  private fov = 62;

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private readonly bounds: Bounds,
    private readonly obstacles: Obstacle[],
  ) {}

  snap(t: FollowTarget, speed = 0): void {
    this.heading = t.h;
    this.focusY = t.y;
    this.fov = 62;
    this.update(1, t, speed);
  }

  update(dt: number, t: FollowTarget, speed: number): void {
    this.heading = lerpAngle(this.heading, t.h, damp(3.2, dt));
    this.focusY = lerp(this.focusY, t.y, damp(6, dt));

    const dist = 5.3 + speed * 0.07;
    const sx = Math.sin(this.heading);
    const sz = Math.cos(this.heading);
    const m = 2;
    const cx = Math.min(this.bounds.maxX + m, Math.max(this.bounds.minX - m, t.x - sx * dist));
    const cz = Math.min(this.bounds.maxZ + m, Math.max(this.bounds.minZ - m, t.z - sz * dist));
    // Don't let the camera sit inside a low wall/ledge: ride up over it.
    let wantY = 2.2 + this.focusY * 0.7;
    for (const o of this.obstacles) {
      const t = clamp((cx - o.ax) * o.dx + (cz - o.az) * o.dz, 0, o.len);
      const ox = cx - (o.ax + o.dx * t);
      const oz = cz - (o.az + o.dz * t);
      const r = o.hw + 0.5;
      if (ox * ox + oz * oz < r * r) wantY = Math.max(wantY, o.top + 0.5);
    }
    this.camY = lerp(this.camY, wantY, dt >= 1 ? 1 : damp(12, dt));
    this.camera.position.set(cx, this.camY, cz);
    this.camera.lookAt(t.x + sx * 1.6, 1.1 + this.focusY * 0.6, t.z + sz * 1.6);

    const targetFov = 62 + speed * 0.9;
    this.fov = lerp(this.fov, targetFov, damp(3, dt));
    if (Math.abs(this.camera.fov - this.fov) > 0.05) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
