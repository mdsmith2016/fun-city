import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { StaticBatch } from '../utils/batch';

/**
 * The "ROADMAP UNDER CONSTRUCTION" closure at the water-facing edge of the last unlocked block, plus the
 * unfinished roads running out past it toward the next block, fading into the ground.
 * Local space: the barrier line sits at z = 0 and the roads extend toward -Z (the water side).
 * Everything is built once, then moved to wherever the current edge is.
 */
export interface Gate {
  group: THREE.Group;
  /** The barriers alone, so they can drop away while the roads just disappear. */
  barriers: THREE.Object3D;
  roads: THREE.Object3D;
}

const ORANGE = 0xea7a2c;
const WHITE = 0xf1efe8;
const POST = 0x4a4f57;

function signTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 320;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;

  g.fillStyle = '#f2c230';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#16181c';
  for (let x = -h; x < w + h; x += 64) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 32, 0);
    g.lineTo(x + 32 - 28, 28);
    g.lineTo(x - 28, 28);
    g.fill();
    g.beginPath();
    g.moveTo(x, h);
    g.lineTo(x + 32, h);
    g.lineTo(x + 32 + 28, h - 28);
    g.lineTo(x + 28, h - 28);
    g.fill();
  }
  g.fillStyle = '#16181c';
  g.fillRect(0, 40, w, 6);
  g.fillRect(0, h - 46, w, 6);

  g.fillStyle = '#16181c';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 120px "Arial Black", Impact, "Helvetica Neue", Arial, sans-serif';
  g.fillText('ROADMAP', w / 2, h * 0.36);
  g.font = '900 78px "Arial Black", Impact, "Helvetica Neue", Arial, sans-serif';
  g.fillText('UNDER CONSTRUCTION', w / 2, h * 0.7);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Asphalt strip with lane markings that fades to nothing at its far (+v) end. */
function roadTexture(markings: 'double' | 'dashed'): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#3b3e44';
  g.fillRect(0, 0, w, h);
  if (markings === 'double') {
    g.fillStyle = '#e3b72d';
    g.fillRect(w / 2 - 5, 0, 3, h);
    g.fillRect(w / 2 + 2, 0, 3, h);
    g.fillStyle = '#eeeeea';
    for (const x of [w * 0.2, w * 0.8]) for (let y = 0; y < h; y += 32) g.fillRect(x - 1.5, y, 3, 16);
  } else {
    g.fillStyle = '#eeeeea';
    for (let y = 0; y < h; y += 32) g.fillRect(w / 2 - 1.5, y, 3, 16);
  }
  g.fillStyle = '#eeeeea';
  g.fillRect(2, 0, 2, h);
  g.fillRect(w - 4, 0, 2, h);

  g.globalCompositeOperation = 'destination-in';
  const fade = g.createLinearGradient(0, h, 0, 0);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.35, 'rgba(0,0,0,0.85)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fade;
  g.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function road(x: number, width: number, length: number, markings: 'double' | 'dashed'): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, length);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: roadTexture(markings),
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.006, -length / 2);
  mesh.renderOrder = 1;
  return mesh;
}

export function buildGate(halfWidth: number): Gate {
  const group = new THREE.Group();
  const barriers = new THREE.Group();

  const b = new StaticBatch();
  const rails: Array<[number, number]> = [
    [0.95, 0.3],
    [0.55, 0.3],
  ];
  const stripe = 1.5;
  const span = halfWidth * 2;
  for (const [y, h] of rails) {
    for (let i = 0; i * stripe < span; i++) {
      const x0 = -halfWidth + i * stripe;
      const wdt = Math.min(stripe, halfWidth - x0);
      b.box(wdt, h, 0.1, (i + (y > 0.8 ? 0 : 1)) % 2 ? WHITE : ORANGE, x0 + wdt / 2, y, 0);
    }
  }
  for (let x = -halfWidth; x <= halfWidth + 0.01; x += 5) {
    b.box(0.12, 1.2, 0.12, POST, x, 0.6, 0);
    b.box(0.5, 0.06, 1.1, POST, x, 0.03, 0.2);
  }
  // Tall posts behind the sign boards.
  const signXs = [-42, -14, 14, 42];
  for (const x of signXs) {
    b.box(0.14, 3.6, 0.14, POST, x - 2.4, 1.8, -0.15);
    b.box(0.14, 3.6, 0.14, POST, x + 2.4, 1.8, -0.15);
  }
  barriers.add(b.build({ cast: true, receive: true }));

  const boards = signXs.map((x) => {
    const g = new THREE.PlaneGeometry(5.6, 1.75);
    g.translate(x, 2.55, 0.0);
    return g;
  });
  const signs = new THREE.Mesh(
    mergeGeometries(boards)!,
    new THREE.MeshBasicMaterial({ map: signTexture() }),
  );
  barriers.add(signs);
  group.add(barriers);

  const roads = new THREE.Group();
  roads.add(road(34, 20, 56, 'double'));
  roads.add(road(-20, 9, 40, 'dashed'));
  group.add(roads);

  return { group, barriers, roads };
}
