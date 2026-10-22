import { LOOP, loopX } from "../src/loop";
import type { Simulation } from "../src/simulation";
/** Test driver uses only steering/throttle, never pose or velocity correction. */
export function loopDriver(
  state: ReturnType<Simulation["snapshot"]>,
  routeX: number,
) {
  const p = state.position;
  let theta = Math.atan2(p.z - LOOP.z, LOOP.radius - p.y);
  if (theta < 0) theta += 2 * Math.PI;
  const steer =
    p.y > 3 && p.z > LOOP.z - LOOP.radius - 5
      ? Math.max(
          -0.2,
          Math.min(
            0.2,
            (loopX(routeX, theta) - p.x) * 0.08 - state.forward[0] * 0.6,
          ),
        )
      : 0;
  return { throttle: 1, steer };
}
