import * as THREE from 'three';
import { AdaptiveResolution } from '../core/quality';
import { GameLoop } from '../core/loop';
import { createRenderer, handleResize } from '../core/renderer';
import { addDefaultLights, createCamera, createScene, type Lights } from '../core/scene';
import { DebugOverlay } from '../debug/overlay';
import { Player, type PlayerEvents } from '../entities/player';
import { ROSTER } from '../entities/roster';
import { Keyboard } from '../input/keyboard';
import { UI } from '../ui/ui';
import { buildBackdrop, type Backdrop } from '../world/skyline';
import type { World } from '../world/types';
import { buildWorld } from '../world/world';
import { FollowCamera } from './followCamera';
import { CharacterSelect } from './select';
import { Scoring } from './scoring';

type Phase = 'title' | 'select' | 'playing' | 'paused';

const POPUP_SECONDS = 1.6;
const LEVEL_LABELS = ['Level 1 \u00b7 Grey box', 'Level 2', 'Level 3 \u00b7 On fire'];

export class Game {
  private phase: Phase = 'title';

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly lights: Lights;
  private readonly quality: AdaptiveResolution;
  private readonly world: World;
  private readonly backdrop: Backdrop;
  private readonly select: CharacterSelect;
  private readonly follow: FollowCamera;
  private readonly keys = new Keyboard();
  private readonly ui = new UI(ROSTER.map((r) => r.name));
  private readonly debug: DebugOverlay;
  private readonly loop: GameLoop;
  private readonly scoring = new Scoring();

  private player: Player | null = null;
  private pauseIndex = 0;
  private time = 0;
  private popup = '';
  private popupTimer = 0;

  private readonly events: PlayerEvents = {
    ollie: () => {},
    landed: (tricks, airTime, ollied, onto) => {
      let pts = 0;
      for (const t of tricks) pts += this.scoring.addTrick(t.name, t.base);
      if (!tricks.length && ollied && airTime > 0.3) pts += this.scoring.addTrick('Ollie', 20, false);
      if (pts > 0 && onto === 'ground') {
        const label = tricks.length ? tricks.map((t) => t.name).join(' + ') : 'Ollie';
        this.popup = `${label}  +${pts}`;
        this.popupTimer = POPUP_SECONDS;
      }
    },
    grindStart: (info) => {
      this.scoring.addTrick(info.name, info.base);
    },
    grindTick: (dt, rate) => this.scoring.addContinuous(dt, rate),
    grindEnd: () => {},
  };

  constructor() {
    const container = document.getElementById('app')!;
    this.renderer = createRenderer(container);
    this.quality = new AdaptiveResolution(this.renderer);
    this.scene = createScene();
    this.camera = createCamera();
    this.lights = addDefaultLights(this.scene);

    this.world = buildWorld();
    this.backdrop = buildBackdrop();
    this.scene.add(this.world.group, this.backdrop.group);

    this.select = new CharacterSelect();
    this.follow = new FollowCamera(this.camera, this.world.bounds, this.world.obstacles);
    handleResize(container, this.renderer, [this.camera, this.select.camera]);

    this.debug = new DebugOverlay(this.renderer);
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: (alpha, frameDt) => this.render(alpha, frameDt),
    });

    this.ui.handlers = {
      start: () => this.goSelect(),
      selectMove: (dir) => this.moveSelect(dir),
      selectIndex: (i) => this.setSelect(i),
      selectConfirm: () => this.startRun(),
      resume: () => this.resume(),
      backToSelect: () => this.goSelect(),
      unlockLevel: () => this.unlockNext(),
    };
    window.addEventListener('blur', () => {
      if (this.phase === 'playing') this.pause();
    });

    this.goTitle();
  }

  start(): void {
    this.loop.start();
  }

  // --- phases -----------------------------------------------------------------

  private goTitle(): void {
    this.phase = 'title';
    this.ui.show('title');
    this.ui.showHud(false);
  }

  private goSelect(): void {
    this.phase = 'select';
    this.setSelect(this.select.index);
    this.ui.show('select');
    this.ui.showHud(false);
    if (this.player) {
      this.scene.remove(this.player.rig.root);
      this.player = null;
    }
  }

  private setSelect(i: number): void {
    this.select.index = i;
    const a = ROSTER[i];
    this.ui.setSelect(i, a.name, a.blurb);
  }

  private moveSelect(dir: -1 | 1): void {
    this.select.move(dir);
    this.setSelect(this.select.index);
  }

  private startRun(): void {
    if (this.player) this.scene.remove(this.player.rig.root);
    const player = new Player(ROSTER[this.select.index], this.world, this.events);
    const s = this.world.spawn;
    player.reset(s.x, s.z, s.heading);
    this.scene.add(player.rig.root);
    this.player = player;

    this.scoring.reset();
    this.popup = '';
    this.popupTimer = 0;
    this.follow.snap(player.view, 0);

    this.phase = 'playing';
    this.ui.show('none');
    this.ui.showHud(true);
  }

  /** Debug unlock (U key / pause menu). The real trigger is not decided yet. */
  private unlockNext(): void {
    if (!this.world.unlockNext()) return;
    const n = this.world.unlocked;
    this.ui.toast(`Level ${n} unlocked`);
    this.ui.setUnlockEnabled(this.world.unlocked < this.world.levelCount);
  }

  private pause(): void {
    this.phase = 'paused';
    this.pauseIndex = 0;
    this.ui.setPauseIndex(0);
    this.ui.setUnlockEnabled(this.world.unlocked < this.world.levelCount);
    this.ui.show('pause');
  }

  private resume(): void {
    this.phase = 'playing';
    this.ui.show('none');
  }

  // --- loop -----------------------------------------------------------------------

  private update(dt: number): void {
    const k = this.keys;
    if (k.justPressed('Backquote')) this.debug.toggle();
    const confirm = k.justPressed('Enter') || k.justPressed('Space') || k.justPressed('NumpadEnter');
    this.time += dt;
    this.world.update(dt, this.time);

    switch (this.phase) {
      case 'title':
        if (confirm) this.goSelect();
        break;

      case 'select':
        this.select.update(dt);
        if (k.justPressed('KeyA') || k.justPressed('ArrowLeft')) this.moveSelect(-1);
        else if (k.justPressed('KeyD') || k.justPressed('ArrowRight')) this.moveSelect(1);
        else if (confirm) this.startRun();
        else if (k.justPressed('Escape')) this.goTitle();
        break;

      case 'playing': {
        if (k.justPressed('Escape')) {
          this.pause();
          break;
        }
        if (k.justPressed('KeyU')) this.unlockNext();
        const p = this.player!;
        p.update(dt, k);
        this.scoring.update(dt, p.mode === 'ground', p.speed);
        this.popupTimer = Math.max(0, this.popupTimer - dt);
        break;
      }

      case 'paused':
        if (k.justPressed('Escape')) this.resume();
        else if (k.justPressed('KeyW') || k.justPressed('ArrowUp') || k.justPressed('KeyS') || k.justPressed('ArrowDown')) {
          const down = k.justPressed('KeyS') || k.justPressed('ArrowDown');
          this.pauseIndex = (this.pauseIndex + (down ? 1 : 2)) % 3;
          this.ui.setPauseIndex(this.pauseIndex);
        } else if (confirm) {
          if (this.pauseIndex === 0) this.resume();
          else if (this.pauseIndex === 1) this.unlockNext();
          else this.goSelect();
        }
        break;
    }
    k.endFrame();
  }

  private render(alpha: number, frameDt: number): void {
    const r = this.renderer;
    if (this.phase === 'select') {
      r.render(this.select.scene, this.select.camera);
    } else if (this.phase === 'title') {
      this.renderTitleCamera();
      r.render(this.scene, this.camera);
    } else {
      const p = this.player!;
      p.render(this.phase === 'playing' ? alpha : 1);
      this.follow.update(this.phase === 'playing' ? frameDt : 0, p.view, p.speed);
      this.lights.follow(p.view.x, 0, p.view.z);
      this.backdrop.followCamera(this.camera.position);
      r.render(this.scene, this.camera);
      this.updateHud();
      this.debug.set('speed', p.speed);
      this.debug.set('mode', p.mode);
    }
    this.quality.update(frameDt);
    this.debug.set('res', this.quality.ratio);
    this.debug.update(frameDt);
  }

  /** Title backdrop: slow sweep across the north waterfront so the skyline is the first thing you see. */
  private renderTitleCamera(): void {
    const a = Math.sin(this.time * 0.12) * 0.55;
    const z = this.world.spawn.z - 8;
    this.camera.position.set(-34, 3.4, z);
    this.camera.lookAt(-34 + Math.sin(a) * 100, 24, z - Math.cos(a) * 100);
    this.camera.fov = 62;
    this.camera.updateProjectionMatrix();
    this.lights.follow(-34, 0, z - 4);
    this.backdrop.followCamera(this.camera.position);
  }

  private updateHud(): void {
    const s = this.scoring;
    const live = this.player!.displayName;
    const showPopup = !live && this.popupTimer > 0;
    const earlier = this.player!.mode === 'grind' ? s.lineTricks.slice(0, -1) : s.lineTricks;
    this.ui.updateHud({
      trick: live || (showPopup ? this.popup : ''),
      popup: showPopup,
      sub: earlier.slice(-3).join('  \u2022  '),
      score: s.score,
      line: s.line,
      multiplier: s.multiplier,
      timeLeft: s.timeLeft,
      lineActive: s.lineActive,
      banked: s.lastBanked,
      bankedFresh: s.bankedAge < 1.4,
      level: LEVEL_LABELS[this.world.levelAt(this.player!.view.z) - 1],
    });
  }
}
