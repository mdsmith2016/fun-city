import * as THREE from 'three';
import { StaticBatch } from '../utils/batch';
import { buildGate } from './gate';
import { buildLevel, type LevelBuild, type LevelOptions } from './level';
import type { Bounds, World } from './types';

/** Distance between consecutive blocks (north edge z -42 to south edge z 44 of a block). */
const LEVEL_SPACING = 86;
const HALF_WIDTH = 59;
const NORTH_EDGE = -42;
const BOUNDS_INSET = 1;

/**
 * Two blocks in a line toward the water. Level 1 (grey box, "MVP") is the furthest away; level 2 (colourful,
 * "RSP") is the one that meets the seawall. Both share one layout (see level.ts) and differ by options only.
 */
const LEVELS: LevelOptions[] = [
  { theme: 'grey', north: 'open', south: 'buildings', dz: LEVEL_SPACING },
  { theme: 'colour', north: 'seawall', south: 'open', dz: 0 },
];

const RISE_DEPTH = 8;
const RISE_TIME = 1.1;
const DROP_TIME = 0.9;

export function buildWorld(): World {
  const group = new THREE.Group();

  const ground = new StaticBatch();
  ground.box(6000, 0.1, 3000, 0x8b8d8a, 0, -0.1, 1500 - 44);
  group.add(ground.build({ receive: true }));

  // Locked levels stay built but invisible: they cost nothing to draw until they unlock.
  const built: LevelBuild[] = LEVELS.map((opts) => buildLevel(opts));
  for (const l of built) {
    l.group.visible = false;
    group.add(l.group);
  }

  const gate = buildGate(HALF_WIDTH);
  group.add(gate.group);

  const obstacles: World['obstacles'] = [];
  const circles: World['circles'] = [];
  const initialBounds = (): Bounds => ({
    minX: -HALF_WIDTH,
    maxX: HALF_WIDTH,
    minZ: 0,
    maxZ: LEVELS[0].dz + 44 - BOUNDS_INSET,
  });
  const bounds: Bounds = initialBounds();
  let unlocked = 0;
  let rising: { group: THREE.Group; t: number } | null = null;
  let dropT = -1;

  const edgeZ = (levelIndex: number) => LEVELS[levelIndex].dz + NORTH_EDGE;

  const placeGate = () => {
    gate.group.visible = unlocked < LEVELS.length;
    gate.group.position.set(0, 0, edgeZ(unlocked - 1));
    gate.barriers.position.y = 0;
    gate.roads.visible = true;
  };

  const reveal = (index: number) => {
    const l = built[index];
    l.group.visible = true;
    obstacles.push(...l.obstacles);
    circles.push(...l.circles);
    bounds.minZ = edgeZ(index) + BOUNDS_INSET;
    unlocked = index + 1;
  };

  reveal(0);
  placeGate();

  const world: World = {
    group,
    obstacles,
    circles,
    bounds,
    spawn: { x: -18, z: LEVELS[0].dz + 12, heading: Math.PI },
    levelCount: LEVELS.length,
    levelData: built.map((l, i) => ({ obstacles: l.obstacles, circles: l.circles, dz: LEVELS[i].dz })),
    get unlocked() {
      return unlocked;
    },
    get gateZ() {
      return edgeZ(unlocked - 1);
    },
    levelAt(z: number) {
      const k = Math.floor((z - NORTH_EDGE) / LEVEL_SPACING);
      return Math.min(LEVELS.length, Math.max(1, LEVELS.length - k));
    },
    reset() {
      obstacles.length = 0;
      circles.length = 0;
      for (const l of built) {
        l.group.visible = false;
        l.group.position.y = 0;
      }
      rising = null;
      dropT = -1;
      Object.assign(bounds, initialBounds());
      reveal(0);
      placeGate();
    },
    unlockNext() {
      if (unlocked >= LEVELS.length) return false;
      reveal(unlocked);
      const l = built[unlocked - 1];
      l.group.position.y = -RISE_DEPTH;
      rising = { group: l.group, t: 0 };
      // Roads are now complete (the new block is their other half); the barriers sink out of the way.
      gate.roads.visible = false;
      dropT = 0;
      return true;
    },
    update(dt) {
      if (rising) {
        rising.t += dt;
        const k = Math.min(1, rising.t / RISE_TIME);
        rising.group.position.y = -RISE_DEPTH * Math.pow(1 - k, 3);
        if (k >= 1) rising = null;
      }
      if (dropT >= 0) {
        dropT += dt;
        const k = Math.min(1, dropT / DROP_TIME);
        gate.barriers.position.y = -3 * k * k;
        if (k >= 1) {
          dropT = -1;
          placeGate();
        }
      }
    },
  };
  return world;
}
