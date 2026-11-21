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
  obstacles: Obstacle[];
  circles: CircleCollider[];
  bounds: Bounds;
  spawn: { x: number; z: number; heading: number };
}
