import type { Simulation } from "../src/simulation";
import type { Track } from "../src/tracks";
/** A normal pedal/steering driver. No body or objective state mutations. */
export function courseDriver(
  s: ReturnType<Simulation["snapshot"]>,
  track: Track,
) {
  if (track.controls === "strafe") return strafeDriver(s, track);
  const index = s.run?.checkpoint ?? 0;
  const target =
    track.mode === "arena"
      ? track.collectibles.find((p) => !s.run?.collected.includes(p.id))
      : track.mode === "demolition"
        ? track.demolish!.find((p) => !s.run?.destroyed.includes(p.id))
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
  const speed = Math.abs(error) > 0.6 ? 6 : Math.abs(error) > 0.25 ? 10 : 15;
  return {
    steer: Math.max(-1, Math.min(1, error * 3)),
    throttle: s.signedSpeed < speed ? 1 : 0,
    brake: s.signedSpeed > speed + 1 ? 0.35 : 0,
  };
}
/** Pure-pursuit strafe driver: lateral centering only, flow provides speed. */
function strafeDriver(s: ReturnType<Simulation["snapshot"]>, track: Track) {
  if (s.run?.bounced) return { steer: 0, throttle: 0, brake: 0 };
  const ring = track.ring!;
  const idx = s.run?.checkpoint ?? 0;
  if (idx >= track.checkpoints.length) {
    const ex = s.position.x - ring.x;
    const steer = Math.max(-1, Math.min(1, -ex * 0.3));
    if (s.position.z < 2330)
      return {
        steer,
        throttle: s.signedSpeed < 2 ? 0.35 : 0,
        brake: 0,
      };
    if (Math.abs(s.signedSpeed) > 4)
      return { steer, throttle: 0, brake: 1 };
    const dz = ring.z - s.position.z;
    if (Math.abs(ex) > 3 || Math.abs(dz) > 5)
      return { steer, throttle: dz > 0 ? 0.35 : -0.35, brake: 0 };
    return { steer: 0, throttle: 0, brake: 1 };
  }
  const pts = track.path;
  const si = Math.min(idx, pts.length - 2);
  const a = pts[si],
    b = pts[si + 1];
  const dx = b.x - a.x,
    dz = b.z - a.z,
    len = Math.hypot(dx, dz) || 1,
    fx = dx / len,
    fz = dz / len;
  const along = Math.max(
    0,
    Math.min(len, (s.position.x - a.x) * fx + (s.position.z - a.z) * fz),
  );
  const cross =
    (s.position.x - (a.x + fx * along)) * fz -
    (s.position.z - (a.z + fz * along)) * fx;
  if (Math.abs(cross) > 7)
    return { steer: cross > 0 ? -1 : 1, throttle: 0, brake: 0 };
  const ahead = Math.min(len, along + 30);
  const e =
    (a.x + fx * ahead - s.position.x) * fz -
    (a.z + fz * ahead - s.position.z) * fx;
  return {
    steer: Math.max(-1, Math.min(1, e * 0.08)),
    throttle: 0,
    brake: 0,
  };
}
