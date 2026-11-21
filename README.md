# skate

Bare framework for a lightweight browser three.js demo game: keyboard controls, low-poly, no textures, all art built in code. **No game content yet** — the scene is a placeholder.

## Run

Requires Node 20.19+ (developed on Node 25).

```sh
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run preview    # serve dist/
npm run typecheck  # tsc only
```

Placeholder controls: **WASD / arrow keys** move the cube, **`** (backtick) toggles the debug overlay.

## Layout

```
index.html               page shell, mounts #app
vite.config.ts
src/
  main.ts                bootstrap: wires renderer, scene, input, loop; holds the placeholder scene
  core/
    renderer.ts          WebGLRenderer (shadows on, sRGB) + resize handling
    scene.ts             scene/fog, camera, default hemisphere + shadow-casting sun
    loop.ts              fixed-timestep loop (60 Hz update, interpolated render)
  input/
    keyboard.ts          isDown / justPressed / justReleased / axis, keyed by KeyboardEvent.code;
                         edges cleared via endFrame(); releases all keys on window blur
  entities/
    placeholderCube.ts   PLACEHOLDER — delete once there's a premise
  debug/
    overlay.ts           FPS / frame ms / draw calls / tris + custom lines
  utils/
    lowpoly.ts           flat-shaded MeshStandardMaterial cache, lowPolyMesh(), jitter(), seeded PRNG
    math.ts              clamp, lerp, frame-rate independent damp
```

## Conventions

- Game logic goes in `update(dt)` (fixed `dt`), visuals in `render(alpha)`. Entities keep previous and current state and lerp by `alpha`.
- Keys use `KeyboardEvent.code` (`'KeyW'`, `'ArrowUp'`, `'Space'`, `'Backquote'`), so they're layout independent.
- Art: geometry primitives + `lowPolyMesh(geometry, color)`. Materials are shared per colour.
