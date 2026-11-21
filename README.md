# Fun City

A small low-poly skateboarding demo in the browser: pick a skater, free-ride one small city block, ollie onto rails/ledges/benches, chain tricks into lines. Vite + TypeScript + three.js. Keyboard only, no textures, no assets, all art built in code. Parody of EA's *skate.* (working title).

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
| `` ` `` | debug overlay (fps, draw calls, speed) |

Menus: `Enter`/`Space` confirm, `A`/`D` pick a skater, `W`/`S` move in the pause menu. Mouse works on the buttons too. Arrow keys mirror WASD.

Air tricks are scored when you land. Landing on a rail/ledge/wall/bench/curb/barrier sticks automatically: rails give grinds (50-50, Nosegrind, 5-0, Boardslide, Lipslide), everything else gives slides ("Bench Boardslide", "Curb Slide", ...) named from your approach angle and side. Landings never fail.

Scoring: each new trick bumps the multiplier (x1 -> x1.5 -> x2 ... max x5), repeats are worth half, grinds pay per second. A line ends after ~2.4s on the ground without scoring and its total banks into your score.

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
    game.ts              state machine: title -> select -> playing <-> paused; wires everything
    select.ts            character-select stage (3D line-up of the roster)
    followCamera.ts      third-person chase camera
    tricks.ts            five air tricks + grind/slide classification and names
    scoring.ts           score, combo multiplier, line total/banking
  entities/
    skaterModel.ts       low-poly skater + board from boxes, procedural pose (2-bone leg IK)
    roster.ts            the four placeholder skaters (2 male, 2 female)
    player.ts            arcade physics: ground / air / grind modes, collisions, animation state
  world/
    world.ts             ground, streets, plaza, rails/ledges/walls/benches, trees, lamps, perimeter
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
