import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const dungeon = JSON.parse(
  readFileSync("levels/official/Dungeon.json", "utf8"),
) as { prefabs: Trap[] };

type Trap = { id: string; kind: string; x: number; z: number; y?: number };
const traps = (dungeon.prefabs as Trap[]).filter(
  (p) =>
    ["hands", "scissors", "clippers"].includes(p.kind) && (p.y ?? 0) < 4,
);
const picks = ["hands", "scissors", "clippers"].map(
  (kind) => traps.find((t) => t.kind === kind)!,
);

for (const trap of picks)
  test(`${trap.kind} trap is solid and can wreck the truck`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.waitForFunction(() => !!window.__game);
    await page.waitForFunction(() => {
      try {
        window.__game!.track("custom:dungeon");
        return true;
      } catch {
        return false;
      }
    });
    await page.evaluate(() => {
      window.__game!.pause(true);
      window.__game!.startTrack("custom:dungeon");
    });
    // Solid furniture: the trap body blocks the truck.
    expect(
      await page.evaluate(
        (id) =>
          window.__game!.snapshot().dungeon.hazards.find((h) => h.id === id)!
            .colliders,
        trap.id,
      ),
    ).toBeGreaterThan(0);
    // A truck parked in the strike zone is crushed to a wreck.
    const end = await page.evaluate((t) => {
      const g = window.__game!;
      g.place({ x: t.x + 4, y: 2.1, z: t.z + 4 }, 0);
      let s = g.snapshot();
      for (let sec = 0; sec < 120 && s.status !== "wrecked"; sec += 10) {
        g.advanceFrames(150, 8, {});
        s = g.snapshot();
      }
      return s;
    }, trap);
    expect(end.status).toBe("wrecked");
    expect(end.run?.status).toBe("failed");
    expect(end.parts["chassis-front"].detached).toBe(true);
    expect(
      end.dungeon.hazards.find((h) => h.id === trap.id)!.contacts,
    ).toBeGreaterThan(0);
    expect(errors).toHaveLength(0);
  });

test("treasure chest is collected by driving into it", async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    window.__game!.pause(true);
    window.__game!.startTrack("custom:dungeon");
  });
  // Chest 0 sits 10 units south of the placement; drive straight at it.
  const end = await page.evaluate(() => {
    const g = window.__game!;
    g.place({ x: 60, y: 2.1, z: -170 }, 0);
    let s = g.snapshot();
    for (let i = 0; i < 12 && s.run!.collected.length === 0; i++) {
      g.driveFrames(2, 16, () => ({ throttle: 1, steer: 0, brake: 0 }), false);
      s = g.snapshot();
    }
    return s;
  });
  expect(end.run!.collected).toHaveLength(1);
  expect(end.run!.status).toBe("running");
  expect(errors).toHaveLength(0);
});
