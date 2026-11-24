import { ROSTER } from '../entities/roster';
import type { GameVariant } from './types';

export const cltVariant: GameVariant = {
  id: 'clt',
  documentTitle: 'Fun CLTy',
  titleHtml: 'Fun <em>CLTy</em>',
  tagline: 'Quest for the North Star',
  roster: ROSTER,
  vee: {
    start: `How do you do, fellow skaters? I'm Vee. Matthew will drop the real Fun CLTy copy here soon.

For now: skate this block, collect North Stars, and try not to think too hard about why you only need nine of ten.

Phase MVP — placeholder until the wordsmiths return from their offsite.`,

    rsp: `Placeholder — RSP unlock copy coming from Matthew.

The colourful block is real even if this speech isn't.`,

    season1: `Placeholder — Season 1 copy coming from Matthew.

Seasonal content: still mostly vibes.`,
  },
  progression: {
    mvp: 'Phase: MVP',
    rsp: 'Phase: RSP',
    season: (n) => `Season: ${n}`,
  },
  collect: {
    specs: [{ id: 'star', label: 'North Stars', goal: 9, cap: 10 }],
    perType: 10,
    completeAt: 9,
  },
};