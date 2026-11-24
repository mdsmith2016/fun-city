import { cltVariant } from './clt';
import { funCityVariant } from './funCity';
import type { GameVariant } from './types';

export type { GameVariant, VeeEvent, CollectRules, ProgressionLabels } from './types';

/** Fun City at site root; Fun CLTy when the path contains `/CLT/` or ends with `/CLT` (case-insensitive in dev; Pages uses `/CLT/`). */
export function detectVariantId(): 'funCity' | 'clt' {
  const p = window.location.pathname;
  if (/\/CLT\//i.test(p) || /\/CLT$/i.test(p)) return 'clt';
  return 'funCity';
}

let active: GameVariant | null = null;

export function getVariant(): GameVariant {
  if (!active) active = detectVariantId() === 'clt' ? cltVariant : funCityVariant;
  return active;
}