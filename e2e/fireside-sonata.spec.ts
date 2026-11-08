import { test, expect } from "@playwright/test";
// The lava lake must reach past the background shape ring from everywhere
// on the route, so mountain bases sit on lava instead of clipping over void.
const ROUTE = [
  [0, -170, 14, 8], [0, -120, 16, 10], [0, -75, 12, 8],
  [12, -45, 8, 6], [12, -22, 7, 5],
  [-6, 4, 6, 5],
  [0, 15, 8, 6],
  [28, 18, 10, 5], [44, 24, 9, 5],
  [64, 22, 9, 5],
  [85, 26, 9, 6], [100, 32, 8, 6], [112, 40, 8, 6],
  [126, 51, 5, 6], [140, 61, 5, 6],
  [156, 71, 7, 6], [170, 80, 7, 6], [183, 93, 7, 6],
  [192, 100, 7, 5],
  [200, 108, 8, 5], [200, 125, 10, 6], [200, 145, 10, 6],
  [200, 165, 10, 6], [200, 192, 10, 0],
];
test("piano view keeps mountain bases on the lava", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate((route) => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("custom:fireside-sonata");
    let next = 0;
    for (
      let i = 0;
      i < 14400 &&
      g.snapshot().run?.status === "running" &&
      g.snapshot().position.z < 150;
      i++
    ) {
      g.driveFrames(
        1,
        16,
        (s) => {
          const [wx, wz, , reach] = route[next];
          if (Math.hypot(wx - s.position.x, wz - s.position.z) < reach) next++;
          const [x, z, speed] = route[next];
          const aim =
            Math.atan2(x - s.position.x, z - s.position.z) -
            Math.atan2(s.forward[0], s.forward[2]);
          const error = Math.atan2(Math.sin(aim), Math.cos(aim));
          const pace = Math.hypot(s.velocity.x, s.velocity.z);
          const cap = Math.abs(error) > 0.58 ? Math.min(6, speed) : speed;
          return {
            steer: Math.max(-1, Math.min(1, error * 2.5)),
            throttle: pace < cap ? 1 : 0,
            brake: pace > cap + 0.65 ? 0.65 : 0,
          };
        },
        false,
      );
    }
    g.pause(true);
  }, ROUTE);
  const state = await page.evaluate(() => {
    const g = window.__game!;
    return { run: g.snapshot().run, position: g.snapshot().position };
  });
  expect(state.run?.status).toBe("running");
  expect(state.run?.checkpoint).toBe(2);
  expect(state.position.x).toBeGreaterThan(190);
  expect(state.position.x).toBeLessThan(210);
  expect(state.position.z).toBeGreaterThan(140);
  expect(state.position.z).toBeLessThan(160);
  const stats = await page.evaluate(() => window.__game!.stats());
  await info.attach("render-stats", {
    body: JSON.stringify(stats),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("piano-mountains.png") });
  expect(errors).toEqual([]);
});
