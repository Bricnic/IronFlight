import { test, expect } from "@playwright/test";
import { driveTrack } from "./course-driver";
import { TRACK_IDS } from "../src/tracks";
import { VEHICLES } from "../src/vehicles";
import { LOOP } from "../src/loop";
import { ROUTES } from "../src/routes";
const COURSES = TRACK_IDS.filter((id) => id !== "triple-loop");
for (const v of VEHICLES) {
  for (const id of COURSES) {
    test(`matrix: ${v.id} beats ${id}`, async ({ page }, info) => {
      const result = await driveTrack(page, id, true, v.id);
      expect(result.state.vehicleId).toBe(v.id);
      expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
        "completed",
      );
      expect(result.state.integrity).toBeGreaterThan(0);
      await info.attach("completion", {
        body: JSON.stringify(result.state.run),
        contentType: "application/json",
      });
    });
  }
  test(`matrix: ${v.id} beats triple-loop (easy)`, async ({ page }, info) => {
    await page.goto("/?test=official-triple");
    await page.waitForFunction(() => !!window.__game);
    const route = ROUTES.find((r) => r.id === "easy")!;
    const state = await page.evaluate(
      ({ lane, x, loop, vehicle }) => {
        const g = window.__game!;
        g.pause(true);
        g.startTrack("triple-loop", lane, vehicle);
        for (
          let frame = 0;
          frame < 300 && g.snapshot().run?.status === "running";
          frame++
        )
          g.driveFrames(
            1,
            16,
            (s) => {
              let theta = Math.atan2(
                s.position.z - loop.z,
                loop.radius - s.position.y,
              );
              if (theta < 0) theta += 2 * Math.PI;
              const target =
                x + (12 * (theta - Math.sin(theta))) / (2 * Math.PI);
              const steer =
                s.position.y > 3 && s.position.z > loop.z - loop.radius - 5
                  ? Math.max(
                      -0.2,
                      Math.min(
                        0.2,
                        (target - s.position.x) * 0.08 - s.forward[0] * 0.6,
                      ),
                    )
                  : 0;
              return { throttle: 1, steer };
            },
            false,
          );
        g.advanceFrames(0, 1, {});
        return g.snapshot();
      },
      { lane: route.id, x: route.x, loop: LOOP, vehicle: v.id },
    );
    expect(state.vehicleId).toBe(v.id);
    expect(state.run?.status, JSON.stringify(state.run)).toBe("completed");
    expect(state.integrity).toBeGreaterThan(0);
    await info.attach("completion", {
      body: JSON.stringify(state.run),
      contentType: "application/json",
    });
  });
}
