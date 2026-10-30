import { test, expect, type Page } from "@playwright/test";
import { driveTrack } from "./course-driver";
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
async function shoot(
  page: Page,
  id: string,
  spot: { x: number; y: number; z: number; yaw: number },
  out: string,
) {
  await page.evaluate(
    ({ track, at }) => {
      const g = window.__game!;
      g.pause(true);
      g.startTrack(track as never);
      g.place({ x: at.x, y: at.y, z: at.z }, at.yaw);
      g.advanceFrames(30, 1, {});
    },
    { track: id, at: spot },
  );
  await page.locator("#viewport canvas").screenshot({ path: out });
}
async function spot(
  page: Page,
  id: string,
  which: "start" | "mid",
  midX?: number,
  midYaw?: number,
) {
  const track = await page.evaluate((tid) => window.__game!.track(tid), id);
  if (which === "start") return { ...track.spawn };
  const mid = track.path[Math.floor(track.path.length / 2)];
  return { x: midX ?? mid.x, y: 6, z: mid.z, yaw: midYaw ?? 0 };
}
async function removeClone(page: Page, name: string) {
  await page.evaluate(
    (n) => window.__game!.customLevels.remove(n).catch(() => {}),
    name,
  );
}
test("harbor clone matches at the start", async ({ page }) => {
  const { name, slug } = await loadClone(page, "clone-harbor-sprint.json");
  const at = await spot(page, "harbor-sprint", "start");
  await shoot(page, "harbor-sprint", at, "artifacts/showcase-harbor-start-official.png");
  await shoot(page, slug, at, "artifacts/showcase-harbor-start-clone.png");
  await removeClone(page, name);
});
test("harbor clone matches mid-track", async ({ page }) => {
  const { name, slug } = await loadClone(page, "clone-harbor-sprint.json");
  const at = await spot(page, "harbor-sprint", "mid");
  await shoot(page, "harbor-sprint", at, "artifacts/showcase-harbor-mid-official.png");
  await shoot(page, slug, at, "artifacts/showcase-harbor-mid-clone.png");
  await removeClone(page, name);
});
test("harbor clone drives to completion", async ({ page }) => {
  const { name, slug } = await loadClone(page, "clone-harbor-sprint.json");
  await page.evaluate((s) => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack(s as `custom:${string}`);
  }, slug);
  const result = await driveTrack(page, slug, false);
  expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
    "completed",
  );
  await removeClone(page, name);
});
test("triple-loop clone matches at the start", async ({ page }) => {
  const { name, slug } = await loadClone(page, "clone-triple-loop.json");
  const at = await spot(page, "triple-loop", "start");
  await shoot(page, "triple-loop", at, "artifacts/showcase-triple-start-official.png");
  await shoot(page, slug, at, "artifacts/showcase-triple-start-clone.png");
  await removeClone(page, name);
});
test("triple-loop clone matches mid-track", async ({ page }) => {
  const { name, slug } = await loadClone(page, "clone-triple-loop.json");
  const at = await spot(page, "triple-loop", "mid", -60, 0.35);
  await shoot(page, "triple-loop", at, "artifacts/showcase-triple-mid-official.png");
  await shoot(page, slug, at, "artifacts/showcase-triple-mid-clone.png");
  await removeClone(page, name);
});
test("triple-loop clone dragons face the track", async ({ page }) => {
  const { name, slug } = await loadClone(page, "clone-triple-loop.json");
  await page.evaluate((track) => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack(track as `custom:${string}`);
    g.advanceFrames(30, 1, {});
  }, slug);
  const dragons = await page.evaluate(() => window.__game!.inspectDragons());
  expect(dragons).toHaveLength(4);
  for (const d of dragons) {
    // Easy route x is -24; reference statues use rotation.y = -side * PI / 2.
    const side = Math.sign(d.x - -24);
    expect(side).not.toBe(0);
    expect(d.rotationY).toBeCloseTo((-side * Math.PI) / 2, 6);
  }
  await removeClone(page, name);
});
