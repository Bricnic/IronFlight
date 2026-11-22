import type { Track, Point, Checkpoint } from "./tracks";
export type Position = Point & { y: number };
export type Medal = "bronze" | "silver" | "gold";
export function medalFor(time: number, medals: Track["medals"]): Medal | null {
  if (!Number.isFinite(time) || time < 0) return null;
  return time <= medals.gold
    ? "gold"
    : time <= medals.silver
      ? "silver"
      : time <= medals.bronze
        ? "bronze"
        : null;
}
export function crossesGate(a: Position, b: Position, g: Checkpoint) {
  const before = (a.x - g.x) * g.nx + (a.z - g.z) * g.nz,
    after = (b.x - g.x) * g.nx + (b.z - g.z) * g.nz;
  if (before >= 0 || after < 0) return false;
  const t = -before / (after - before),
    x = a.x + (b.x - a.x) * t - g.x,
    z = a.z + (b.z - a.z) * t - g.z;
  return (
    Math.abs(-x * g.nz + z * g.nx) <= g.width / 2 &&
    Math.abs(a.y + (b.y - a.y) * t - g.y) <= g.height / 2
  );
}
export function segmentDistance(a: Position, b: Position, p: Position) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    dz = b.z - a.z,
    length = dx * dx + dy * dy + dz * dz;
  const t = length
    ? Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy + (p.z - a.z) * dz) / length,
        ),
      )
    : 0;
  return Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y, a.z + dz * t - p.z);
}
/** Swept collect radius for gold stars, shared by the run and the views. */
export const GOLD_STAR_RADIUS = 4;
/** Swept collect radius for wings pickups. */
export const WINGS_RADIUS = 5;
export class TrackRun {
  status: "running" | "completed" | "failed" = "running";
  reason: "timeout" | "wrecked" | null = null;
  elapsed = 0;
  checkpoint = 0;
  /** Elapsed time at each checkpoint crossing, one entry per checkpoint. */
  splits: number[] = [];
  collected = new Set<string>();
  /** Gold-star ids banked this run; stars never gate completion. */
  stars = new Set<string>();
  /** Wings equipped this run; wingsAt stamps the collect time. */
  wings = false;
  wingsAt: number | null = null;
  destroyed = new Set<string>();
  bounced = false;
  ringDone = false;
  ringsDone = new Set<number>();
  constructor(
    readonly track: Track,
    readonly variant = "default",
  ) {}
  step(
    dt: number,
    previous: Position,
    current: Position,
    integrity: number,
    flags: {
      landed?: boolean;
      loopCompleted?: boolean;
      bounced?: boolean;
      destroyed?: string[];
    } = {},
  ) {
    if (this.status !== "running") return;
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.elapsed += dt;
    if (integrity <= 0 || current.y < -15) {
      this.status = "failed";
      this.reason = "wrecked";
      return;
    }
    if (this.track.limit && this.elapsed > this.track.limit + 1e-6) {
      this.status = "failed";
      this.reason = "timeout";
      return;
    }
    if (flags.bounced) this.bounced = true;
    if (flags.destroyed)
      for (const id of flags.destroyed) this.destroyed.add(id);
    // Stars collect in every mode but never gate completion.
    for (const s of this.track.goldStars ?? [])
      if (
        !this.stars.has(s.id) &&
        segmentDistance(previous, current, s) <= GOLD_STAR_RADIUS * (s.resizeScale ?? 1)
      )
        this.stars.add(s.id);
    // First wings pickup equips flight for the rest of the run.
    if (!this.wings)
      for (const w of this.track.wings ?? [])
        if (segmentDistance(previous, current, w) <= WINGS_RADIUS * (w.scale ?? 1)) {
          this.wings = true;
          this.wingsAt = this.elapsed;
          break;
        }
    if (this.track.ring && this.bounced && !this.ringDone) {
      const r = this.track.ring;
      if (previous.z < r.z && current.z >= r.z) {
        const t = (r.z - previous.z) / (current.z - previous.z);
        const x = previous.x + (current.x - previous.x) * t;
        const y = previous.y + (current.y - previous.y) * t;
        if (Math.hypot(x - r.x, y - r.y) <= r.radius) this.ringDone = true;
      }
    }
    const customRings = this.track.rings ?? [];
    customRings.forEach((r, i) => {
      if (this.ringsDone.has(i)) return;
      if (previous.z < r.z && current.z >= r.z) {
        const t = (r.z - previous.z) / (current.z - previous.z);
        const x = previous.x + (current.x - previous.x) * t;
        const y = previous.y + (current.y - previous.y) * t;
        if (Math.hypot(x - r.x, y - r.y) <= r.radius) this.ringsDone.add(i);
      }
    });
    if (this.track.mode === "arena") {
      for (const p of this.track.collectibles)
        if (
          !this.collected.has(p.id) &&
          segmentDistance(previous, current, p) <= p.radius
        )
          this.collected.add(p.id);
      if (this.collected.size === this.track.collectibles.length)
        this.status = "completed";
    } else if (this.track.mode === "demolition") {
      const targets = this.track.demolish ?? [];
      if (targets.length && targets.every((t) => this.destroyed.has(t.id)))
        this.status = "completed";
    } else {
      for (const p of this.track.collectibles)
        if (
          !this.collected.has(p.id) &&
          segmentDistance(previous, current, p) <= p.radius
        )
          this.collected.add(p.id);
      while (this.checkpoint < this.track.checkpoints.length) {
        if (
          this.track.legacy &&
          ((!this.checkpoint && !flags.landed) ||
            (this.checkpoint === 2 && !flags.loopCompleted))
        )
          break;
        if (
          !crossesGate(
            previous,
            current,
            this.track.checkpoints[this.checkpoint],
          )
        )
          break;
        // Truncate first: live gate edits can rewind the checkpoint count.
        this.splits.length = Math.min(this.splits.length, this.checkpoint);
        this.checkpoint++;
        this.splits.push(this.elapsed);
      }
      if (
        this.checkpoint === this.track.checkpoints.length &&
        (!this.track.ring || this.ringDone) &&
        customRings.every((r, i) => !r.goal || this.ringsDone.has(i))
      )
        this.status = "completed";
    }
    if (
      this.status === "running" &&
      this.track.limit &&
      this.elapsed >= this.track.limit - 1e-6
    ) {
      this.status = "failed";
      this.reason = "timeout";
    }
  }
  snapshot() {
    return {
      trackId: this.track.id,
      variant: this.variant,
      status: this.status,
      reason: this.reason,
      elapsed: this.elapsed,
      checkpoint: this.checkpoint,
      checkpointCount: this.track.checkpoints.length,
      splits: [...this.splits],
      collected: [...this.collected],
      collectibleCount: this.track.collectibles.length,
      stars: [...this.stars],
      starCount: (this.track.goldStars ?? []).length,
      wings: this.wings,
      wingsAt: this.wingsAt,
      destroyed: [...this.destroyed],
      demolishCount: this.track.demolish?.length ?? 0,
      bounced: this.bounced,
      ringDone: this.ringDone,
      ringsDone: [...this.ringsDone],
      ringCount: (this.track.rings ?? []).length,
      remaining: this.track.limit
        ? Math.max(0, this.track.limit - this.elapsed)
        : null,
      medal:
        this.status === "completed"
          ? medalFor(this.elapsed, this.track.medals)
          : null,
    };
  }
}
