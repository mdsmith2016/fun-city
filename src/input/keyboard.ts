/**
 * Polled keyboard state keyed by KeyboardEvent.code (layout-independent, e.g. 'KeyW', 'ArrowUp').
 *
 * justPressed / justReleased are edge flags that stay set until endFrame() is called.
 * With a fixed-timestep loop, consume edges in update() and call endFrame() after the
 * first update of a frame (or after render) so an edge isn't seen by multiple steps.
 */
export class Keyboard {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly released = new Set<string>();
  private readonly preventDefaultFor: Set<string>;

  constructor(
    private readonly target: Window = window,
    preventDefaultFor: string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'],
  ) {
    this.preventDefaultFor = new Set(preventDefaultFor);
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  justPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  justReleased(code: string): boolean {
    return this.released.has(code);
  }

  anyDown(...codes: string[]): boolean {
    return codes.some((c) => this.down.has(c));
  }

  /** -1, 0 or 1 from a pair of key groups. Handy for movement axes. */
  axis(negative: string[], positive: string[]): number {
    return (this.anyDown(...positive) ? 1 : 0) - (this.anyDown(...negative) ? 1 : 0);
  }

  endFrame(): void {
    this.pressed.clear();
    this.released.clear();
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.preventDefaultFor.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (!this.down.has(e.code)) this.pressed.add(e.code);
    this.down.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (this.down.delete(e.code)) this.released.add(e.code);
  };

  // Keyup events are lost when focus leaves the window, so release everything.
  private onBlur = (): void => {
    for (const code of this.down) this.released.add(code);
    this.down.clear();
  };
}
