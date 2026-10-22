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
  const x = target.x + ("nx" in target ? target.nx * 5 : 0),
    z = target.z + ("nz" in target ? target.nz * 5 : 0);
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
