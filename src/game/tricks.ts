import type { SurfaceKind } from '../world/types';

const TAU = Math.PI * 2;

/** An air trick: a pure board/body animation plus a score. Angles are total rotation over `dur`. */
export interface TrickDef {
  code: string;
  name: string;
  base: number;
  dur: number;
  /** Board roll about its long axis. */
  roll: number;
  /** Board yaw (shove-it). */
  yaw: number;
  /** Board pitch end over end. */
  pitch: number;
  /** Whole rider + board yaw. */
  spin: number;
}

const trick = (code: string, name: string, base: number, patch: Partial<TrickDef>): TrickDef => ({
  code, name, base, dur: 0.5, roll: 0, yaw: 0, pitch: 0, spin: 0, ...patch,
});

export const TRICKS: TrickDef[] = [
  trick('KeyC', 'Kickflip', 100, { roll: TAU }),
  trick('KeyV', 'Heelflip', 100, { roll: -TAU }),
  trick('KeyB', 'Pop Shove-It', 80, { yaw: Math.PI, dur: 0.42 }),
  trick('KeyN', 'Impossible', 140, { pitch: TAU, dur: 0.55 }),
  trick('KeyM', '360 Spin', 120, { spin: TAU, dur: 0.55 }),
];

export type GrindStyle = '5050' | 'nose' | 'tail' | 'board' | 'lip';

export interface GrindInfo {
  name: string;
  style: GrindStyle;
  /** Points for locking it in. */
  base: number;
  /** Points per second while held. */
  rate: number;
}

const SURFACE_LABEL: Record<Exclude<SurfaceKind, 'rail'>, string> = {
  ledge: 'Ledge',
  wall: 'Wall',
  bench: 'Bench',
  chair: 'Chair',
  curb: 'Curb',
  barrier: 'Barrier',
};

/**
 * Name a grind/slide from what you landed on and how.
 * theta: angle between your heading and the surface (0 = along it, PI/2 = across it).
 * side: >0 if you were on the left of the surface (relative to travel), <0 right.
 */
export function classifyGrind(kind: SurfaceKind, theta: number, side: number): GrindInfo {
  const style: GrindStyle = theta < 0.45 ? '5050' : theta < 1.0 ? (side >= 0 ? 'nose' : 'tail') : side >= 0 ? 'board' : 'lip';

  if (kind === 'rail') {
    const names: Record<GrindStyle, string> = {
      '5050': '50-50 Grind',
      nose: 'Nosegrind',
      tail: '5-0 Grind',
      board: 'Boardslide',
      lip: 'Lipslide',
    };
    return { name: names[style], style, base: 100, rate: 90 };
  }

  const label = SURFACE_LABEL[kind];
  const names: Record<GrindStyle, string> = {
    '5050': `${label} Slide`,
    nose: `${label} Noseslide`,
    tail: `${label} Tailslide`,
    board: `${label} Boardslide`,
    lip: `${label} Lipslide`,
  };
  return { name: names[style], style, base: 70, rate: 60 };
}
