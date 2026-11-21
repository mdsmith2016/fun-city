export interface LoopCallbacks {
  /** Called zero or more times per frame with a constant dt (seconds). */
  update(dt: number): void;
  /** Called once per frame. alpha in [0,1) is how far we are into the next fixed step. */
  render(alpha: number, frameDt: number): void;
}

/**
 * Fixed-timestep loop (accumulator pattern) with a variable-rate render.
 * Frame time is clamped so a backgrounded tab doesn't trigger a spiral of catch-up steps.
 */
export class GameLoop {
  readonly step: number;
  private readonly maxFrame = 0.25;
  private accumulator = 0;
  private last = 0;
  private rafId = 0;
  private running = false;

  constructor(private readonly cb: LoopCallbacks, hz = 60) {
    this.step = 1 / hz;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    const frameDt = Math.min((now - this.last) / 1000, this.maxFrame);
    this.last = now;
    this.accumulator += frameDt;

    while (this.accumulator >= this.step) {
      this.cb.update(this.step);
      this.accumulator -= this.step;
    }

    this.cb.render(this.accumulator / this.step, frameDt);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
