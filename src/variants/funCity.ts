import { ROSTER } from '../entities/roster';
import { COLLECT_LABELS, COLLECT_TYPES } from '../game/collectIcons';
import type { GameVariant } from './types';

export const funCityVariant: GameVariant = {
  id: 'funCity',
  documentTitle: 'Fun City',
  titleHtml: 'Fun <em>City</em>',
  tagline: 'A roadmap planning simulator',
  roster: ROSTER,
  vee: {
    start: `How do you do, fellow skaters? I'm Vee, and I'll be here to guide you through literally every single goddamn second of this crazy adventure.

This is Fun City - it's not much yet, but give it 4 years and a complete lack of creative alignment and we'll have something that resembles a game in no time.

But it won't get better by itself - you need to do the key game development work - collecting Jira tickets, providing time estimates, and making Miro boards.

Do enough busy work and the next milestone will open up!

This first phase is MVP - Maximum Viable Planning - we literally couldn't do more planning.`,

    rsp: `Well done!

We've made a world that looks like a passable game from 15 years ago!

This is where the real work begins - RSP - Ready to Scale Product.

Complete this and we will scale the team down to a laughably small size.

Sorry if there was any confusion on what "scaling" meant.`,

    season1: `Congratulations! We've not really changed much, but we're going to launch anyway! Now the real work begins - making seasonal content.

Remember - don't worry too much about what it is (I hear the kidz love unbranded black t-shirts!) - just focus on the time estimates and the miro boards and the creativity will look after itself!

Now go out there and capture some footy - it's short for soccer.`,
  },
  progression: {
    mvp: 'Phase: MVP',
    rsp: 'Phase: RSP',
    season: (n) => `Season: ${n}`,
  },
  collect: {
    specs: COLLECT_TYPES.map((id) => ({ id, label: COLLECT_LABELS[id], goal: 4, cap: 4 })),
    perType: 4,
    completeAt: 12,
  },
};