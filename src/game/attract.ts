import * as THREE from 'three';
import { GameLoop } from '../core/loop';
import { createRenderer, handleResize } from '../core/renderer';
import { addDefaultLights, createCamera, createScene } from '../core/scene';
import { Player } from '../entities/player';
import { ROSTER, skaterName } from '../entities/roster';
import { Keyboard } from '../input/keyboard';
import { buildBackdrop } from '../world/skyline';
import { buildWorld } from '../world/world';
import { TRICKS } from './tricks';

/** Scripted stand-in for the keyboard: trigger() queues an ollie, then a random trick key shortly after. */
class AttractInput extends Keyboard {
  private readonly edges = new Set<string>();
  private trickAt = -1;

  constructor() {
    super(new EventTarget() as unknown as Window);
  }

  trigger(): void {
    this.edges.add('Space');
    this.trickAt = 0.22;
  }

  tick(dt: number): void {
    if (this.trickAt < 0) return;
    this.trickAt -= dt;
    if (this.trickAt < 0) this.edges.add(TRICKS[Math.floor(Math.random() * TRICKS.length)].code);
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

const ATTRACT_GAP = () => 1.3 + Math.random() * 0.8;

const ORBIT_RADIUS = 6.5;
const ORBIT_HEIGHT = 2.1;
const ORBIT_SPEED = 0.18;

/** Phones/tablets: no menus, no input. Skaters take turns doing a trick in the RSP block while the camera drifts around. */
export class AttractMode {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = createScene();
  private readonly camera = createCamera(52);
  private readonly lights = addDefaultLights(this.scene);
  private readonly world = buildWorld();
  private readonly backdrop = buildBackdrop();
  private readonly input = new AttractInput();
  private player: Player;
  private bag: number[] = [];
  private lastIndex = -1;
  private shownIndex = 0;
  private nameEl!: HTMLElement;
  private action: 'trick' | 'swap' = 'trick';
  private timer = 0.6;
  private readonly loop: GameLoop;
  private spawn = { x: 0, z: 0, heading: 0 };
  private angle = Math.random() * Math.PI * 2;

  constructor() {
    const container = document.getElementById('app')!;
    this.renderer = createRenderer(container, 1);
    this.scene.add(this.world.group, this.backdrop.group);
    handleResize(container, this.renderer, [this.camera]);

    this.world.unlockNext();
    this.world.update(5);
    const spawn = this.world.spawn;
    this.spawn = { x: spawn.x, z: this.world.levelData[1].dz + 12, heading: spawn.heading };

    this.lockDownPage(container);
    this.addOverlay();
    const first = this.nextIndex();
    this.player = new Player(ROSTER[first], this.world, { ollie() {}, landed() {}, grindStart() {}, grindTick() {}, grindEnd() {} });
    this.player.reset(this.spawn.x, this.spawn.z, this.spawn.heading);
    this.scene.add(this.player.rig.root);
    this.showName(first);
    this.backdrop.setPirateShip(!!ROSTER[first].pirateShip);
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
    this.refreshName();
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = ATTRACT_GAP();
      if (this.action === 'trick') {
        this.input.trigger();
        this.action = 'swap';
      } else {
        this.swapSkater();
        this.action = 'trick';
      }
    }
    this.input.tick(dt);
    this.player.update(dt, this.input);
    this.input.endFrame();
  }

  /** Shuffle-bag: every skater appears once before any repeats, and never twice in a row. */
  private nextIndex(): number {
    if (!this.bag.length) {
      this.bag = ROSTER.map((_, i) => i);
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      if (this.bag[this.bag.length - 1] === this.lastIndex && this.bag.length > 1) {
        [this.bag[0], this.bag[this.bag.length - 1]] = [this.bag[this.bag.length - 1], this.bag[0]];
      }
    }
    this.lastIndex = this.bag.pop()!;
    return this.lastIndex;
  }

  private swapSkater(): void {
    const i = this.nextIndex();
    const old = this.player.rig.root;
    this.player.setAppearance(ROSTER[i]);
    this.scene.remove(old);
    this.scene.add(this.player.rig.root);
    this.player.reset(this.spawn.x, this.spawn.z, this.spawn.heading);
    this.showName(i);
    this.backdrop.setPirateShip(!!ROSTER[i].pirateShip);
  }

  private showName(i: number): void {
    this.shownIndex = i;
    this.refreshName();
  }

  private refreshName(): void {
    const text = `Get Back To Work ${skaterName(ROSTER[this.shownIndex])}`;
    if (this.nameEl.textContent !== text) this.nameEl.textContent = text;
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
    el.innerHTML = '<span class="attract-top">Desktop Only</span><span class="attract-bottom sub"></span>';
    this.nameEl = el.querySelector('.attract-bottom') as HTMLElement;
    document.body.appendChild(el);
  }
}
