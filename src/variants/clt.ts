import { CLT_ROSTER } from './cltRoster';
import type { GameVariant } from './types';

export const cltVariant: GameVariant = {
  id: 'clt',
  documentTitle: 'Fun CLTy',
  titleHtml: 'Fun <em>CLTy</em>',
  tagline: 'Quest for the North Star',
  roster: CLT_ROSTER,
  vee: {
    start: `How do you do, fellow skaters?

I'm Vee, and I'll be here to guide you through literally every single goddamn second of this crazy adventure.

This is Fun City - it's not much yet, but give it 4 years and a complete lack of alignment between executives, and we'll have something that resembles a game in no time.

But it won't get better by itself - you need to fight the executive disconnect and chase after a unifying North Star.

This first phase is MVP - Maximum Viable Planning - we literally couldn't do more planning.

Collect enough stars to align on a vision in time and we might yet make a coherent game!

Song of the day: Start Me Up, by The Rolling Stones`,

    rsp: `Uh oh, you ran out of time just before that phase ended - better start all over again on the North Star.
But the good news is we made a world that looks like a passable game from 15 years ago!

This is where the real work begins - RSP - Ready to Scale Product.

Complete this and we will scale the team down to a laughably small size.

Sorry if there was any confusion on what "scaling" meant. Blame Production - you know I do!

But we can't get there without a North Star - go get those stars, team!
Song of the day: The Final Countdown, by Europe`,

    season1: `Oopsies - you didn't quite get enough stars.

But the good news is even though not much has changed, we're going to launch anyway! Now the real work begins - chasing a North Star while making seasonal content.

Remember - don't worry too much about what content we make (I hear the kidz love unbranded black t-shirts!) - just focus on chasing the North Star and everything will be ok!

Now go out there and capture some footy - it's short for soccer.

Song of the day: Deja Vu, by Beyonce`,
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
  attractBottom: (name) => `CHASE THE NORTH STAR ${name}`,
};