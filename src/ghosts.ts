import { PARTS } from "./damage";
import { DT } from "./clock";
import type { Track } from "./tracks";
import type { Simulation } from "./simulation";
export const GHOST_SPEED = 12;
export const GHOST_RADIUS = 4;
export const GHOST_DRAIN = 0.03;
export type GhostDef = { id: string; x: number; z: number; phase: number };
export function ghostDefs(track?: Track): GhostDef[] {
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
  constructor(
    private sim: Simulation,
    track: Track | undefined = sim.courseTrack,
  ) {
    for (const def of ghostDefs(track))
      this.ghosts.push({
        ...def,
        y: 3,
        overlapping: false,
        contacts: 0,
        lastEvent: -100,
      });
  }
  update() {
    const t = this.sim.body.translation();
    const target = { x: t.x, y: t.y + 2.2, z: t.z };
    for (const g of this.ghosts) {
      const next = seekNext(g, target, GHOST_SPEED, DT);
      g.x = next.x;
      g.y = next.y;
      g.z = next.z;
      g.overlapping =
        Math.hypot(g.x - t.x, g.y - t.y, g.z - t.z) < GHOST_RADIUS;
    }
  }
  attack() {
    for (const g of this.ghosts) {
      if (!g.overlapping) continue;
      g.contacts++;
      for (const def of PARTS)
        this.sim.damage(def.id, def.hp * DT * GHOST_DRAIN);
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
