import * as THREE from 'three';
import { createRenderer, handleResize } from './core/renderer';
import { addDefaultLights, createCamera, createScene } from './core/scene';
import { GameLoop } from './core/loop';
import { Keyboard } from './input/keyboard';
import { DebugOverlay } from './debug/overlay';
import { lowPolyMesh } from './utils/lowpoly';
import { PlaceholderCube } from './entities/placeholderCube';

const container = document.getElementById('app')!;
const renderer = createRenderer(container);
const scene = createScene();
const camera = createCamera();
handleResize(container, renderer, camera);
addDefaultLights(scene);

const keys = new Keyboard();
const debug = new DebugOverlay(renderer);

// --- PLACEHOLDER SCENE (delete when real content arrives) ---
const ground = lowPolyMesh(new THREE.PlaneGeometry(60, 60), 0x7a9e7e, { castShadow: false });
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const cube = new PlaceholderCube();
scene.add(cube.mesh);
// ------------------------------------------------------------

const loop = new GameLoop({
  update(dt) {
    if (keys.justPressed('Backquote')) debug.toggle();
    cube.update(dt, keys);
    // Edges must only be seen by one fixed step.
    keys.endFrame();
  },
  render(alpha, frameDt) {
    cube.render(alpha);
    debug.set('pos', `${cube.mesh.position.x.toFixed(1)}, ${cube.mesh.position.z.toFixed(1)}`);
    renderer.render(scene, camera);
    debug.update(frameDt);
  },
});
loop.start();
