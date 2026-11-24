import { cltVariant } from './clt';
import { funCityVariant } from './funCity';
import type { GameVariant } from './types';

export type { GameVariant, VeeEvent, CollectRules, ProgressionLabels } from './types';

/** Fun City at site root; Fun CLTy under `/CLT` or `/CLT/` (case-sensitive). */
export function detectVariantId(): 'funCity' | 'clt' {
  const p = window.location.pathname;
  if (p.includes('/CLT/') || p.endsWith('/CLT')) return 'clt';
  return 'funCity';
}

let active: GameVariant | null = null;

export function getVariant(): GameVariant {
  if (!active) active = detectVariantId() === 'clt' ? cltVariant : funCityVariant;
  return active;
}