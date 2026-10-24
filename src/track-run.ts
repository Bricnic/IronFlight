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
export class TrackRun {
  status: "running" | "completed" | "failed" = "running";
  reason: "timeout" | "wrecked" | null = null;
  elapsed = 0;
  checkpoint = 0;
  collected = new Set<string>();
  destroyed = new Set<string>();
  bounced = false;
  ringDone = false;
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
    if (this.track.ring && this.bounced && !this.ringDone) {
      const r = this.track.ring;
      if (
        segmentDistance(previous, current, { x: r.x, y: r.y, z: r.z }) <=
        r.radius
      )
        this.ringDone = true;
    }
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
        this.checkpoint++;
      }
      if (
        this.checkpoint === this.track.checkpoints.length &&
        (!this.track.ring || this.ringDone)
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
      collected: [...this.collected],
      collectibleCount: this.track.collectibles.length,
      destroyed: [...this.destroyed],
      demolishCount: this.track.demolish?.length ?? 0,
      bounced: this.bounced,
      ringDone: this.ringDone,
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
