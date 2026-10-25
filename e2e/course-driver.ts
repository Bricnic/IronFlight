import type { Page } from "@playwright/test";
import { getTrack, type Track } from "../src/tracks";
export async function driveTrack(
  page: Page,
  id: string,
  start = true,
  vehicle?: string,
) {
  if (start) await page.goto(`/?test=course-${id}`);
  await page.waitForFunction(() => !!window.__game);
  let track: Track;
  try {
    track = getTrack(id);
  } catch {
    track = await page.evaluate(
      (tid) => window.__game!.track(tid),
      id,
    );
  }
  return page.evaluate(
    ({ track, start, vehicle }) => {
      const g = window.__game!;
      g.pause(true);
      if (start) g.startTrack(track.id, undefined, vehicle);
      const initial = g.stats().officialCourse;
      let peakY = 0;
      for (
        let frame = 0;
        frame < 1200 && g.snapshot().run?.status === "running";
        frame++
      )
        g.driveFrames(
          1,
          16,
          (s) => {
            peakY = Math.max(peakY, s.position.y);
            if (track.controls === "strafe") {
              if (s.run?.bounced) return { steer: 0, throttle: 0, brake: 0 };
              const ring = track.ring!;
              const idx = s.run?.checkpoint ?? 0;
              if (idx >= track.checkpoints.length) {
                const error =
                  Math.atan2(ring.x - s.position.x, ring.z - s.position.z) -
                  Math.atan2(s.forward[0], s.forward[2]);
                return {
                  steer: Math.max(-1, Math.min(1, error * 3)),
                  throttle: 0,
                  brake: 0,
                };
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
                Math.min(
                  len,
                  (s.position.x - a.x) * fx + (s.position.z - a.z) * fz,
                ),
              );
              const cross =
                (s.position.x - (a.x + fx * along)) * fz -
                (s.position.z - (a.z + fz * along)) * fx;
              if (Math.abs(cross) > 7)
                return {
                  steer: cross > 0 ? -1 : 1,
                  throttle: 0,
                  brake: 0,
                };
              const obstacle = s.props
                .filter((p) => p.kind === "snowman" && !p.broken)
                .map((p) => ({
                  p,
                  ahead:
                    (p.position.x - s.position.x) * fx +
                    (p.position.z - s.position.z) * fz,
                }))
                .filter((p) => p.ahead > -5 && p.ahead < 100)
                .sort((a, b) => a.ahead - b.ahead)[0];
              const obstacleSide = obstacle
                ? (obstacle.p.position.x - a.x) * fz -
                  (obstacle.p.position.z - a.z) * fx
                : 10;
              const lane =
                Math.abs(obstacleSide) < 2 ? (cross >= 0 ? 4.8 : -4.8) : 0;
              const lateralSpeed = s.velocity.x * fz - s.velocity.z * fx;
              return {
                steer: Math.max(
                  -1,
                  Math.min(1, (lane - cross) * 0.7 - lateralSpeed * 0.4),
                ),
                throttle: 0,
                brake: 0,
              };
            }
            const target =
              track.mode === "arena"
                ? track.collectibles.find(
                    (p) => !s.run?.collected.includes(p.id),
                  )
                : track.mode === "demolition"
                  ? track
                      .demolish!.filter((p) => !s.run?.destroyed.includes(p.id))
                      .sort(
                        (a, b) =>
                          Math.hypot(a.x - s.position.x, a.z - s.position.z) -
                          Math.hypot(b.x - s.position.x, b.z - s.position.z),
                      )[0]
                  : track.checkpoints[s.run?.checkpoint ?? 0];
            if (!target) return { brake: 1 };
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
              const radius =
                h.kind === "hydrant" ? 6 : h.kind === "potion" ? 12 : 11;
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
            const speed =
              Math.abs(error) > 0.6 ? 6 : Math.abs(error) > 0.25 ? 10 : 15;
            return {
              steer: Math.max(-1, Math.min(1, error * 3)),
              throttle: s.signedSpeed < speed ? 1 : 0,
              brake: s.signedSpeed > speed + 1 ? 0.35 : 0,
            };
          },
          false,
        );
      g.advanceFrames(0, 1, {});
      return {
        state: g.snapshot(),
        art: g.stats().officialCourse,
        initial,
        peakY,
      };
    },
    { track, start, vehicle },
  );
}
