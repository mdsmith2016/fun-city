import * as THREE from 'three';
import { StaticBatch } from '../utils/batch';
import { mulberry32 } from '../utils/lowpoly';
import { buildFires, type FireAnchor, type Fires, type WindowFire } from './fires';
import type { CircleCollider, Obstacle, SurfaceKind } from './types';

/**
 * One city block. There is exactly one layout definition (`buildGround`, `buildProps`, `buildPerimeter`);
 * levels differ only by options:
 *   theme 'grey'   every colour collapses to a grey shade and props drop to plain boxes
 *   theme 'colour' the full-detail block
 *   fire           adds small animated fires near props and burning windows
 *   north/south    what closes the block at each end (seawall, buildings, or open to the neighbouring level)
 * Local coordinates: the block spans x -60..60, z -42..44. The level group is shifted along Z by `dz`.
 */
export interface LevelOptions {
  theme: 'grey' | 'colour';
  north: 'seawall' | 'open';
  south: 'buildings' | 'open';
  fire: boolean;
  dz: number;
}

export interface LevelBuild {
  group: THREE.Group;
  /** Colliders in world coordinates. */
  obstacles: Obstacle[];
  circles: CircleCollider[];
  fires: Fires | null;
}

const icosa = new THREE.IcosahedronGeometry(1, 0);

const C = {
  asphalt: 0x3b3e44,
  asphaltLight: 0x44474d,
  plazaA: 0xcbc8c1,
  plazaB: 0xbebbb4,
  pavement: 0xb2b0aa,
  eastWalk: 0xc4bcad,
  eastWalkB: 0xb8b0a1,
  bikeLane: 0x3fae5c,
  yellow: 0xe3b72d,
  white: 0xeeeeea,
  seawall: 0x6f747a,
  steel: 0xffd23f,
  steelPost: 0x5b626b,
  ledge: 0xd5d0c4,
  ledgeLip: 0x8c8f93,
  wall: 0xa86f5a,
  wallCap: 0xd0c3b3,
  curb: 0xcfcac0,
  barrier: 0xea7a2c,
  barrierBand: 0xf1efe8,
  wood: 0xa06a3c,
  concrete: 0x9a9b9a,
  trunk: 0x6b4a32,
  leaf: 0x5e9f55,
  leafLight: 0x74b862,
  lamp: 0x3a4048,
};

/** Luminance-only version of a hex colour. */
export function toGrey(hex: number): number {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  return (y << 16) | (y << 8) | y;
}

/** Rotation about Y that maps a box's local +X axis onto the world direction (dx, dz). */
const yawForDir = (dx: number, dz: number) => Math.atan2(-dz, dx);

interface Ctx {
  /** Props: cast and receive shadows. */
  solid: StaticBatch;
  /** Ground paint: receives shadows only. */
  ground: StaticBatch;
  /** Perimeter buildings: no shadows, they're outside the shadow box anyway. */
  bldg: StaticBatch;
  /** World-space colliders. */
  obstacles: Obstacle[];
  circles: CircleCollider[];
  dz: number;
  simple: boolean;
  north: LevelOptions['north'];
  south: LevelOptions['south'];
  fire: { anchors: FireAnchor[]; windows: WindowFire[]; rng: () => number } | null;
}

export function buildLevel(opts: LevelOptions): LevelBuild {
  const map = opts.theme === 'grey' ? toGrey : undefined;
  const ctx: Ctx = {
    solid: new StaticBatch(map),
    ground: new StaticBatch(map),
    bldg: new StaticBatch(map),
    obstacles: [],
    circles: [],
    dz: opts.dz,
    simple: opts.theme === 'grey',
    north: opts.north,
    south: opts.south,
    fire: opts.fire ? { anchors: [], windows: [], rng: mulberry32(77) } : null,
  };

  buildGround(ctx);
  buildProps(ctx);
  buildPerimeter(ctx);

  const group = new THREE.Group();
  group.add(ctx.ground.build({ receive: true }));
  group.add(ctx.solid.build({ cast: true, receive: true }));
  group.add(ctx.bldg.build());
  group.position.z = opts.dz;

  let fires: Fires | null = null;
  if (ctx.fire) {
    fires = buildFires(ctx.fire.anchors, ctx.fire.windows);
    group.add(fires.group);
  }

  return { group, obstacles: ctx.obstacles, circles: ctx.circles, fires };
}

// ---------------------------------------------------------------------------
// Ground: plaza, two streets, sidewalks, seawall. Everything is flat at y = 0.
// ---------------------------------------------------------------------------

function slab(ctx: Ctx, x0: number, x1: number, z0: number, z1: number, color: number, y = 0, thick = 0.02) {
  ctx.ground.box(x1 - x0, thick, z1 - z0, color, (x0 + x1) / 2, y - thick / 2, (z0 + z1) / 2);
}

function checker(ctx: Ctx, x0: number, z0: number, nx: number, nz: number, size: number, ca: number, cb: number) {
  if (ctx.simple) {
    slab(ctx, x0, x0 + nx * size, z0, z0 + nz * size, ca);
    return;
  }
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      slab(ctx, x0 + i * size, x0 + (i + 1) * size, z0 + j * size, z0 + (j + 1) * size, (i + j) % 2 ? ca : cb);
    }
  }
}

function buildGround(ctx: Ctx) {
  // Plaza: x -60..20, z -42..22, 8m checker.
  checker(ctx, -60, -42, 10, 8, 8, C.plazaA, C.plazaB);
  slab(ctx, -60, 24, 22, 24, C.pavement);
  slab(ctx, 20, 24, -42, 22, C.pavement);

  // East walkway.
  checker(ctx, 44, -42, 4, 16, 4, C.eastWalk, C.eastWalkB);
  slab(ctx, 44, 60, 20, 24, C.eastWalk);

  // Street B (north-south) and street A (east-west), asphalt.
  slab(ctx, 24, 44, -42, 24, C.asphalt);
  slab(ctx, -60, 60, 24, 42, C.asphalt);
  slab(ctx, 24, 44, 24, 42, C.asphaltLight);
  slab(ctx, 42, 60, 42, 44, C.pavement);
  slab(ctx, -60, 42, 42, 44, C.pavement);

  // Where another block joins on the south side, street B runs straight through the sidewalk strip.
  if (ctx.south === 'open') slab(ctx, 24, 44, 42, 44, C.asphaltLight, 0.012, 0.01);

  if (!ctx.simple) {
    const paint = (x0: number, x1: number, z0: number, z1: number, color: number) =>
      slab(ctx, x0, x1, z0, z1, color, 0.025, 0.01);

    // Street B: double yellow centre, dashed white lane lines.
    paint(33.85, 33.95, -42, 22, C.yellow);
    paint(34.05, 34.15, -42, 22, C.yellow);
    for (let z = -40; z < 20; z += 6) {
      paint(28.9, 29.1, z, z + 3, C.white);
      paint(38.9, 39.1, z, z + 3, C.white);
    }
    // Zebra crossing over street B.
    for (let x = 25; x < 43.5; x += 1.2) paint(x, x + 0.6, 13, 17, C.white);

    // Street A: green bike lane against the curb (the reference screenshot's bike lane), centre line, dashes.
    paint(-60, 24, 24, 26.4, C.bikeLane);
    paint(44, 60, 24, 26.4, C.bikeLane);
    paint(-60, 60, 32.9, 33.0, C.yellow);
    paint(-60, 60, 33.1, 33.2, C.yellow);
    for (let x = -58; x < 58; x += 6) {
      paint(x, x + 3, 28.4, 28.55, C.white);
      paint(x, x + 3, 37.4, 37.55, C.white);
    }
  }

  // Harbourfront seawall. Water itself is part of the backdrop.
  if (ctx.north === 'seawall') ctx.ground.box(120, 1.6, 2.4, C.seawall, 0, -0.8, -43.2);
}

// ---------------------------------------------------------------------------
// Props: obstacles with collision, plus decorative trees and lamps.
// ---------------------------------------------------------------------------

/** Register a collider in world space and return the local-space obstacle used for building visuals. */
function addObstacle(
  ctx: Ctx,
  kind: SurfaceKind,
  ax: number, az: number, bx: number, bz: number,
  hw: number, top: number,
): Obstacle {
  const len = Math.hypot(bx - ax, bz - az);
  const dx = (bx - ax) / len;
  const dz = (bz - az) / len;
  ctx.obstacles.push({ kind, ax, az: az + ctx.dz, bx, bz: bz + ctx.dz, len, dx, dz, hw, top });
  return { kind, ax, az, bx, bz, len, dx, dz, hw, top };
}

function addCircle(ctx: Ctx, x: number, z: number, r: number, height: number) {
  ctx.circles.push({ x, z: z + ctx.dz, r, height });
}

/** Maybe light a small fire. `p` is the chance; sizes vary a little. */
function fireAt(ctx: Ctx, x: number, z: number, p: number) {
  const f = ctx.fire;
  if (!f || f.rng() > p) return;
  f.anchors.push({ x, z, size: 0.7 + f.rng() * 0.7 });
}

/** Fire beside an obstacle, off to one side so the skating line stays clear. */
function fireBeside(ctx: Ctx, o: Obstacle, p: number, gap = 0.55) {
  const f = ctx.fire;
  if (!f) return;
  const side = f.rng() < 0.5 ? -1 : 1;
  const [x, z] = pointOn(o, o.len * (0.15 + f.rng() * 0.7), side * (o.hw + gap));
  fireAt(ctx, x, z, p);
}

/** Box aligned with the segment a->b. `across` is its width, `offset` shifts it sideways (left normal). */
function segBox(
  ctx: Ctx, o: Obstacle, across: number, height: number, yBase: number,
  color: number, offset = 0, extend = 0, shrink = 0,
) {
  const mx = (o.ax + o.bx) / 2 - o.dz * offset;
  const mz = (o.az + o.bz) / 2 + o.dx * offset;
  ctx.solid.box(o.len + extend - shrink, height, across, color, mx, yBase + height / 2, mz, yawForDir(o.dx, o.dz));
}

function pointOn(o: Obstacle, t: number, offset = 0): [number, number] {
  return [o.ax + o.dx * t - o.dz * offset, o.az + o.dz * t + o.dx * offset];
}

function rail(ctx: Ctx, ax: number, az: number, bx: number, bz: number, top = 0.55) {
  const o = addObstacle(ctx, 'rail', ax, az, bx, bz, 0.05, top);
  segBox(ctx, o, 0.07, 0.07, top - 0.07, C.steel);
  const posts = ctx.simple ? 2 : Math.max(2, Math.ceil(o.len / 2.8) + 1);
  for (let i = 0; i < posts; i++) {
    const [x, z] = pointOn(o, (o.len * i) / (posts - 1));
    ctx.solid.box(0.07, top - 0.07, 0.07, C.steelPost, x, (top - 0.07) / 2, z);
    if (!ctx.simple) ctx.solid.box(0.3, 0.03, 0.3, C.steelPost, x, 0.015, z);
  }
  fireBeside(ctx, o, 0.5, 0.9);
}

function ledge(ctx: Ctx, ax: number, az: number, bx: number, bz: number, top = 0.45, hw = 0.4) {
  const o = addObstacle(ctx, 'ledge', ax, az, bx, bz, hw, top);
  segBox(ctx, o, hw * 2, top - 0.02, 0, C.ledge);
  if (!ctx.simple) segBox(ctx, o, hw * 2 + 0.04, 0.05, top - 0.05, C.ledgeLip, 0, 0.04);
  else segBox(ctx, o, hw * 2, 0.02, top - 0.02, C.ledge);
  fireBeside(ctx, o, 0.5);
}

function wall(ctx: Ctx, ax: number, az: number, bx: number, bz: number, top = 0.75, hw = 0.25) {
  const o = addObstacle(ctx, 'wall', ax, az, bx, bz, hw, top);
  segBox(ctx, o, hw * 2, top - 0.02, 0, C.wall);
  if (!ctx.simple) segBox(ctx, o, hw * 2 + 0.06, 0.07, top - 0.07, C.wallCap, 0, 0.06);
  else segBox(ctx, o, hw * 2, 0.02, top - 0.02, C.wall);
  fireBeside(ctx, o, 0.7);
}

function curb(ctx: Ctx, ax: number, az: number, bx: number, bz: number) {
  const o = addObstacle(ctx, 'curb', ax, az, bx, bz, 0.16, 0.25);
  segBox(ctx, o, 0.32, 0.25, 0, C.curb);
}

function barrier(ctx: Ctx, ax: number, az: number, bx: number, bz: number) {
  const o = addObstacle(ctx, 'barrier', ax, az, bx, bz, 0.3, 0.55);
  if (ctx.simple) {
    segBox(ctx, o, 0.6, 0.55, 0, C.barrier);
  } else {
    segBox(ctx, o, 0.6, 0.53, 0, C.barrier);
    segBox(ctx, o, 0.58, 0.02, 0.53, C.barrier);
    segBox(ctx, o, 0.62, 0.14, 0.28, C.barrierBand, 0, 0.02);
  }
  fireBeside(ctx, o, 0.6);
}

function bench(ctx: Ctx, cx: number, cz: number, dirX: number, dirZ: number, len = 2.2) {
  const top = 0.5;
  const hw = 0.28;
  const h = len / 2;
  const o = addObstacle(ctx, 'bench', cx - dirX * h, cz - dirZ * h, cx + dirX * h, cz + dirZ * h, hw, top);
  if (ctx.simple) {
    segBox(ctx, o, hw * 2, top, 0, C.wood);
  } else {
    segBox(ctx, o, hw * 2, 0.07, top - 0.07, C.wood);
    for (const end of [0.25, o.len - 0.25]) {
      const [x, z] = pointOn(o, end);
      ctx.solid.box(0.12, top - 0.07, hw * 2 - 0.06, C.concrete, x, (top - 0.07) / 2, z, yawForDir(o.dx, o.dz));
    }
    segBox(ctx, o, 0.05, 0.36, top, C.wood, -(hw - 0.03));
  }
  const [fx, fz] = pointOn(o, o.len / 2, -(hw + 0.55));
  fireAt(ctx, fx, fz, 0.8);
}

function tree(ctx: Ctx, x: number, z: number, scale = 1) {
  ctx.solid.box(0.24 * scale, 2 * scale, 0.24 * scale, C.trunk, x, scale, z);
  if (ctx.simple) {
    ctx.solid.box(1.8 * scale, 1.6 * scale, 1.8 * scale, C.leaf, x, 2.8 * scale, z);
  } else {
    ctx.solid.add(icosa, C.leaf, x, 3.1 * scale, z, 0.3, 0.5, 0, 1.6 * scale, 1.3 * scale, 1.6 * scale);
    ctx.solid.add(icosa, C.leafLight, x + 0.2 * scale, 4.1 * scale, z - 0.1 * scale, 0.1, 1.2, 0, 1.1 * scale, 1 * scale, 1.1 * scale);
  }
  addCircle(ctx, x, z, 0.45, 3);
  fireAt(ctx, x + 0.9 * scale, z + 0.3, 0.7);
}

function lamp(ctx: Ctx, x: number, z: number, armDx = 0, armDz = 1) {
  ctx.solid.box(0.14, 5.4, 0.14, C.lamp, x, 2.7, z);
  const yaw = yawForDir(armDx, armDz);
  if (ctx.simple) {
    ctx.solid.box(0.5, 0.2, 0.5, C.lamp, x, 5.4, z);
  } else {
    ctx.solid.box(1.3, 0.1, 0.1, C.lamp, x + armDx * 0.6, 5.35, z + armDz * 0.6, yaw);
    ctx.solid.box(0.5, 0.1, 0.25, 0xfff2c0, x + armDx * 1.2, 5.25, z + armDz * 1.2, yaw);
  }
  addCircle(ctx, x, z, 0.2, 5);
  fireAt(ctx, x + 0.5, z + 0.5, 0.5);
}

function buildProps(ctx: Ctx) {
  // --- Plaza rails: a flat bar, a pair, a diagonal, a long one for lines.
  rail(ctx, -48, -5, -30, -5);
  rail(ctx, -22, -32, -22, -14);
  rail(ctx, 2, -24, 14, -12);
  rail(ctx, -44, 14.5, -28, 14.5);
  rail(ctx, -44, 17.5, -32, 17.5, 0.5);

  // --- Plaza ledges: a low one, a taller one, and an L.
  ledge(ctx, -56, -36, -38, -36, 0.45);
  ledge(ctx, -30, -36, -12, -36, 0.6);
  ledge(ctx, 4, -36, 4, -27, 0.45);
  ledge(ctx, 4, -27, 15, -27, 0.45);

  // --- Low walls.
  wall(ctx, -54, -22, -54, -10);
  wall(ctx, -14, 0, -3, 0, 0.7);
  wall(ctx, -10, -22, -10, -14, 0.6);

  // --- Benches.
  bench(ctx, -14, -8, 1, 0);
  bench(ctx, -6, -8, 1, 0);
  bench(ctx, 10, -2, 0, 1);
  bench(ctx, 10, 6, 0, 1);

  // --- Curbs between the plaza/walkways and the streets, with gaps so you can roll across.
  curb(ctx, -58, 24, -12, 24);
  curb(ctx, -4, 24, 22, 24);
  curb(ctx, 24, -40, 24, 2);
  curb(ctx, 24, 8, 24, 22);
  curb(ctx, 44, -40, 44, -6);
  curb(ctx, 44, 0, 44, 22);

  // --- Jersey barriers in street A.
  barrier(ctx, -40, 30, -28, 30);
  barrier(ctx, -22, 36, -12, 36);

  // --- East walkway: rail, ledge, benches.
  rail(ctx, 47, -12, 57, -12);
  ledge(ctx, 47, 8, 58, 8, 0.5);
  bench(ctx, 52, -24, 0, 1);
  bench(ctx, 52, -32, 0, 1);

  // --- Harbourfront ledge doubles as the north boundary, but only where the block meets the water.
  if (ctx.north === 'seawall') {
    ledge(ctx, -57, -39.4, 57, -39.4, 0.5, 0.35);
    for (const x of [-48, -26, 0, 26, 48]) fireAt(ctx, x, -40.6, 0.7);
  }

  // --- Strays: along the building bases and street edges, well off the lines you would skate.
  for (let z = -38; z <= 40; z += 9) {
    fireAt(ctx, -60.6, z, 0.6);
    fireAt(ctx, 60.6, z, 0.6);
  }
  for (let x = -54; x <= 56; x += 11) fireAt(ctx, x, 43, 0.55);

  // --- Decoration with light collision.
  for (const [x, z] of [[-52, 4], [-4, 18], [18, -38], [18, 18], [46, -36], [46, 18], [57, 18], [-56, 20], [-18, 20]]) {
    tree(ctx, x, z, 0.9 + ((x * 7 + z * 3) % 5) * 0.04);
  }
  for (const [x, z] of [[22, -30], [22, -10], [22, 10], [46, -30], [46, -2], [46, 14], [-30, 22], [-6, 22], [-50, 22]]) {
    lamp(ctx, x, z, x > 30 ? -1 : 1, 0);
  }
}

// ---------------------------------------------------------------------------
// Perimeter: buildings closing off the west, east and (for the last block) south sides.
// ---------------------------------------------------------------------------

export function tower(
  batch: StaticBatch,
  cx: number, cz: number, w: number, d: number, h: number,
  body: number, glass: number, floorH = 5, simple = false,
) {
  batch.box(w, h, d, body, cx, h / 2, cz);
  if (simple) return;
  batch.box(w * 0.7, 1.6, d * 0.7, body, cx, h + 0.8, cz);
  for (let y = 3; y < h - 2; y += floorH) {
    batch.box(w + 0.15, floorH * 0.45, d + 0.15, glass, cx, y + floorH * 0.25, cz);
  }
}

type Row = [cx: number, cz: number, w: number, d: number, h: number, body: number];

function buildPerimeter(ctx: Ctx) {
  const glass = 0x394b5c;
  // The north-most ones are low so the skyline shows over them.
  const west: Row[] = [
    [-76, -30, 28, 24, 14, 0xb69a82],
    [-78, -4, 32, 26, 30, 0x8d9aa5],
    [-76, 26, 28, 34, 26, 0xc4b8a4],
  ];
  const east: Row[] = [
    [76, -30, 28, 24, 12, 0x9ba7b0],
    [78, -4, 32, 26, 26, 0xb8a58d],
    [76, 26, 28, 34, 32, 0x8996a2],
  ];
  const south: Row[] = [
    [-44, 58, 32, 28, 28, 0xb0a08a],
    [-10, 60, 34, 32, 36, 0x93a1ad],
    [24, 58, 30, 28, 24, 0xc0b09a],
    [54, 60, 34, 32, 30, 0xa4b0b8],
  ];

  const rows = ctx.south === 'buildings' ? [...west, ...east, ...south] : [...west, ...east];
  for (const [cx, cz, w, d, h, body] of rows) tower(ctx.bldg, cx, cz, w, d, h, body, glass, 5, ctx.simple);

  const f = ctx.fire;
  if (!f) return;
  for (const [list, nx] of [[west, 1], [east, -1]] as const) {
    for (const [cx, cz, w, d, h] of list) {
      const faceX = cx + nx * (w / 2 + 0.075);
      for (let y = 3; y < h - 2; y += 5) {
        for (const k of [-0.25, 0.25]) {
          if (f.rng() > 0.4) continue;
          f.windows.push({ x: faceX, y: y + 1.25, z: cz + k * d + (f.rng() - 0.5) * 4, nx });
        }
      }
    }
  }
}
