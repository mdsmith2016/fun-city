import type * as THREE from 'three';

export type SurfaceKind = 'rail' | 'ledge' | 'wall' | 'bench' | 'curb' | 'barrier';

/** A grindable/slideable thing: a line segment on the ground plane with a width and a flat top at height `top`. */
export interface Obstacle {
  kind: SurfaceKind;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  len: number;
  /** Unit direction a -> b. */
  dx: number;
  dz: number;
  /** Half width across the segment. */
  hw: number;
  top: number;
}

/** Solid round thing (tree, lamp post) that blocks ground movement. */
export interface CircleCollider {
  x: number;
  z: number;
  r: number;
  height: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface World {
  group: THREE.Group;
  /** Colliders of everything currently unlocked (reassigned when a level unlocks). */
  obstacles: Obstacle[];
  circles: CircleCollider[];
  /** Mutated in place as the playable area grows. */
  bounds: Bounds;
  spawn: { x: number; z: number; heading: number };
  readonly levelCount: number;
  /** How many levels are unlocked (1..levelCount). */
  readonly unlocked: number;
  /** Which level (1 = furthest from the water) a z coordinate falls in. */
  levelAt(z: number): number;
  /** Unlock the next level. False if everything is already unlocked. */
  unlockNext(): boolean;
  /** Animate fires and the barriers coming down. */
  update(dt: number, time: number): void;
}
