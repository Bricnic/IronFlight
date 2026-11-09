import R from "@dimforge/rapier3d-compat";
import { CatmullRomCurve3, Euler, Quaternion, Vector3 } from "three";
import { DT } from "./clock";
import type { CustomPrefab } from "./custom-level";
import type { Simulation } from "./simulation";

const curve = (points: [number, number, number][]) =>
  new CatmullRomCurve3(points.map((point) => new Vector3(...point)));

/** Local chassis centerline, from the red tower to the black road. */
export const PIPE_TUBE = curve([
  [0, 1.9, 0], [0, 1.9, 9], [9, -0.9, 20], [22, -5.2, 32],
  [26, -9.8, 44], [18, -12.1, 56], [8, -12.1, 64], [0, -12.1, 64],
]);
export const PIPE_EXIT = curve([
  [0, -12.1, 64], [-12, -12.1, 64], [-23, -12.1, 64],
  [-33, -12.1, 70], [-36, -12.1, 81], [-36, -12.1, 90],
]);
export const PIPE_RADIUS = 5.7;
export const PIPE_CENTER_OFFSET = 3.65;
/** Flagpole ride: straight up the west face, over the top, down the east face. */
export const FLAGPOLE_TUBE = curve([
  [-2.5, 1.9, 0], [-2.5, 14, 0], [-2.5, 26, 0], [0, 31.5, 0],
  [2.5, 26, 0], [2.5, 14, 0], [2.5, 1.9, 0],
]);
export const FLAGPOLE_EXIT = curve([
  [2.5, 1.9, 0], [2.5, 1.9, 9], [2.5, 1.9, 16],
]);
/** Ride distance where the chassis crests the pole and knocks the flag. */
export const FLAGPOLE_APEX_DISTANCE = (() => {
  const length = FLAGPOLE_TUBE.getLength();
  let best = 0,
    bestY = -Infinity;
  for (let i = 0; i <= 100; i++) {
    const y = FLAGPOLE_TUBE.getPointAt(i / 100).y;
    if (y > bestY) {
      bestY = y;
      best = (i / 100) * length;
    }
  }
  return best;
})();
const RIDES = {
  "guided-pipe": { tube: PIPE_TUBE, exit: PIPE_EXIT },
  flagpole: { tube: FLAGPOLE_TUBE, exit: FLAGPOLE_EXIT },
} as const;
type RideKind = keyof typeof RIDES;
const RIDE_LENGTHS: Record<RideKind, { tube: number; exit: number }> = {
  "guided-pipe": { tube: PIPE_TUBE.getLength(), exit: PIPE_EXIT.getLength() },
  flagpole: { tube: FLAGPOLE_TUBE.getLength(), exit: FLAGPOLE_EXIT.getLength() },
};
function rideKind(pipe: CustomPrefab): RideKind {
  return pipe.kind === "flagpole" ? "flagpole" : "guided-pipe";
}
const up = new Vector3(0, 1, 0);

type Ride = {
  pipe: CustomPrefab;
  distance: number;
  inletOffset: Vector3;
  inletRotation: Quaternion;
};

function pose(pipe: CustomPrefab, distance: number) {
  const ride = RIDES[rideKind(pipe)];
  const lengths = RIDE_LENGTHS[rideKind(pipe)];
  const inside = distance < lengths.tube;
  const segment = inside ? ride.tube : ride.exit;
  const t = Math.min(1, inside ? distance / lengths.tube : (distance - lengths.tube) / lengths.exit);
  const yaw = pipe.yaw ?? 0;
  const point = segment.getPointAt(t).applyAxisAngle(up, yaw);
  point.add(new Vector3(pipe.x, pipe.y ?? 0, pipe.z));
  const direction = segment.getTangentAt(t).applyAxisAngle(up, yaw);
  const heading = Math.atan2(direction.x, direction.z);
  const pitch = -Math.atan2(direction.y, Math.hypot(direction.x, direction.z));
  const rotation = new Quaternion().setFromEuler(new Euler(pitch, heading, 0, "YXZ"));
  return { point, rotation, direction };
}

export class GuidedPipe {
  private ride?: Ride;
  knocked?: { id: string; at: number };
  constructor(private sim: Simulation) {}

  private findInlet() {
    const sim = this.sim;
    const p = sim.body.translation();
    const v = sim.body.linvel();
    return sim.courseTrack?.custom?.prefabs.find((pipe) => {
      if (pipe.kind !== "guided-pipe" && pipe.kind !== "flagpole") return false;
      if (Math.abs(p.y - (pipe.y ?? 0) - 1.9) > 2.4) return false;
      const yaw = pipe.yaw ?? 0, sin = Math.sin(yaw), cos = Math.cos(yaw);
      const before = (sim.previousPosition.x - pipe.x) * sin + (sim.previousPosition.z - pipe.z) * cos;
      const after = (p.x - pipe.x) * sin + (p.z - pipe.z) * cos;
      const across = (p.x - pipe.x) * cos - (p.z - pipe.z) * sin;
      if (pipe.kind === "flagpole")
        return before < 0 && after >= 0 && across <= -1 && across >= -5 && v.x * sin + v.z * cos > 1;
      return before < 0 && after >= 0 && Math.abs(across) <= 3.6 && v.x * sin + v.z * cos > 1;
    });
  }

  /** Schedule the next kinematic pose, then hand the chassis back with forward momentum. */
  beforeStep() {
    const s = this.sim;
    if (s.status !== "driving") {
      this.ride = undefined;
      return false;
    }
    if (!this.ride) {
      const pipe = this.findInlet();
      if (!pipe) return false;
      this.ride = {
        pipe: { ...pipe }, distance: 0,
        inletOffset: new Vector3().copy(s.body.translation()).sub(pose(pipe, 0).point),
        inletRotation: new Quaternion().copy(s.body.rotation()),
      };
      s.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true);
    }
    const ride = this.ride;
    const lengths = RIDE_LENGTHS[rideKind(ride.pipe)];
    const total = lengths.tube + lengths.exit;
    if (ride.distance >= total) {
      const { direction } = pose(ride.pipe, total);
      s.body.setBodyType(R.RigidBodyType.Dynamic, true);
      s.body.setLinvel(direction.multiplyScalar(12), true);
      s.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      this.ride = undefined;
      return false;
    }
    const speed = ride.distance < lengths.tube ? 21 : 15;
    if (
      ride.pipe.kind === "flagpole" &&
      ride.distance >= FLAGPOLE_APEX_DISTANCE &&
      this.knocked?.id !== ride.pipe.id
    )
      this.knocked = { id: ride.pipe.id, at: s.time };
    ride.distance = Math.min(total, ride.distance + speed * DT);
    const { point, rotation } = pose(ride.pipe, ride.distance);
    const aligned = Math.min(1, ride.distance / 6);
    point.addScaledVector(ride.inletOffset, 1 - aligned);
    rotation.slerp(ride.inletRotation, 1 - aligned);
    s.body.setNextKinematicTranslation(point);
    s.body.setNextKinematicRotation(rotation);
    return true;
  }

  snapshot() {
    const ride = this.ride;
    return ride ? { id: ride.pipe.id, section: ride.distance < RIDE_LENGTHS[rideKind(ride.pipe)].tube ? "tube" : "causeway" } : null;
  }
}
