import type { ProgressionLabels } from '../variants/types';

/**
 * Where the player is in the roadmap: Phase MVP (grey block) -> Phase RSP (colourful block) -> Season 1, 2, 3...
 * Seasons repeat in the RSP block forever. Pure state; Game decides what each step does.
 */
export class Progression {
  private step = 0;

  constructor(private readonly labels: ProgressionLabels) {}

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
    if (this.step === 0) return this.labels.mvp;
    if (this.step === 1) return this.labels.rsp;
    return this.labels.season(this.step - 1);
  }
}
