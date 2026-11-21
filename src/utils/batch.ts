import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Per-triangle colour: receives the triangle centroid. */
export type ColorFn = (cx: number, cy: number, cz: number) => THREE.ColorRepresentation;

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const c = new THREE.Color();

const batchMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

/**
 * Collects many small coloured primitives and merges them into ONE mesh (one draw call).
 * All static world art goes through this so the scene stays at a handful of draw calls.
 */
export class StaticBatch {
  private readonly parts: THREE.BufferGeometry[] = [];

  /** Add a transformed copy of `geometry`. Rotation is Euler YXZ (yaw, pitch, roll). */
  add(
    geometry: THREE.BufferGeometry,
    color: THREE.ColorRepresentation | ColorFn,
    x = 0, y = 0, z = 0,
    rx = 0, ry = 0, rz = 0,
    sx = 1, sy = 1, sz = 1,
  ): this {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.deleteAttribute('uv');
    e.set(rx, ry, rz, 'YXZ');
    q.setFromEuler(e);
    p.set(x, y, z);
    s.set(sx, sy, sz);
    m.compose(p, q, s);
    g.applyMatrix4(m);

    const pos = g.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    if (typeof color === 'function') {
      for (let i = 0; i < pos.count; i += 3) {
        const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
        const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
        const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
        c.set(color(cx, cy, cz));
        for (let k = 0; k < 3; k++) c.toArray(colors, (i + k) * 3);
      }
    } else {
      c.set(color);
      for (let i = 0; i < pos.count; i++) c.toArray(colors, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.parts.push(g);
    return this;
  }

  /** Axis-aligned-ish box centred on (x,y,z) with size (w,h,d), optional yaw/pitch/roll. */
  box(
    w: number, h: number, d: number,
    color: THREE.ColorRepresentation,
    x: number, y: number, z: number,
    ry = 0, rx = 0, rz = 0,
  ): this {
    return this.add(unitBox, color, x, y, z, rx, ry, rz, w, h, d);
  }

  build(opts: { cast?: boolean; receive?: boolean } = {}): THREE.Mesh {
    const geo = mergeGeometries(this.parts, false);
    this.parts.forEach((g) => g.dispose());
    this.parts.length = 0;
    const mesh = new THREE.Mesh(geo, batchMaterial);
    mesh.castShadow = opts.cast ?? false;
    mesh.receiveShadow = opts.receive ?? false;
    return mesh;
  }
}
