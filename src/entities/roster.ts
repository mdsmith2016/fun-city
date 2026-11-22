import type { Appearance } from './skaterModel';

/** Four placeholder skaters until the real roster is defined. */
export const ROSTER: Appearance[] = [
  {
    name: 'Jay',
    gender: 'male',
    blurb: 'Backwards cap, red hoodie, jeans.',
    skin: 0xc68e6a,
    hair: 0x1c1a1a,
    hairStyle: 'short',
    cap: 0x23252b,
    top: 0xc0392b,
    topStyle: 'hoodie',
    bottom: 0x3b5b8c,
    bottomStyle: 'jeans',
    shoes: 0xf2f2f2,
    board: 0xe9c46a,
  },
  {
    name: 'Finn',
    gender: 'male',
    blurb: 'Long blond hair, teal tee, khaki shorts.',
    skin: 0xf0c8a0,
    hair: 0xdbb869,
    hairStyle: 'long',
    top: 0x2a9d8f,
    topStyle: 'tee',
    bottom: 0xc2a878,
    bottomStyle: 'shorts',
    shoes: 0x2b2d33,
    board: 0x264653,
  },
  {
    name: 'Mia',
    gender: 'female',
    blurb: 'Red ponytail, yellow long-sleeve, black jeans.',
    skin: 0xe8b894,
    hair: 0xb5472a,
    hairStyle: 'ponytail',
    top: 0xf2cc4a,
    topStyle: 'longsleeve',
    bottom: 0x2b2b33,
    bottomStyle: 'jeans',
    shoes: 0xd9534f,
    board: 0xe76f51,
  },
  {
    name: 'Zoe',
    gender: 'female',
    blurb: 'Short blue bob, white tee, denim skirt.',
    skin: 0x8d5a3c,
    hair: 0x3b82f6,
    hairStyle: 'bob',
    top: 0xf1f1ee,
    topStyle: 'tee',
    bottom: 0x4a6fa5,
    bottomStyle: 'skirt',
    shoes: 0x3a8f5a,
    board: 0x9b5de5,
  },
];

/**
 * A new wardrobe for the same skater: every clothing item is drawn independently at random from the whole
 * roster's pieces and colours, so outfits are deliberately uncoordinated. Body, hair and board stay.
 */
export function randomWardrobe(base: Appearance): Appearance {
  const pick = <T>(of: (a: Appearance) => T): T => of(ROSTER[Math.floor(Math.random() * ROSTER.length)]);
  return {
    ...base,
    cap: pick((a) => a.cap),
    top: pick((a) => a.top),
    topStyle: pick((a) => a.topStyle),
    bottom: pick((a) => a.bottom),
    bottomStyle: pick((a) => a.bottomStyle),
    shoes: pick((a) => a.shoes),
  };
}
