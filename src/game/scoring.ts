const LINE_TIMEOUT = 2.4;
const MAX_MULTIPLIER = 5;
const MULTIPLIER_STEP = 0.5;

/**
 * Score keeping. A "line" is a run of tricks; each new trick bumps the multiplier (x1 -> x1.5 -> x2 ...).
 * The line ends after a couple of seconds on the ground without scoring, at which point its total is
 * banked into the score and the multiplier resets.
 */
export class Scoring {
  score = 0;
  line = 0;
  multiplier = 1;
  lineTricks: string[] = [];
  /** Recent bank amount for a brief HUD flourish. */
  lastBanked = 0;
  bankedAge = 99;

  private lastTrick: string | null = null;
  private active = false;
  private idle = 0;
  private fraction = 0;

  reset(): void {
    this.score = 0;
    this.line = 0;
    this.multiplier = 1;
    this.lineTricks = [];
    this.lastTrick = null;
    this.active = false;
    this.idle = 0;
    this.fraction = 0;
    this.lastBanked = 0;
    this.bankedAge = 99;
  }

  get lineActive(): boolean {
    return this.active;
  }

  /** 1 = line is safe, 0 = about to bank. */
  get timeLeft(): number {
    return this.active ? Math.max(0, 1 - this.idle / LINE_TIMEOUT) : 0;
  }

  /** Returns the points awarded. Repeating the same trick back to back is worth half and doesn't raise the multiplier. */
  addTrick(name: string, base: number, bump = true): number {
    const repeat = name === this.lastTrick;
    const pts = Math.round(base * this.multiplier * (repeat ? 0.5 : 1));
    this.line += pts;
    if (bump && !repeat) this.multiplier = Math.min(MAX_MULTIPLIER, this.multiplier + MULTIPLIER_STEP);
    if (bump) {
      this.lineTricks.push(name);
      if (this.lineTricks.length > 6) this.lineTricks.shift();
    }
    this.lastTrick = name;
    this.touch();
    return pts;
  }

  /** Points that trickle in while grinding/sliding. */
  addContinuous(dt: number, rate: number): void {
    this.fraction += rate * this.multiplier * dt;
    const whole = Math.floor(this.fraction);
    if (whole > 0) {
      this.line += whole;
      this.fraction -= whole;
    }
    this.touch();
  }

  update(dt: number, onGround: boolean, speed: number): void {
    this.bankedAge += dt;
    if (!this.active) return;
    if (!onGround) {
      this.idle = 0;
      return;
    }
    this.idle += dt * (speed < 0.5 ? 2 : 1);
    if (this.idle >= LINE_TIMEOUT) this.bank();
  }

  private touch(): void {
    this.active = true;
    this.idle = 0;
  }

  private bank(): void {
    this.score += this.line;
    this.lastBanked = this.line;
    this.bankedAge = 0;
    this.line = 0;
    this.multiplier = 1;
    this.lineTricks = [];
    this.lastTrick = null;
    this.active = false;
    this.idle = 0;
    this.fraction = 0;
  }
}
