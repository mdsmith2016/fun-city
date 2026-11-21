import type * as THREE from 'three';

/** Minimal DOM text overlay: FPS, frame time, draw calls, triangles, plus arbitrary lines. */
export class DebugOverlay {
  visible = false;
  private readonly el: HTMLDivElement;
  private frames = 0;
  private elapsed = 0;
  private fps = 0;
  private frameMs = 0;
  private readonly extra = new Map<string, string>();

  constructor(private readonly renderer: THREE.WebGLRenderer, parent: HTMLElement = document.body) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed',
      top: '8px',
      left: '8px',
      padding: '6px 8px',
      font: '12px/1.4 ui-monospace, Menlo, monospace',
      color: '#cfe',
      background: 'rgba(0,0,0,0.55)',
      borderRadius: '4px',
      whiteSpace: 'pre',
      pointerEvents: 'none',
      display: 'none',
      zIndex: '10',
    } satisfies Partial<CSSStyleDeclaration>);
    parent.appendChild(this.el);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
  }

  set(label: string, value: string | number): void {
    this.extra.set(label, typeof value === 'number' ? value.toFixed(2) : value);
  }

  /** Call once per rendered frame. Text refreshes ~4x/sec. */
  update(frameDt: number): void {
    this.frames++;
    this.elapsed += frameDt;
    if (this.elapsed < 0.25) return;
    this.fps = this.frames / this.elapsed;
    this.frameMs = (this.elapsed / this.frames) * 1000;
    this.frames = 0;
    this.elapsed = 0;
    if (!this.visible) return;

    const info = this.renderer.info.render;
    const lines = [
      `fps    ${this.fps.toFixed(0)}`,
      `frame  ${this.frameMs.toFixed(1)} ms`,
      `calls  ${info.calls}`,
      `tris   ${info.triangles}`,
      ...[...this.extra].map(([k, v]) => `${k.padEnd(6)} ${v}`),
    ];
    this.el.textContent = lines.join('\n');
  }
}
