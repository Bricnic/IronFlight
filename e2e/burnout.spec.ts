import { test, expect } from "@playwright/test";
test("power slide leaves a permanent semicircle with feathered alpha ends", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/?test=burnout");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    window.__game!.pause(true);
    window.__game!.select("lab");
  });
  await page.keyboard.press("Backquote");
  const angle = page.locator("#tune-maxSteeringAngle");
  await expect(angle).toHaveAttribute("min", "5");
  await expect(angle).toHaveAttribute("max", "90");
  await angle.fill("45");
  await angle.dispatchEvent("input");
  await page.keyboard.press("Backquote");
  const data = await page.evaluate(() => {
    const g = window.__game!;
    g.advanceFrames(36, 1, { throttle: 1 });
    let turn = 0,
      last = Math.atan2(g.snapshot().forward[0], g.snapshot().forward[2]);
    for (let frame = 0; frame < 600 && turn < Math.PI; frame++) {
      g.driveFrames(1, 1, () => ({ throttle: 0.4, steer: 0.8 }), false);
      const s = g.snapshot(),
        yaw = Math.atan2(s.forward[0], s.forward[2]);
      turn += Math.atan2(Math.sin(yaw - last), Math.cos(yaw - last));
      last = yaw;
    }
    const marks = g.snapshot().skidStrokes;
    g.advanceFrames(45, 1, { brake: 1 });
    return { turn, marks, state: g.snapshot() };
  });
  await info.attach("burnout-path.json", {
    body: JSON.stringify(data),
    contentType: "application/json",
  });
  expect(data.turn).toBeGreaterThanOrEqual(Math.PI - 0.02);
  expect(data.state.upDot).toBeGreaterThan(0.7);
  const longest = data.marks.reduce((a, b) =>
    a.points.length > b.points.length ? a : b,
  );
  expect(longest.points.length).toBeGreaterThan(30);
  const a = longest.points[0],
    mid = longest.points[Math.floor(longest.points.length / 2)],
    b = longest.points.at(-1)!;
  // A semicircle bends well away from the straight chord connecting its ends.
  const chord = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const deviation =
    Math.abs(
      (b[0] - a[0]) * (a[2] - mid[2]) - (a[0] - mid[0]) * (b[2] - a[2]),
    ) / chord;
  expect(deviation).toBeGreaterThan(1);
  expect(
    data.state.skidStrokes.reduce((n, s) => n + s.points.length, 0),
  ).toBeGreaterThanOrEqual(data.marks.reduce((n, s) => n + s.points.length, 0));
  await page.evaluate(() => window.__game!.burnoutOverview());
  await page.screenshot({ path: "artifacts/burnout-semicircle.png" });
  await page.evaluate(() => window.__game!.burnoutOverview("start"));
  await page.screenshot({ path: "artifacts/burnout-fade-start.png" });
  await page.evaluate(() => window.__game!.burnoutOverview("end"));
  await page.screenshot({ path: "artifacts/burnout-fade-end.png" });
  expect(errors).toEqual([]);
});
