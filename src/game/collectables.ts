import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CircleCollider, Obstacle } from '../world/types';
import { COLLECT_TYPES, drawIcon, type CollectType } from './collectIcons';

/** How many of each type a level holds. */
export const PER_TYPE = 4;
export const TOTAL = PER_TYPE * COLLECT_TYPES.length;

/** Of the 12, this many sit on skatable objects; the rest float at ollie height in open ground. */
const ON_OBJECT = 8;

const ICON_SIZE = 1.3;
/** Centre height above an obstacle top: you only reach it by grinding it (or ollieing right over it). */
const GRIND_LIFT = 1.3;
/** Centre height over open ground: needs a proper ollie. */
const OLLIE_HEIGHT = 2.3;
/** Collect if the item is within this horizontally of the skater and this far from the skater's torso centre. */
const REACH_XZ = 0.95;
const REACH_Y = 0.7;
const TORSO_Y = 1.0;
const MIN_SPACING = 4;
const POP_TIME = 0.28;
const ON_OBJECT_KINDS = new Set(['rail', 'ledge', 'wall', 'bench']);

export interface LevelPlacement {
  obstacles: readonly Obstacle[];
  circles: readonly CircleCollider[];
  dz: number;
}

interface Item {
  type: CollectType;
  slot: number;
  x: number;
  y: number;
  z: number;
  phase: number;
  /** -1 while idle, otherwise seconds into the pop animation. */
  pop: number;
  gone: boolean;
}

const shuffle = <T>(list: T[]): T[] => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

function distToSegment(o: Obstacle, x: number, z: number): number {
  const t = Math.max(0, Math.min(o.len, (x - o.ax) * o.dx + (z - o.az) * o.dz));
  return Math.hypot(x - (o.ax + o.dx * t), z - (o.az + o.dz * t));
}

/**
 * Twelve spinning, bobbing 2D icons: four each of three types. Rendered as one instanced plane mesh per type.
 * Placement is random but reachable: mostly along rails/ledges/walls/benches at grind height, a few over open ground.
 */
export class Collectables {
  readonly group = new THREE.Group();
  readonly counts: Record<CollectType, number> = { jira: 0, clock: 0, miro: 0 };

  private readonly meshes = {} as Record<CollectType, THREE.InstancedMesh>;
  private items: Item[] = [];
  private hold = 0;
  private time = 0;

  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor() {
    // Two back-to-back planes so the art reads the right way round from both sides while it spins.
    const geo = mergeGeometries([
      new THREE.PlaneGeometry(ICON_SIZE, ICON_SIZE),
      new THREE.PlaneGeometry(ICON_SIZE, ICON_SIZE).rotateY(Math.PI),
    ])!;
    for (const type of COLLECT_TYPES) {
      const tex = new THREE.CanvasTexture(drawIcon(type, 256));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.45 });
      const mesh = new THREE.InstancedMesh(geo, mat, PER_TYPE);
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.meshes[type] = mesh;
      this.group.add(mesh);
    }
    this.group.visible = false;
  }

  get collected(): number {
    return COLLECT_TYPES.reduce((n, t) => n + this.counts[t], 0);
  }

  get complete(): boolean {
    return this.collected >= TOTAL;
  }

  /** Remove everything (between runs). */
  clear(): void {
    this.items = [];
    for (const t of COLLECT_TYPES) {
      this.counts[t] = 0;
      this.meshes[t].count = 0;
    }
    this.group.visible = false;
  }

  /**
   * Drop a fresh set of 12 on a level and reset the counts. `holdFor` keeps them hidden and uncollectable for a
   * moment (while the level they're on is still rising out of the ground).
   */
  place(level: LevelPlacement, avoid: Array<{ x: number; z: number }> = [], holdFor = 0): void {
    this.clear();
    const spots = this.pickSpots(level, avoid);
    const types = shuffle(COLLECT_TYPES.flatMap((t) => Array<CollectType>(PER_TYPE).fill(t)));
    const slots: Record<CollectType, number> = { jira: 0, clock: 0, miro: 0 };
    spots.forEach((spot, i) => {
      const type = types[i];
      this.items.push({ type, slot: slots[type]++, ...spot, phase: Math.random() * Math.PI * 2, pop: -1, gone: false });
    });
    for (const t of COLLECT_TYPES) this.meshes[t].count = slots[t];
    this.hold = holdFor;
    this.group.visible = holdFor <= 0;
    this.writeMatrices();
  }

  private pickSpots(level: LevelPlacement, avoid: Array<{ x: number; z: number }>) {
    const spots: Array<{ x: number; y: number; z: number }> = [];
    const free = (x: number, z: number) =>
      spots.every((s) => Math.hypot(s.x - x, s.z - z) > MIN_SPACING) &&
      avoid.every((a) => Math.hypot(a.x - x, a.z - z) > MIN_SPACING);

    // On objects: random obstacles, random point along each, at grind height. Long ones can take a second pass.
    const objects = shuffle(level.obstacles.filter((o) => ON_OBJECT_KINDS.has(o.kind)));
    for (let pass = 0; pass < 2 && spots.length < ON_OBJECT; pass++) {
      for (const o of objects) {
        if (spots.length >= ON_OBJECT) break;
        if (pass === 1 && o.len < 10) continue;
        const t = o.len * (0.2 + Math.random() * 0.6);
        const x = o.ax + o.dx * t;
        const z = o.az + o.dz * t;
        if (free(x, z)) spots.push({ x, y: o.top + GRIND_LIFT, z });
      }
    }

    // Open ground at ollie height, clear of every collider so nothing blocks the approach.
    for (let tries = 0; tries < 600 && spots.length < TOTAL; tries++) {
      const x = (Math.random() * 2 - 1) * 54;
      const z = level.dz + -36 + Math.random() * 74;
      if (!free(x, z)) continue;
      if (level.obstacles.some((o) => distToSegment(o, x, z) < o.hw + 2)) continue;
      if (level.circles.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 2.5)) continue;
      spots.push({ x, y: OLLIE_HEIGHT, z });
    }
    return spots;
  }

  /** Types collected this frame by a skater at (x, y, z), where y is the board height. */
  collect(x: number, y: number, z: number): CollectType[] {
    if (this.hold > 0) return [];
    const got: CollectType[] = [];
    for (const it of this.items) {
      if (it.gone || it.pop >= 0) continue;
      if (Math.hypot(it.x - x, it.z - z) > REACH_XZ) continue;
      if (Math.abs(it.y - (y + TORSO_Y)) > REACH_Y) continue;
      it.pop = 0;
      this.counts[it.type]++;
      got.push(it.type);
    }
    return got;
  }

  update(dt: number): void {
    this.time += dt;
    if (this.hold > 0) {
      this.hold -= dt;
      if (this.hold <= 0) this.group.visible = true;
    }
    for (const it of this.items) {
      if (it.pop >= 0 && !it.gone) {
        it.pop += dt;
        if (it.pop >= POP_TIME) it.gone = true;
      }
    }
    if (this.group.visible) this.writeMatrices();
  }

  private writeMatrices(): void {
    const { m, q, p, s, up } = this;
    for (const it of this.items) {
      const mesh = this.meshes[it.type];
      let scale = 1;
      let spin = this.time * 0.9 + it.phase;
      let bob = Math.sin(this.time * 1.7 + it.phase) * 0.08;
      if (it.gone) {
        scale = 0;
      } else if (it.pop >= 0) {
        const k = it.pop / POP_TIME;
        // Swell then vanish, spinning up as it goes.
        scale = k < 0.4 ? 1 + (k / 0.4) * 0.55 : 1.55 * (1 - (k - 0.4) / 0.6);
        spin += k * 9;
        bob += k * 0.25;
      }
      q.setFromAxisAngle(up, spin);
      p.set(it.x, it.y + bob, it.z);
      s.setScalar(Math.max(scale, 0.0001));
      mesh.setMatrixAt(it.slot, m.compose(p, q, s));
    }
    for (const t of COLLECT_TYPES) this.meshes[t].instanceMatrix.needsUpdate = true;
  }
}
