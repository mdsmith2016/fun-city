import type { Appearance } from '../entities/skaterModel';
import type { CollectType } from '../game/collectIcons';

export type VeeEvent = 'start' | 'rsp' | 'season1';

export interface ProgressionLabels {
  mvp: string;
  rsp: string;
  season: (n: number) => string;
}

export interface CollectSpec {
  id: CollectType;
  label: string;
  /** HUD treats this type as done at or above this count. */
  goal: number;
  /** HUD shows collected/cap (e.g. 9/10 — you never need cap). */
  cap: number;
}

export interface CollectRules {
  specs: readonly CollectSpec[];
  /** How many of each spec id to spawn in the level. */
  perType: number;
  /** Total collected across all types to advance the phase. */
  completeAt: number;
}

export interface GameVariant {
  readonly id: 'funCity' | 'clt';
  readonly documentTitle: string;
  readonly titleHtml: string;
  readonly tagline: string;
  readonly roster: readonly Appearance[];
  readonly vee: Record<VeeEvent, string>;
  readonly progression: ProgressionLabels;
  readonly collect: CollectRules;
  /** Mobile attract overlay bottom line (includes the rotating skater name). */
  readonly attractBottom: (skaterDisplayName: string) => string;
}