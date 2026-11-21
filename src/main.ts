import { createRenderer, handleResize } from './core/renderer';
import { addDefaultLights, createCamera, createScene } from './core/scene';
import { AdaptiveResolution } from './core/quality';
import { GameLoop } from './core/loop';
import { Keyboard } from './input/keyboard';
import { DebugOverlay } from './debug/overlay';
import { buildWorld } from './world/world';
import { buildBackdrop } from './world/skyline';

const container = document.getElementById('app')!;
const renderer = createRenderer(container);
const scene = createScene();
const camera = createCamera();
handleResize(container, renderer, [camera]);
const lights = addDefaultLights(scene);
const quality = new AdaptiveResolution(renderer);

const world = buildWorld();
const backdrop = buildBackdrop();
scene.add(world.group, backdrop.group);

const keys = new Keyboard();
const debug = new DebugOverlay(renderer);
let time = 0;

const loop = new GameLoop({
  update(dt) {
    time += dt;
    if (keys.justPressed('Backquote')) debug.toggle();
    keys.endFrame();
  },
  render(_alpha, frameDt) {
    const a = Math.sin(time * 0.15) * 0.7;
    camera.position.set(-8, 3.5, 18);
    camera.lookAt(-8 + Math.sin(a) * 100, 22, 18 - Math.cos(a) * 100);
    lights.follow(-8, 0, 0);
    backdrop.followCamera(camera.position);
    renderer.render(scene, camera);
    quality.update(frameDt);
    debug.update(frameDt);
  },
});
loop.start();
