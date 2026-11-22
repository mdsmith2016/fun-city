/**
 * Where the player is in the roadmap: Phase MVP (grey block) -> Phase RSP (colourful block) -> Season 1, 2, 3...
 * Seasons repeat in the RSP block forever. Pure state; Game decides what each step does.
 */
export class Progression {
  private step = 0;

  reset(): void {
    this.step = 0;
  }

  /** Move to the next stage. */
  advance(): void {
    this.step++;
  }

  get isMvp(): boolean {
    return this.step === 0;
  }

  /** 0 before seasons start (MVP/RSP), then 1, 2, 3... */
  get season(): number {
    return Math.max(0, this.step - 1);
  }

  /** Top-centre HUD text. */
  get label(): string {
    if (this.step === 0) return 'Phase: MVP';
    if (this.step === 1) return 'Phase: RSP';
    return `Season: ${this.step - 1}`;
  }
}
