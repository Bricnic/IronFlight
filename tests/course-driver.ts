import type { Simulation } from "../src/simulation";
import type { Track } from "../src/tracks";
/** A normal pedal/steering driver. No body or objective state mutations. */
export function courseDriver(
  s: ReturnType<Simulation["snapshot"]>,
  track: Track,
) {
  const index = s.run?.checkpoint ?? 0;
  const target =
    track.mode === "arena"
      ? track.collectibles.find((p) => !s.run?.collected.includes(p.id))
      : track.checkpoints[index];
  if (!target) return { brake: 1 };
  // Drive beyond checkpoint planes rather than orbiting the exact gate center.
  let x = target.x + ("nx" in target ? target.nx * 5 : 0),
    z = target.z + ("nz" in target ? target.nz * 5 : 0);
  const dx = x - s.position.x,
    dz = z - s.position.z,
    len = Math.hypot(dx, dz),
    fx = dx / len,
    fz = dz / len;
  for (const h of s.comic.hazards) {
    const hx = h.x - s.position.x,
      hz = h.z - s.position.z,
      ahead = hx * fx + hz * fz,
      side = hx * fz - hz * fx;
    const radius = h.kind === "hydrant" ? 6 : h.kind === "potion" ? 12 : 11;
    if (ahead > 0 && ahead < 28 && Math.abs(side) < radius) {
      const sign = side > 0 ? -1 : 1;
      x = h.x + fz * sign * (radius + 3) + fx * 3;
      z = h.z - fx * sign * (radius + 3) + fz * 3;
      break;
    }
  }

  for (const a of s.axes.axes) {
    const ax = a.x - s.position.x,
      az = a.z - s.position.z,
      ahead = ax * fx + az * fz;
    if (ahead > 0 && ahead < 120 && (s.run?.checkpoint ?? 0) >= 3) {
      x = a.x + 10.5;
      break;
    }
  }

  const desired = Math.atan2(x - s.position.x, z - s.position.z),
    heading = Math.atan2(s.forward[0], s.forward[2]);
  const error = Math.atan2(
    Math.sin(desired - heading),
    Math.cos(desired - heading),
  );
  const distance = Math.hypot(x - s.position.x, z - s.position.z);
  const speed = Math.abs(error) > 0.6 ? 6 : Math.abs(error) > 0.25 ? 10 : 15;
  return {
    steer: Math.max(-1, Math.min(1, error * 3)),
    throttle: s.signedSpeed < speed ? 1 : 0,
    brake: s.signedSpeed > speed + 1 ? 0.35 : 0,
  };
}
