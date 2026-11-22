import './style.css';
import { PER_TYPE } from '../game/collectables';

export type Screen = 'none' | 'title' | 'select' | 'pause' | 'vee';

export interface UIHandlers {
  start(): void;
  selectMove(dir: -1 | 1): void;
  selectIndex(i: number): void;
  selectConfirm(): void;
  resume(): void;
  backToSelect(): void;
  veeContinue(): void;
}

export interface HudState {
  trick: string;
  popup: boolean;
  sub: string;
  score: number;
  line: number;
  multiplier: number;
  timeLeft: number;
  lineActive: boolean;
  banked: number;
  bankedFresh: boolean;
  /** Progression label shown top centre ('Phase: MVP', 'Season: 2'). */
  label: string;
  /** Collected count per collectable type, in the order the icons were given. */
  collected: number[];
}

const RING_C = 2 * Math.PI * 28;

/** Plain HTML/CSS overlays: title, character select, pause menu and the HUD. State lives in Game; this only draws. */
export class UI {
  handlers: UIHandlers = {
    start() {},
    selectMove() {},
    selectIndex() {},
    selectConfirm() {},
    resume() {},
    backToSelect() {},
    veeContinue() {},
  };

  private readonly root: HTMLDivElement;
  private readonly screens: Record<Exclude<Screen, 'none'>, HTMLElement>;
  private readonly selName: HTMLElement;
  private readonly chips: HTMLButtonElement[] = [];
  private readonly pauseButtons: HTMLButtonElement[];

  private readonly hud: HTMLElement;
  private readonly hTrick: HTMLElement;
  private readonly hSub: HTMLElement;
  private readonly hScore: HTMLElement;
  private readonly hLine: HTMLElement;
  private readonly hMult: HTMLElement;
  private readonly hRing: HTMLElement;
  private readonly hFill: SVGCircleElement;
  private readonly hBank: HTMLElement;
  private readonly controls: HTMLElement;
  private readonly levelLabel: HTMLElement;
  private readonly veeText: HTMLElement;
  private readonly collectEls: HTMLElement[] = [];
  private readonly collectHost: HTMLElement;
  private readonly toastEl: HTMLElement;
  private cache: Record<string, string | number> = {};

  constructor(names: string[], collectIcons: Array<{ url: string; label: string }>) {
    this.root = document.createElement('div');
    this.root.id = 'ui';
    this.root.innerHTML = `
      <section class="screen shade" id="title">
        <div class="block">
          <h1>Fun <em>City</em></h1>
          <p class="tag">A roadmap planning simulator</p>
          <button class="btn" id="btn-start">Press <kbd>Enter</kbd> to start</button>
          <p class="hint"><kbd>W</kbd> push &nbsp; <kbd>S</kbd> brake &nbsp; <kbd>A</kbd><kbd>D</kbd> steer &nbsp; <kbd>Space</kbd> ollie &nbsp; <kbd>C</kbd><kbd>V</kbd><kbd>B</kbd><kbd>N</kbd><kbd>M</kbd> tricks</p>
        </div>
      </section>

      <section class="screen shade" id="select">
        <h2>Choose your skater</h2>
        <div class="bottom">
          <div class="who">
            <button class="arrow" id="sel-prev" aria-label="Previous">&#9664;</button>
            <div>
              <div class="name" id="sel-name"></div>
            </div>
            <button class="arrow" id="sel-next" aria-label="Next">&#9654;</button>
          </div>
          <div class="chips" id="sel-chips"></div>
          <button class="btn" id="btn-ride">Press <kbd>Enter</kbd> to ride</button>
          <p class="hint"><kbd>A</kbd><kbd>D</kbd> choose &nbsp; <kbd>Esc</kbd> back</p>
        </div>
      </section>

      <section class="screen" id="pause">
        <div class="panel">
          <h2>Paused</h2>
          <button class="btn sel" id="btn-resume">Resume</button>
          <button class="btn" id="btn-back">Back to character select</button>
          <p class="hint"><kbd>W</kbd><kbd>S</kbd> + <kbd>Enter</kbd> &nbsp; <kbd>Esc</kbd> resume</p>
          <div class="controls">
            <kbd>W</kbd> push &nbsp; <kbd>S</kbd> brake &nbsp; <kbd>A</kbd><kbd>D</kbd> steer<br />
            <kbd>Space</kbd> ollie &nbsp; <kbd>C</kbd> kickflip &nbsp; <kbd>V</kbd> heelflip<br />
            <kbd>B</kbd> shove-it &nbsp; <kbd>N</kbd> impossible &nbsp; <kbd>M</kbd> 360 spin
          </div>
        </div>
      </section>

      <section class="screen" id="vee">
        <div class="panel vee-panel">
          <svg class="vee-icon" viewBox="0 0 64 64" aria-label="Vee">
            <defs>
              <radialGradient id="vee-eye" cx="45%" cy="40%" r="60%">
                <stop offset="0" stop-color="#ff8a80" />
                <stop offset="0.35" stop-color="#e5201b" />
                <stop offset="1" stop-color="#7a0905" />
              </radialGradient>
            </defs>
            <circle cx="32" cy="32" r="30" fill="#0a0a0c" stroke="#4b4f58" stroke-width="2" />
            <circle cx="32" cy="27" r="12" fill="#e5201b" opacity="0.25" />
            <circle cx="32" cy="27" r="8" fill="url(#vee-eye)" />
            <path d="M19 40 Q32 54 45 40" fill="none" stroke="#f1f1ee" stroke-width="3.2" stroke-linecap="round" />
          </svg>
          <div class="vee-body" id="vee-text"></div>
          <button class="vee-help" id="vee-help">Press <kbd>Enter</kbd> to continue</button>
        </div>
      </section>

      <div id="collect"></div>

      <div id="hud">
        <div class="trick" id="h-trick"></div>
        <div class="sub" id="h-sub"></div>
        <div class="row">
          <div class="ring" id="h-ring">
            <svg viewBox="0 0 64 64">
              <circle class="track" cx="32" cy="32" r="28" />
              <circle class="fill" id="h-fill" cx="32" cy="32" r="28" stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}" />
            </svg>
            <b id="h-mult">x1</b>
          </div>
          <div>
            <div class="score" id="h-score">0</div>
            <div class="line">LINE: <span id="h-line">0</span></div>
          </div>
        </div>
        <div class="bank" id="h-bank"></div>
      </div>

      <div id="level"></div>
      <div id="toast"></div>

      <div id="controls">
        <kbd>W</kbd> push &nbsp; <kbd>S</kbd> brake &nbsp; <kbd>A</kbd><kbd>D</kbd> steer &nbsp; <kbd>Space</kbd> ollie<br />
        <kbd>C</kbd><kbd>V</kbd><kbd>B</kbd><kbd>N</kbd><kbd>M</kbd> air tricks &nbsp; <kbd>Esc</kbd> pause
      </div>
    `;
    document.body.appendChild(this.root);
    // Buttons are for mouse users; never leave one focused or Enter/Space would click it a second time.
    this.root.addEventListener('click', () => (document.activeElement as HTMLElement | null)?.blur());

    const $ = <T extends HTMLElement>(id: string) => this.root.querySelector<T>('#' + id)!;
    this.screens = { title: $('title'), select: $('select'), pause: $('pause'), vee: $('vee') };
    this.veeText = $('vee-text');
    this.selName = $('sel-name');
    this.pauseButtons = [$<HTMLButtonElement>('btn-resume'), $<HTMLButtonElement>('btn-back')];

    this.hud = $('hud');
    this.hTrick = $('h-trick');
    this.hSub = $('h-sub');
    this.hScore = $('h-score');
    this.hLine = $('h-line');
    this.hMult = $('h-mult');
    this.hRing = $('h-ring');
    this.hFill = this.root.querySelector<SVGCircleElement>('#h-fill')!;
    this.hBank = $('h-bank');
    this.controls = $('controls');
    this.levelLabel = $('level');
    this.toastEl = $('toast');

    const chipHost = $('sel-chips');
    names.forEach((name, i) => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.title = name;
      chip.addEventListener('click', () => this.handlers.selectIndex(i));
      chipHost.appendChild(chip);
      this.chips.push(chip);
    });

    $('btn-start').addEventListener('click', () => this.handlers.start());
    $('sel-prev').addEventListener('click', () => this.handlers.selectMove(-1));
    $('sel-next').addEventListener('click', () => this.handlers.selectMove(1));
    $('btn-ride').addEventListener('click', () => this.handlers.selectConfirm());
    this.pauseButtons[0].addEventListener('click', () => this.handlers.resume());
    this.pauseButtons[1].addEventListener('click', () => this.handlers.backToSelect());
    $('vee-help').addEventListener('click', () => this.handlers.veeContinue());

    const collectHost = $('collect');
    this.collectHost = collectHost;
    for (const { url, label } of collectIcons) {
      const item = document.createElement('div');
      item.className = 'item';
      item.title = label;
      item.innerHTML = `<img src="${url}" alt="${label}" /><b>0/${PER_TYPE}</b>`;
      collectHost.appendChild(item);
      this.collectEls.push(item);
    }
  }

  show(screen: Screen): void {
    for (const [name, el] of Object.entries(this.screens)) el.classList.toggle('show', name === screen);
  }

  setSelect(index: number, name: string): void {
    this.selName.textContent = name;
    this.chips.forEach((c, i) => c.classList.toggle('sel', i === index));
  }

  setPauseIndex(i: number): void {
    this.pauseButtons.forEach((b, k) => b.classList.toggle('sel', k === i));
  }

  setVee(text: string): void {
    this.veeText.replaceChildren();
    for (const block of text.split(/\n\n+/)) {
      const line = block.trim();
      if (!line) continue;
      const p = document.createElement('p');
      p.textContent = line;
      this.veeText.appendChild(p);
    }
  }

  toast(text: string): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
  }

  /** Fade the bottom-right control hint after enough active play time (menus/Vee time excluded by the caller). */
  fadeControlsHint(): void {
    if (this.controls.classList.contains('fade')) return;
    this.controls.classList.add('fade');
  }

  showHud(visible: boolean): void {
    this.hud.classList.toggle('show', visible);
    this.levelLabel.classList.toggle('show', visible);
    this.collectHost.classList.toggle('show', visible);
    if (!visible) this.toastEl.classList.remove('show');
    this.controls.classList.remove('show', 'fade');
    if (visible) {
      this.controls.classList.add('show');
    }
    this.cache = {};
  }

  private set(key: string, value: string | number, apply: () => void): void {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    apply();
  }

  updateHud(s: HudState): void {
    this.set('trick', s.trick + (s.popup ? '|p' : ''), () => {
      this.hTrick.textContent = s.trick;
      this.hTrick.classList.toggle('popup', s.popup);
    });
    this.set('label', s.label, () => (this.levelLabel.textContent = s.label));
    s.collected.forEach((n, i) => {
      this.set('collect' + i, n, () => {
        const el = this.collectEls[i];
        el.querySelector('b')!.textContent = `${n}/${PER_TYPE}`;
        el.classList.toggle('done', n >= PER_TYPE);
        el.classList.remove('bump');
        void el.offsetWidth;
        if (n > 0) el.classList.add('bump');
      });
    });
    this.set('sub', s.sub, () => (this.hSub.textContent = s.sub));
    this.set('score', s.score, () => (this.hScore.textContent = String(s.score)));
    this.set('line', s.line, () => (this.hLine.textContent = String(s.line)));
    this.set('mult', s.multiplier, () => (this.hMult.textContent = 'x' + s.multiplier.toFixed(1).replace(/\.0$/, '')));
    const frac = Math.round(s.timeLeft * 50) / 50;
    this.set('ring', frac, () => this.hFill.setAttribute('stroke-dashoffset', String(RING_C * (1 - frac))));
    this.set('active', s.lineActive ? 1 : 0, () => this.hRing.classList.toggle('idle', !s.lineActive));
    this.set('bank', s.bankedFresh ? s.banked : -1, () => {
      this.hBank.classList.remove('show');
      if (s.bankedFresh && s.banked > 0) {
        this.hBank.textContent = '+' + s.banked;
        void this.hBank.offsetWidth;
        this.hBank.classList.add('show');
      }
    });
  }
}
