import { PARTS } from "./damage";
import { DT } from "./clock";
import type { Track } from "./tracks";
import type { Simulation } from "./simulation";
export const GHOST_SPEED = 6;
export const GHOST_MAX_SPEED = 50 / 3.6;
export const GHOST_RADIUS = 4;
export const GHOST_DRAIN = 0.03;
export type GhostDef = {
  id: string;
  x: number;
  z: number;
  phase: number;
  y?: number;
};
export function ghostDefs(track?: Track): GhostDef[] {
  if (track?.custom)
    return (track.custom.prefabs ?? [])
      .filter((p) => p.kind === "ghost")
      .map((p, i) => ({
        id: p.id,
        x: p.x,
        z: p.z,
        phase: i * 1.6,
        ...(p.y === undefined ? {} : { y: p.y }),
      }));
  if (track?.id !== "haunted-hollow") return [];
  return [
    [-55, -40],
    [55, -40],
    [0, 60],
  ].map(([x, z], i) => ({
    id: `ghost-${i + 1}`,
    x,
    z,
    phase: i * 1.6,
  }));
}
export function seekNext(
  current: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  speed: number,
  dt: number,
) {
  const dx = target.x - current.x,
    dy = target.y - current.y,
    dz = target.z - current.z;
  const d = Math.hypot(dx, dy, dz);
  if (d < 1e-9) return { ...current };
  const step = Math.min(d, speed * dt);
  return {
    x: current.x + (dx / d) * step,
    y: current.y + (dy / d) * step,
    z: current.z + (dz / d) * step,
  };
}
type Ghost = GhostDef & {
  y: number;
  overlapping: boolean;
  contacts: number;
  lastEvent: number;
};
export class GhostSwarm {
  ghosts: Ghost[] = [];
  damageDealt = 0;
  private nextBreak = 0.2;
  get speed() {
    const stones = this.sim.props.props.filter(
      (p) => p.definition.kind === "gravestone",
    );
    const cleared = stones.length
      ? stones.filter((p) => p.broken).length / stones.length
      : 0;
    return GHOST_SPEED + (GHOST_MAX_SPEED - GHOST_SPEED) * cleared;
  }
  constructor(
    private sim: Simulation,
    track: Track | undefined = sim.courseTrack,
  ) {
    for (const def of ghostDefs(track))
      this.ghosts.push({
        ...def,
        y: def.y ?? 3,
        overlapping: false,
        contacts: 0,
        lastEvent: -100,
      });
  }
  update() {
    if (!this.sim.ghostsEnabled) {
      for (const ghost of this.ghosts) ghost.overlapping = false;
      return;
    }
    const t = this.sim.body.translation();
    const target = { x: t.x, y: t.y + 2.2, z: t.z };
    for (const g of this.ghosts) {
      const next = seekNext(g, target, this.speed, DT);
      g.x = next.x;
      g.y = next.y;
      g.z = next.z;
      g.overlapping =
        Math.hypot(g.x - t.x, g.y - t.y, g.z - t.z) < GHOST_RADIUS;
    }
  }
  attack() {
    if (!this.sim.ghostsEnabled) return;
    for (const g of this.ghosts) {
      if (!g.overlapping) continue;
      g.contacts++;
      const total = PARTS.reduce((sum, p) => sum + p.hp, 0);
      for (const def of PARTS) {
        const before = this.sim.parts.get(def.id)!.health;
        this.sim.damage(def.id, def.hp * DT * GHOST_DRAIN);
        this.damageDealt +=
          (before - this.sim.parts.get(def.id)!.health) / total;
      }
      while (this.damageDealt + 1e-9 >= this.nextBreak) {
        this.sim.breakRandomPart("ghost");
        this.nextBreak += 0.2;
      }
      if (this.sim.time - g.lastEvent > 0.5) {
        g.lastEvent = this.sim.time;
        this.sim.damageEvents.push({
          source: "ghost",
          part: "roof",
          time: this.sim.time,
        });
      }
    }
  }
  snapshot() {
    return {
      enabled: this.sim.ghostsEnabled,
      speed: this.speed,
      damageDealt: this.damageDealt,
      ghosts: this.ghosts.map((g) => ({
        id: g.id,
        x: g.x,
        y: g.y,
        z: g.z,
        phase: g.phase,
        overlapping: g.overlapping,
        contacts: g.contacts,
      })),
    };
  }
}
