import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../utils/lowpoly';

/** A small ground fire. Local level coordinates. */
export interface FireAnchor {
  x: number;
  z: number;
  size: number;
}

/** A burning window on a building face. `nx` is the facade normal along X (+1 faces +X). */
export interface WindowFire {
  x: number;
  y: number;
  z: number;
  nx: 1 | -1;
}

export interface Fires {
  group: THREE.Group;
  /** Advance the flicker. Cheap: one uniform. */
  update(time: number): void;
}

const time = { value: 0 };

const FLAME_HEIGHT = 1.2;

/** Three cones in a bunch: tall middle tongue and two shorter ones. Vertex colours run red -> orange -> yellow. */
function flameGeometry(): THREE.BufferGeometry {
  const cone = (r: number, h: number, x: number, z: number, ry: number) => {
    const g = new THREE.ConeGeometry(r, h, 5, 1, true);
    g.translate(0, h / 2, 0);
    g.rotateY(ry);
    g.translate(x, 0, z);
    return g;
  };
  const geo = mergeGeometries([
    cone(0.5, FLAME_HEIGHT, 0, 0, 0),
    cone(0.32, 0.8, -0.3, 0.12, 1),
    cone(0.3, 0.7, 0.3, -0.14, 2),
  ])!;
  geo.deleteAttribute('uv');
  geo.deleteAttribute('normal');

  const base = new THREE.Color(0xd2300e);
  const mid = new THREE.Color(0xff7a18);
  const tip = new THREE.Color(0xffd53a);
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, pos.getY(i) / FLAME_HEIGHT);
    if (t < 0.5) c.copy(base).lerp(mid, t * 2);
    else c.copy(mid).lerp(tip, (t - 0.5) * 2);
    c.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/**
 * Unlit basic material whose vertex shader makes every flame flicker and sway from one shared time uniform
 * plus a per-instance phase. No lights, no per-fire CPU work.
 */
function flameMaterial(): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPhase;\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float h = position.y;
        float f = 1.0 + 0.22 * sin(uTime * 9.0 + aPhase) + 0.12 * sin(uTime * 17.0 + aPhase * 2.3);
        transformed.y *= f;
        transformed.xz *= 1.0 - 0.15 * (f - 1.0);
        transformed.x += sin(uTime * 6.0 + aPhase * 1.7) * 0.14 * h;
        transformed.z += cos(uTime * 5.0 + aPhase) * 0.14 * h;`,
      );
  };
  mat.customProgramCacheKey = () => 'flame';
  return mat;
}

/**
 * Builds every fire of a level as two instanced meshes: one for all the flames (ground fires and the tongues
 * licking out of windows) and one for the glowing window panes. Two draw calls however many fires there are.
 */
export function buildFires(anchors: FireAnchor[], windows: WindowFire[], seed = 3): Fires {
  const rand = mulberry32(seed);
  const group = new THREE.Group();

  const flames = new THREE.InstancedMesh(flameGeometry(), flameMaterial(), anchors.length + windows.length);
  const phases = new Float32Array(flames.count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  let i = 0;
  for (const a of anchors) {
    q.setFromAxisAngle(up, rand() * Math.PI * 2);
    p.set(a.x, 0, a.z);
    const k = a.size * 0.9;
    s.set(k * (0.8 + rand() * 0.3), k, k * (0.8 + rand() * 0.3));
    flames.setMatrixAt(i, m.compose(p, q, s));
    phases[i++] = rand() * 50;
  }
  for (const w of windows) {
    q.setFromAxisAngle(up, rand() * Math.PI * 2);
    p.set(w.x + w.nx * 0.35, w.y + 0.7, w.z);
    const k = 1.7 + rand() * 0.9;
    s.set(k, k * 1.1, k);
    flames.setMatrixAt(i, m.compose(p, q, s));
    phases[i++] = rand() * 50;
  }
  flames.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
  flames.frustumCulled = true;
  flames.computeBoundingSphere();
  group.add(flames);

  if (windows.length) {
    const glow = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(3.2, 1.9),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      windows.length,
    );
    const hot = new THREE.Color(0xff5a12);
    const warm = new THREE.Color(0xffa133);
    const c = new THREE.Color();
    windows.forEach((w, n) => {
      q.setFromAxisAngle(up, (w.nx * Math.PI) / 2);
      p.set(w.x + w.nx * 0.05, w.y, w.z);
      glow.setMatrixAt(n, m.compose(p, q, s.set(1, 1, 1)));
      glow.setColorAt(n, c.copy(hot).lerp(warm, rand()));
    });
    glow.computeBoundingSphere();
    group.add(glow);
  }

  return {
    group,
    update(t) {
      time.value = t;
    },
  };
}