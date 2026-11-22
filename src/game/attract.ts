import * as THREE from 'three';
import { GameLoop } from '../core/loop';
import { createRenderer, handleResize } from '../core/renderer';
import { addDefaultLights, createCamera, createScene } from '../core/scene';
import { Player } from '../entities/player';
import { ROSTER } from '../entities/roster';
import { Keyboard } from '../input/keyboard';
import { buildBackdrop } from '../world/skyline';
import { buildWorld } from '../world/world';
import { TRICKS } from './tricks';

/** Scripted stand-in for the keyboard: presses Space, then a random trick key shortly after, every few seconds. */
class AttractInput extends Keyboard {
  private readonly edges = new Set<string>();
  private timer = 1.2;
  private trickAt = -1;

  constructor() {
    super(new EventTarget() as unknown as Window);
  }

  tick(dt: number): void {
    if (this.trickAt >= 0) {
      this.trickAt -= dt;
      if (this.trickAt < 0) this.edges.add(TRICKS[Math.floor(Math.random() * TRICKS.length)].code);
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      this.edges.add('Space');
      this.trickAt = 0.22;
      this.timer = 2.6 + Math.random() * 1.6;
    }
  }

  override justPressed(code: string): boolean {
    return this.edges.has(code);
  }
  override isDown(): boolean {
    return false;
  }
  override anyDown(): boolean {
    return false;
  }
  override axis(): number {
    return 0;
  }
  override endFrame(): void {
    this.edges.clear();
  }
}

const ORBIT_RADIUS = 6.5;
const ORBIT_HEIGHT = 2.1;
const ORBIT_SPEED = 0.18;

/** Phones/tablets: no menus, no input. A random skater does tricks while the camera drifts around them. */
export class AttractMode {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = createScene();
  private readonly camera = createCamera(52);
  private readonly lights = addDefaultLights(this.scene);
  private readonly world = buildWorld();
  private readonly backdrop = buildBackdrop();
  private readonly input = new AttractInput();
  private readonly player: Player;
  private readonly loop: GameLoop;
  private angle = Math.random() * Math.PI * 2;

  constructor() {
    const container = document.getElementById('app')!;
    this.renderer = createRenderer(container, 1);
    this.scene.add(this.world.group, this.backdrop.group);
    handleResize(container, this.renderer, [this.camera]);

    const outfit = ROSTER[Math.floor(Math.random() * ROSTER.length)];
    this.player = new Player(outfit, this.world, { ollie() {}, landed() {}, grindStart() {}, grindTick() {}, grindEnd() {} });
    const s = this.world.spawn;
    this.player.reset(s.x, s.z, s.heading);
    this.scene.add(this.player.rig.root);

    this.lockDownPage(container);
    this.addOverlay();
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: (_alpha, frameDt) => this.render(frameDt),
    });
  }

  start(): void {
    this.loop.start();
  }

  private update(dt: number): void {
    this.world.update(dt);
    this.input.tick(dt);
    this.player.update(dt, this.input);
    this.input.endFrame();
  }

  private render(frameDt: number): void {
    this.angle += ORBIT_SPEED * frameDt;
    const p = this.player;
    p.render(1);
    const { x, z } = p.view;
    const portrait = window.innerHeight > window.innerWidth;
    const r = ORBIT_RADIUS * (portrait ? 1.35 : 1);
    this.camera.position.set(x + Math.sin(this.angle) * r, ORBIT_HEIGHT, z + Math.cos(this.angle) * r);
    this.camera.lookAt(x, 1.0 + p.view.y * 0.5, z);
    this.lights.follow(x, 0, z);
    this.backdrop.followCamera(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }

  private lockDownPage(container: HTMLElement): void {
    const stop = (e: Event) => e.preventDefault();
    for (const type of ['touchstart', 'touchmove', 'wheel', 'gesturestart', 'gesturechange', 'contextmenu']) {
      document.addEventListener(type, stop, { passive: false });
    }
    document.documentElement.style.touchAction = 'none';
    document.body.style.touchAction = 'none';
    container.style.pointerEvents = 'none';
  }

  private addOverlay(): void {
    const el = document.createElement('div');
    el.id = 'attract-overlay';
    el.innerHTML =
      '<span class="attract-top">Desktop Only</span><span class="attract-bottom sub">Get Back To Your Work PC</span>';
    document.body.appendChild(el);
  }
}
