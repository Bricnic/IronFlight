import { test, expect } from "@playwright/test";
import { LOOP } from "../src/loop";
import { ROUTES } from "../src/routes";
for (const route of ROUTES)
  test(`Triple Loop ${route.id}: complete spawn, jump, physical loop and exit`, async ({
    page,
  }, info) => {
    await page.goto("/?test=official-triple");
    await page.waitForFunction(() => !!window.__game);
    const state = await page.evaluate(
      ({ lane, x, loop }) => {
        const g = window.__game!;
        g.pause(true);
        g.startTrack("triple-loop", lane);
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
      { lane: route.id, x: route.x, loop: LOOP },
    );
    expect(state.run?.status, JSON.stringify(state.run)).toBe("completed");
    expect(state.run?.checkpoint).toBe(3);
    expect(state.loopApex).toBe(true);
    expect(state.loopCompleted).toBe(true);
    expect(state.upDot).toBeGreaterThan(0.8);
    expect(state.integrity).toBeGreaterThan(0.1);
    await info.attach("completion telemetry", {
      body: JSON.stringify(state),
      contentType: "application/json",
    });
    await page.screenshot({ path: info.outputPath(`${route.id}-exit.png`) });
  });
