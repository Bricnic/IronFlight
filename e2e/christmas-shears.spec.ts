import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

// The icicle shears' blades reach |x| ~ 9.3, so a truck centered 10.5 units
// out along the blade axis only overlaps the far edge: it must still be
// destroyed. Positions derive from the shipped level, not hardcoded coords.
const level = JSON.parse(
  readFileSync("levels/official/Nutcracker Run.json", "utf8"),
) as { prefabs: Shear[] };
type Shear = { id: string; kind: string; x: number; z: number; y?: number; yaw?: number };
const shear = (level.prefabs as Shear[]).find((p) => p.kind === "christmas-icicle-shears")!;

test("christmas icicle shears destroy the truck on a far-edge clip", async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      raf((t) => {
        if (!(window as unknown as { __captureFreeze?: boolean }).__captureFreeze) cb(t);
      });
  });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.waitForFunction(() => {
    try {
      window.__game!.track("custom:nutcracker-run");
      return true;
    } catch {
      return false;
    }
  });
  await page.evaluate(() => {
    window.__game!.pause(true);
    window.__game!.startTrack("custom:nutcracker-run");
  });
  const end = await page.evaluate((t) => {
    const g = window.__game!;
    // Blades extend along local x; rotate by the trap yaw like the colliders.
    const yaw = t.yaw ?? 0;
    const at = { x: t.x + Math.cos(yaw) * 10.5, y: 2.1, z: t.z - Math.sin(yaw) * 10.5 };
    g.place(at, 0);
    const parked = { ...g.snapshot().position };
    let s = g.snapshot();
    for (let sec = 0; sec < 120 && s.status !== "wrecked"; sec += 10) {
      g.advanceFrames(150, 8, {});
      s = g.snapshot();
    }
    return { parked, state: s };
  }, shear);
  expect(end.state.status).toBe("wrecked");
  expect(end.state.run?.status).toBe("failed");
  expect(end.state.parts["chassis-front"].detached).toBe(true);
  expect(
    end.state.dungeon.hazards.find((h) => h.id === shear.id)!.contacts,
  ).toBeGreaterThan(0);
  // It died where it parked: at the far edge, not slid to the middle.
  const drift = Math.hypot(
    end.state.position.x - end.parked.x,
    end.state.position.z - end.parked.z,
  );
  expect(drift).toBeLessThan(4);
  // Canvas-only captures: hide every DOM overlay so the wreck itself shows.
  await page.addStyleTag({
    content:
      "#app > :not(#viewport) { visibility: hidden !important; } " +
      "#viewport { inset: 0 !important; } " +
      "#viewport > :not(canvas) { display: none !important; }",
  });
  await page.locator("#viewport canvas").screenshot({ path: "artifacts/christmas-icicle-far-edge.png" });
  await page.evaluate((t) => {
    window.__game!.overhead(t.x, t.z, 30);
    (window as unknown as { __captureFreeze?: boolean }).__captureFreeze = true;
  }, shear);
  await page.locator("#viewport canvas").screenshot({ path: "artifacts/christmas-icicle-far-edge-top.png" });
  expect(errors).toHaveLength(0);
});
