import * as THREE from 'three';
import { SKY_HORIZON, SKY_TOP } from '../core/scene';
import { StaticBatch } from '../utils/batch';
import { jitter, mulberry32 } from '../utils/lowpoly';
import { tower } from './world';

/**
 * Low-poly Vancouver backdrop. The play area is a block downtown; "north" is -Z, across Burrard Inlet.
 * Layout is loosely geographic but exaggerated for readability:
 *   north      water, North Shore mountains (the Lions twin peaks), Canada Place + cruise ship
 *   north-west Lions Gate Bridge
 *   east       Harbour Centre tower
 *   south-east Science World dome on False Creek
 * Everything is merged into a few meshes, none cast shadows.
 */
export interface Backdrop {
  group: THREE.Group;
  /** Call each frame with the camera position so the sky dome never gets clipped or parallaxes. */
  followCamera(pos: THREE.Vector3): void;
}

export function buildBackdrop(): Backdrop {
  const group = new THREE.Group();
  const sky = makeSky();
  group.add(sky);
  group.add(makeWater());
  group.add(makeClouds());

  const far = new StaticBatch();
  addMountains(far);
  addCityRing(far);
  addCanadaPlace(far);
  addLionsGateBridge(far);
  addHarbourCentre(far);
  addScienceWorld(far);
  const farMesh = far.build();
  farMesh.frustumCulled = false;
  group.add(farMesh);

  return {
    group,
    followCamera(pos) {
      sky.position.copy(pos);
    },
  };
}

function makeSky(): THREE.Mesh {
  const radius = 4000;
  const geo = new THREE.SphereGeometry(radius, 16, 10);
  const top = new THREE.Color(SKY_TOP);
  const horizon = new THREE.Color(SKY_HORIZON);
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.pow(Math.min(1, Math.max(0, pos.getY(i) / radius)), 0.55);
    c.copy(horizon).lerp(top, t).toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return mesh;
}

function makeWater(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(8000, 3400);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x2f7ea8 }));
  mesh.position.set(0, -1.3, -44 - 1700);
  return mesh;
}

function makeClouds(): THREE.Mesh {
  const rand = mulberry32(21);
  const batch = new StaticBatch();
  const puff = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    const r = 900 + rand() * 2200;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    const cy = 420 + rand() * 260;
    const s = 90 + rand() * 90;
    for (let k = 0; k < 3; k++) {
      batch.add(puff, 0xffffff,
        cx + (k - 1) * s * 0.9, cy + (k === 1 ? s * 0.12 : 0), cz + (rand() - 0.5) * s * 0.4,
        0, rand() * 3, 0, s * (0.8 + rand() * 0.4), s * 0.32, s * 0.55);
    }
  }
  const mesh = batch.build();
  mesh.frustumCulled = false;
  return mesh;
}

// --- North Shore mountains ---------------------------------------------------

function addMountain(
  batch: StaticBatch, x: number, z: number, r: number, h: number, seed: number,
  radial = 7, snow = 0.34,
) {
  const geo = new THREE.ConeGeometry(r, h, radial, 4, true);
  geo.translate(0, h / 2, 0);
  jitter(geo, r * 0.07, seed);
  batch.add(geo, (_x, y) => {
    if (y > h * (1 - snow)) return 0xeef3f7;
    if (y > h * 0.38) return 0x66798a;
    return 0x34553f;
  }, x, -4, z);
}

function addMountains(batch: StaticBatch) {
  const rand = mulberry32(5);
  for (let i = -6; i <= 6; i++) {
    const h = 380 + rand() * 170;
    addMountain(batch, i * 360 + (rand() - 0.5) * 120, -1350 - rand() * 220, 520 + rand() * 120, h, 100 + i);
  }
  // The Lions: twin pointed peaks, tucked behind the bridge.
  addMountain(batch, -640, -1180, 190, 680, 41, 5, 0.3);
  addMountain(batch, -470, -1200, 165, 600, 42, 5, 0.3);

  // Low dark ridgeline for the rest of the horizon so it's not a flat void behind the city.
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const x = Math.sin(a) * 3000;
    const z = -Math.cos(a) * 3000;
    if (z < -900) continue;
    addMountain(batch, x, z, 520 + rand() * 200, 160 + rand() * 120, 300 + i, 6, 0.0);
  }
}

// --- Generic downtown towers ---------------------------------------------------

function addCityRing(batch: StaticBatch) {
  const rand = mulberry32(11);
  const bodies = [0x9aa6b0, 0xb3a692, 0x8794a0, 0xc2b8a8, 0xa5adb3];
  const glass = [0x2f4a63, 0x3d5a70, 0x4a6275];
  const keepClear: Array<[number, number, number]> = [
    [210, -30, 50],
    [330, 190, 110],
    [-480, -560, 0],
  ];
  let placed = 0;
  for (let tries = 0; tries < 600 && placed < 95; tries++) {
    const a = rand() * Math.PI * 2;
    const r = 105 + Math.pow(rand(), 0.8) * 900;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (z < -60) continue;
    if (Math.abs(x) < 100 && z < 80) continue;
    if (x < -380) continue;
    if (keepClear.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr)) continue;
    const w = 24 + rand() * 30;
    const d = 24 + rand() * 30;
    let h = 28 + rand() * 55;
    if (rand() < 0.14) h = 110 + rand() * 120;
    if (r > 400) h *= 1.3;
    tower(batch, x, z, w, d, h, bodies[Math.floor(rand() * bodies.length)], glass[Math.floor(rand() * glass.length)], 6);
    placed++;
  }
}

// --- Canada Place: pier with five white sails, cruise ship alongside --------

function addCanadaPlace(batch: StaticBatch) {
  const cx = 140;
  const cz = -300;
  batch.box(300, 5, 72, 0xb4bbc0, cx, 2.5, cz);
  batch.box(210, 15, 38, 0xe3e6e8, cx, 12.5, cz);
  batch.box(210, 2, 40, 0x6f8294, cx, 8, cz);

  const heights = [46, 55, 62, 55, 46];
  heights.forEach((h, i) => {
    const sail = new THREE.ConeGeometry(18, h, 4, 1, false);
    sail.rotateY(Math.PI / 4);
    sail.translate(0, h / 2, 0);
    batch.add(sail, 0xf7fafc, cx + (i - 2) * 42, 20, cz, 0, 0, 0, 1.55, 1, 0.9);
  });

  const sx = 470;
  batch.box(250, 16, 34, 0x1f3550, sx, 8, cz + 6);
  batch.box(230, 10, 30, 0xf2f4f5, sx, 21, cz + 6);
  batch.box(180, 8, 26, 0xf2f4f5, sx - 10, 30, cz + 6);
  batch.box(120, 7, 22, 0xf2f4f5, sx - 20, 37.5, cz + 6);
  batch.box(12, 15, 10, 0xc23b3b, sx - 40, 48, cz + 6);
}

// --- Lions Gate Bridge --------------------------------------------------------

function addLionsGateBridge(batch: StaticBatch) {
  const cx = -480;
  const cz = -560;
  const span = 320;
  const towerTop = 112;
  const deckY = 52;
  const green = 0x6ea08f;
  const x0 = cx - span / 2;
  const x1 = cx + span / 2;
  const half = 380;

  batch.box(half * 2, 3.5, 16, 0xaab4b9, cx, deckY, cz);
  batch.box(half * 2, 5, 3, 0x7d878d, cx, deckY - 4, cz);

  for (const tx of [x0, x1]) {
    for (const side of [-1, 1]) {
      batch.box(6, towerTop, 7, green, tx, towerTop / 2, cz + side * 9);
    }
    for (const y of [28, 58, 90, 106]) batch.box(6, 4.5, 26, green, tx, y, cz);
  }

  for (let x = cx - half + 30; x <= cx + half - 30; x += 62) {
    if (x > x0 - 20 && x < x1 + 20) continue;
    batch.box(5, deckY - 2, 7, 0xa7a7a5, x, (deckY - 2) / 2 - 1, cz);
  }

  const cableAt = (x: number): number => {
    if (x >= x0 && x <= x1) {
      const u = (x - cx) / (span / 2);
      return deckY + 6 + (towerTop - deckY - 4) * u * u;
    }
    const end = x < x0 ? cx - half : cx + half;
    const tx = x < x0 ? x0 : x1;
    const u = (x - end) / (tx - end);
    return deckY + 8 + (towerTop - deckY - 6) * u;
  };

  const segments: Array<[number, number]> = [];
  for (let i = 0; i < 18; i++) segments.push([x0 + (span * i) / 18, x0 + (span * (i + 1)) / 18]);
  for (let i = 0; i < 6; i++) {
    segments.push([cx - half + ((x0 - (cx - half)) * i) / 6, cx - half + ((x0 - (cx - half)) * (i + 1)) / 6]);
    segments.push([x1 + ((cx + half - x1) * i) / 6, x1 + ((cx + half - x1) * (i + 1)) / 6]);
  }
  for (const [xa, xb] of segments) {
    const ya = cableAt(xa);
    const yb = cableAt(xb);
    const len = Math.hypot(xb - xa, yb - ya);
    for (const side of [-1, 1]) {
      batch.box(len, 1.8, 1.8, 0x8aa59c, (xa + xb) / 2, (ya + yb) / 2, cz + side * 8.5, 0, 0, Math.atan2(yb - ya, xb - xa));
    }
  }
  for (let x = x0 + 16; x < x1; x += 16) {
    const h = cableAt(x) - deckY;
    for (const side of [-1, 1]) batch.box(0.7, h, 0.7, 0x8aa59c, x, deckY + h / 2, cz + side * 8.5);
  }
}

// --- Harbour Centre -----------------------------------------------------------

function addHarbourCentre(batch: StaticBatch) {
  const x = 210;
  const z = -30;
  batch.box(44, 24, 44, 0xa7a39b, x, 12, z);
  batch.add(new THREE.CylinderGeometry(5.2, 6.2, 120, 10), 0xc4c8cc, x, 60, z);
  batch.add(new THREE.CylinderGeometry(9, 15, 7, 14), 0x6d8396, x, 122, z);
  batch.add(new THREE.CylinderGeometry(15.5, 15.5, 1.6, 14), 0xf0f0f0, x, 126.4, z);
  batch.add(new THREE.CylinderGeometry(15, 12, 6, 14), 0x4a5f70, x, 130, z);
  batch.add(new THREE.CylinderGeometry(12, 8, 3, 14), 0xc4c8cc, x, 134, z);
  batch.add(new THREE.CylinderGeometry(0.7, 1.2, 34, 6), 0xd8dadc, x, 152, z);
}

// --- Science World ------------------------------------------------------------

function addScienceWorld(batch: StaticBatch) {
  const x = 330;
  const z = 190;
  batch.box(340, 0.4, 210, 0x2f7ea8, x, 0.2, z);
  batch.box(90, 1.2, 80, 0xbfc4c8, x, 0.8, z);
  const dome = new THREE.IcosahedronGeometry(34, 2);
  batch.add(dome, 0xe6ecef, x, 36, z);
  batch.add(new THREE.CylinderGeometry(35, 36, 6, 18), 0x98a4ad, x, 4.2, z);
  batch.add(new THREE.CylinderGeometry(0.5, 0.8, 24, 6), 0xd0d4d6, x, 76, z);
}
