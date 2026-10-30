import { test, expect, type Page } from "@playwright/test";
import { LOOP } from "../src/loop";
test.slow();
async function loadClone(page: Page, file: string) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const level = await page.evaluate(async (f) => {
    const res = await fetch(`/showcase/${f}`);
    if (!res.ok) throw new Error(`missing showcase file: ${f}`);
    return await res.json();
  }, file);
  await page.evaluate(async (l) => {
    const g = window.__game!;
    await g.customLevels.remove(l.name).catch(() => {});
    await g.customLevels.save(l);
  }, level);
  return {
    name: level.name as string,
    slug: `custom:${(level.name as string).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  };
}
test("Clone Triple Loop: physical loop-de-loop and race completion", async ({
  page,
}, info) => {
  const { name, slug } = await loadClone(page, "clone-triple-loop.json");
  const state = await page.evaluate(
    ({ track, x, loop }) => {
      const g = window.__game!;
      g.pause(true);
      g.startTrack(track as `custom:${string}`);
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
    { track: slug, x: -24, loop: LOOP },
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
  await page.evaluate(
    (n) => window.__game!.customLevels.remove(n).catch(() => {}),
    name,
  );
});
