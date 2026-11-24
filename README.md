# Fun City

A roadmap planning simulator

A small low-poly skateboarding demo in the browser: pick a skater, free-ride one small city block, ollie onto rails/ledges/benches, chain tricks into lines. Vite + TypeScript + three.js. Keyboard only, no textures, no assets, all art built in code. In-jokes for some of the skate dev-team - all meant in jest for wonderful people.

## Run

Requires Node 20.19+ (developed on Node 25).

```sh
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run preview    # serve dist/
npm run typecheck  # tsc only
```

`dist/` is a plain static site with relative asset paths: drop it in any folder or GitHub Pages subpath, players need nothing installed. (It must be served over http, not opened from `file://`, because browsers block module scripts there.)

## Controls

| Key | Action |
| --- | --- |
| `W` | push (hold to speed up) |
| `S` | brake |
| `A` / `D` | steer |
| `Space` | ollie (also hops off a grind) |
| `C` | kickflip |
| `V` | heelflip |
| `B` | pop shove-it |
| `N` | impossible |
| `M` | 360 spin |
| `Esc` | pause menu (resume / back to character select) |
| `U` | debug: complete the current level/season |
| `Enter` | dismiss Vee's message box |
| `` ` `` | debug overlay (fps, draw calls, speed) |

Menus: `Enter`/`Space` confirm, `A`/`D` pick a skater, `W`/`S` move in the pause menu. Mouse works on the buttons too. Arrow keys mirror WASD.

Air tricks are scored when you land. Landing on a rail/ledge/wall/bench/curb/barrier sticks automatically: rails give grinds (50-50, Nosegrind, 5-0, Boardslide, Lipslide), everything else gives slides ("Bench Boardslide", "Curb Slide", ...) named from your approach angle and side. Landings never fail.

Scoring: each new trick bumps the multiplier (x1 -> x1.5 -> x2 ... max x5), repeats are worth half, grinds pay per second. A line ends after ~2.4s on the ground without scoring and its total banks into your score.

## Levels and progression

Two blocks share one layout (`level.ts`) and sit in a line toward the water. **Phase: MVP** is the grey block (every colour collapsed to grey, props reduced to plain boxes); **Phase: RSP** is the colourful block that meets the seawall. Until RSP unlocks, MVP's water-facing edge is closed by construction barriers and "ROADMAP UNDER CONSTRUCTION" signs, with unfinished roads fading out beyond them. Unlocking sinks the barriers for good and raises the RSP block; you can skate back and forth freely.

Each block holds 12 collectables: 4 Jira logos, 4 clocks (time estimates) and 4 Miro post-its, spinning and bobbing. About two thirds sit at grind height above rails/ledges/walls/benches (collect them mid-grind); the rest float at ollie height over open ground. Positions are random every time they are placed. Collect all 12 in MVP to unlock RSP. Completing RSP starts **Season: 1**, then 2, 3... Each season re-randomises the collectables in the RSP block, resets the counts, and gives the skater a random wardrobe (each clothing item drawn independently from every roster piece/colour; hair, body and board stay). The label at top centre tracks progression; the top-right HUD shows each type's count out of 4.

Vee (a black circle with a red eye and a smile) pauses the game with a message box at the start of each run, when RSP unlocks, and when Season 1 starts. `Enter` dismisses it. Her lines live in `src/game/vee.ts`.

Debug: `U` completes the current block as if everything were collected. Nothing is saved; each run starts at MVP. The collectable icons are drawn in `src/game/collectIcons.ts` (swap a draw function for `drawImage` to use real art).

## Layout

```
index.html               page shell, mounts #app
vite.config.ts           relative base, chunk warning limit
src/
  main.ts                bootstrap (exposes window.__game in dev only)
  core/
    renderer.ts          WebGLRenderer + resize
    scene.ts             scene/fog/camera, hemisphere + shadow-casting sun that follows the player
    loop.ts              fixed-timestep loop (60 Hz update, interpolated render)
    quality.ts           adaptive pixel ratio to hold ~30fps on weak GPUs
  input/keyboard.ts      polled keyboard: isDown / justPressed / justReleased / axis; releases on blur
  game/
    game.ts              state machine: title -> select -> playing <-> paused/Vee message; wires everything
    collectables.ts      the 12 instanced icons: placement, bobbing, pickup
    collectIcons.ts      canvas art for Jira / clock / Miro icons
    progression.ts       Phase MVP -> Phase RSP -> Season N label/state
    vee.ts               Vee's placeholder messages
    select.ts            character-select stage (3D line-up of the roster)
    followCamera.ts      third-person chase camera
    tricks.ts            five air tricks + grind/slide classification and names
    scoring.ts           score, combo multiplier, line total/banking
  entities/
    skaterModel.ts       low-poly skater + board from boxes, procedural pose (2-bone leg IK)
    roster.ts            the 18 skaters (fixed, pre-shuffled order; per-skater options are listed at the top of the file)
    player.ts            arcade physics: ground / air / grind modes, collisions, animation state
  world/
    level.ts             the one block layout (ground, plaza, rails/ledges/walls/benches, trees, lamps, perimeter) + grey/colour options
    world.ts             assembles the two levels in a line, unlocking/reset, bounds/colliders
    gate.ts              construction barriers, canvas-texture signs, fading roads
    skyline.ts           sky, water, mountains, Canada Place, Lions Gate Bridge, Harbour Centre, Science World
    types.ts             Obstacle / World types
  ui/
    ui.ts, style.css     HTML/CSS overlays: title, select, pause, HUD
  debug/overlay.ts       fps / draw calls / triangles overlay
  utils/
    batch.ts             StaticBatch: merge many coloured primitives into one mesh
    lowpoly.ts           flat-shaded material cache, jitter(), seeded PRNG
    math.ts              clamp, lerp, damp, angle helpers
```

## Notes

- World is flat (y = 0). Obstacles are line segments with a width and a flat top; grind/slide capture, ground collision and bounds are all simple 2D checks in `player.ts`. No physics library.
- Static art is merged per category (ground, props, buildings, backdrop) so a frame is ~75 draw calls, most of them the skater and its shadow.
- Placeholder content: skater names/outfits, the title "Fun City", and the world layout are all easy to swap (`roster.ts`, `ui.ts`, `world.ts` `buildProps`).
