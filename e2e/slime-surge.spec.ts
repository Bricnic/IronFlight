import { test, expect } from "@playwright/test";
// Full in-browser completion drive: walls, crater jump, tube ride, window
// timing, book drive-around and the finish jump, all under four minutes.
const LEG1 = [
  [0, -150, 10, 5], [0, -120, 9, 4], [0, -96, 10, 5],
  [0, -76, 9, 4], [0, -50, 12, 6], [0, -32, 12, 5],
  [0, 20, 25, 9], [0, 55, 14, 7], [0, 95, 12, 7], [0, 140, 10, 5],
  [0, 148, 8, 4],
];
const LEG2 = [
  [-36, 245, 12, 6], [-36, 258, 8, 3], [-36, 275, 10, 5],
  [-48, 300, 10, 6], [-48, 324, 10, 6], [-36, 340, 10, 6],
  [-36, 356, 18, 5], [-36, 385, 18, 0],
];
test("slime surge completes in-browser in under four minutes", async ({ page }, info) => {
  test.slow();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(([leg1, leg2]: number[][][]) => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("custom:slime-surge");
    const drive = (route: number[][], waitAt: number, hazard: string) => {
      let next = 0;
      let waiting = false;
      let lastStrike = -100;
      for (
        let i = 0;
        i < 120 * 240 &&
        g.snapshot().run?.status === "running" &&
        next < route.length;
        i++
      ) {
        g.driveFrames(
          1,
          16,
          (s) => {
            if (next >= route.length) return { brake: 1 };
            const [wx, wz, , reach] = route[next];
            if (Math.hypot(wx - s.position.x, wz - s.position.z) < reach) {
              if (next === waitAt) waiting = true;
              else next++;
              if (next >= route.length) return { brake: 1 };
            }
            if (waiting) {
              const h = s.dungeon.hazards.find((h) => h.id === hazard);
              const pace = Math.hypot(s.velocity.x, s.velocity.z);
              if (h?.striking) {
                lastStrike = s.time;
                return { brake: 1 };
              }
              if (pace > 0.55 || s.time - lastStrike > 0.4) return { brake: 1 };
              waiting = false;
              next++;
            }
            const [x, z, speed] = route[next];
            const aim =
              Math.atan2(x - s.position.x, z - s.position.z) -
              Math.atan2(s.forward[0], s.forward[2]);
            const error = Math.atan2(Math.sin(aim), Math.cos(aim));
            const pace = Math.hypot(s.velocity.x, s.velocity.z);
            const cap = Math.abs(error) > 0.58 ? Math.min(7, speed) : speed;
            return {
              steer: Math.max(-1, Math.min(1, error * 2.5)),
              throttle: pace < cap ? 1 : 0,
              brake: pace > cap + 0.65 ? 0.65 : 0,
            };
          },
          false,
        );
      }
    };
    drive(leg1, 5, "volcano-1");
    for (let i = 0; i < 480 && !g.snapshot().pipeRide; i++)
      g.driveFrames(1, 16, () => ({ throttle: 1 }), false);
    for (let i = 0; i < 1680 && g.snapshot().pipeRide; i++)
      g.driveFrames(1, 16, () => ({ steer: 1, throttle: -1, brake: 1 }), false);
    drive(leg2, 1, "window-1");
    g.pause(true);
  }, [LEG1, LEG2] as number[][][]);
  const state = await page.evaluate(() => {
    const g = window.__game!;
    return { run: g.snapshot().run, position: g.snapshot().position };
  });
  expect(state.run?.status).toBe("completed");
  expect(state.run?.checkpoint).toBe(3);
  expect(state.run?.elapsed).toBeLessThan(240);
  const stats = await page.evaluate(() => window.__game!.stats());
  await info.attach("render-stats", {
    body: JSON.stringify(stats),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("slime-surge-finish.png") });
  expect(errors).toEqual([]);
});
