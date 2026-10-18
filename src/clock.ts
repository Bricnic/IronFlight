export const DT = 1 / 120;
/** Playback changes tick count, never the integration interval. */
export class FixedClock {
  private remainder = 0;
  advance(elapsed: number, rate: number, tick: () => void) {
    if (
      !Number.isFinite(elapsed) ||
      elapsed < 0 ||
      !Number.isFinite(rate) ||
      rate <= 0 ||
      rate > 32
    )
      throw new RangeError("Invalid clock input");
    this.remainder += Math.min(elapsed, 0.25) * rate;
    let count = 0;
    while (this.remainder + 1e-10 >= DT) {
      tick();
      this.remainder -= DT;
      count++;
    }
    return count;
  }
  reset() {
    this.remainder = 0;
  }
}
