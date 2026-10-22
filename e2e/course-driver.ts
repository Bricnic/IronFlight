import type { Page } from "@playwright/test";
import { getTrack, type TrackId } from "../src/tracks";
export async function driveTrack(page: Page, id: TrackId, start = true) {
  if (start) await page.goto(`/?test=course-${id}`);
  await page.waitForFunction(() => !!window.__game);
  return page.evaluate(
    ({ track, start }) => {
      const g = window.__game!;
      g.pause(true);
      if (start) g.startTrack(track.id);
      const initial = g.stats().officialCourse;
      let peakY = 0;
      for (
        let frame = 0;
        frame < 650 && g.snapshot().run?.status === "running";
        frame++
      )
        g.driveFrames(
          1,
          16,
          (s) => {
            peakY = Math.max(peakY, s.position.y);
            const target =
              track.mode === "arena"
                ? track.collectibles.find(
                    (p) => !s.run?.collected.includes(p.id),
                  )
                : track.checkpoints[s.run?.checkpoint ?? 0];
            if (!target) return { brake: 1 };
            const x = target.x + ("nx" in target ? target.nx * 5 : 0),
              z = target.z + ("nz" in target ? target.nz * 5 : 0);
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
    { track: getTrack(id), start },
  );
}
