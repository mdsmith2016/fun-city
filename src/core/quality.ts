import type * as THREE from 'three';

/**
 * Cheap dynamic resolution: if frames run slower than ~26fps for a couple of seconds,
 * drop the render pixel ratio a notch (and creep back up if there's lots of headroom).
 * Keeps the game near 30fps on integrated GPUs and hi-dpi screens without a settings menu.
 */
export class AdaptiveResolution {
  ratio: number;
  private readonly max: number;
  private readonly min = 0.6;
  private ema = 1 / 60;
  private cooldown = 3;
  private everReduced = false;

  constructor(private readonly renderer: THREE.WebGLRenderer, maxRatio = 1.5) {
    this.max = Math.min(window.devicePixelRatio || 1, maxRatio);
    this.ratio = this.max;
    renderer.setPixelRatio(this.ratio);
  }

  update(frameDt: number): void {
    // Ignore spikes from tab switches / pauses.
    this.ema += (Math.min(frameDt, 0.1) - this.ema) * 0.05;
    this.cooldown -= frameDt;
    if (this.cooldown > 0) return;

    if (this.ema > 1 / 26 && this.ratio > this.min) {
      this.apply(Math.max(this.min, this.ratio - 0.2));
      this.everReduced = true;
    } else if (!this.everReduced && this.ema < 1 / 55 && this.ratio < this.max) {
      this.apply(Math.min(this.max, this.ratio + 0.1));
    }
  }

  private apply(ratio: number): void {
    this.ratio = ratio;
    this.renderer.setPixelRatio(ratio);
    const el = this.renderer.domElement;
    this.renderer.setSize(el.clientWidth, el.clientHeight, false);
    this.cooldown = 3;
    this.ema = 1 / 30;
  }
}
