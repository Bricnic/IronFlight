import { test, expect } from "@playwright/test";
import { comicHazards, type ComicKind } from "../src/comic-hazards";
import { TRACKS } from "../src/tracks";
import { mkdirSync } from "node:fs";
const kinds: ComicKind[] = [
  "book",
  "teeth",
  "computer",
  "flippers",
  "hydrant",
  "burner",
  "water",
  "potion",
];
for (const kind of kinds)
  test(`${kind}: rendered detail, real contact, bypass and destructive encounter`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    const track = TRACKS.find((t) =>
      comicHazards(t).some((h) => h.kind === kind),
    )!;
    const h = comicHazards(track).find((h) => h.kind === kind)!;
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto("/");
    await page.waitForFunction(() => !!window.__game);
    await page.evaluate((id) => {
      window.__game!.pause(true);
      window.__game!.startTrack(id);
    }, track.id);
    const art = await page.evaluate(
      (id) => window.__game!.stats().comicHazards.find((h) => h.id === id),
      h.id,
    );
    expect(art?.triangles).toBeGreaterThanOrEqual(100000);
    if (kind === "burner") {
      const physical = await page.evaluate(
        (id) =>
          window.__game!.snapshot().comic.hazards.find((h) => h.id === id)!
            .ramp,
        h.id,
      );
      expect(art!.ramp).toBeDefined();
      art!.ramp!.position.forEach((v, i) =>
        expect(v).toBeCloseTo(
          [physical!.position.x, physical!.position.y, physical!.position.z][i],
          5,
        ),
      );
      expect(art!.ramp!.angle).toBeCloseTo(physical!.angle, 5);
    }
    expect(
      await page.evaluate(
        (id) =>
          window.__game!.snapshot().comic.hazards.find((h) => h.id === id)!
            .colliders,
        h.id,
      ),
    ).toBeGreaterThan(0);
    await page.evaluate((h) => {
      const g = window.__game!;
      g.place({ x: h.x, y: 2.1, z: h.z - 18 }, 0);
      g.hazardOverview(h.id);
    }, h);
    await page.waitForTimeout(600);
    mkdirSync("artifacts/hazard-qa", { recursive: true });
    await page.screenshot({ path: `artifacts/hazard-qa/${kind}.png` });
    await info.attach("model geometry", {
      body: JSON.stringify(art),
      contentType: "application/json",
    });
    // Ordinary throttle bypass around the actual footprint; no collision/damage toggles.
    const safe = await page.evaluate((h) => {
      const g = window.__game!;
      g.place({ x: h.x - 15, y: 2.1, z: h.z - 18 }, 0);
      g.advanceFrames(120, 1, { throttle: 1 });
      return g.snapshot();
    }, h);
    expect(safe.status).not.toBe("wrecked");
    expect(safe.position.z).toBeGreaterThan(h.z + 8);
    if (kind === "burner") {
      const jump = await page.evaluate(
        ({ h, id }) => {
          const g = window.__game!;
          g.startTrack(id);
          g.place({ x: h.x, y: 2.1, z: h.z - 40 }, 0);
          g.setVelocity({ x: 0, y: 0, z: 32 });
          let peak = 0;
          g.driveFrames(
            120,
            1,
            (s) => {
              peak = Math.max(peak, s.position.y);
              return { throttle: 1 };
            },
            false,
          );
          return { peak, state: g.snapshot() };
        },
        { h, id: track.id },
      );
      expect(jump.peak).toBeGreaterThan(6);
      expect(jump.state.position.z).toBeGreaterThan(h.z + 8);
      expect(
        jump.state.comic.hazards.find((m) => m.id === h.id)!.contacts,
      ).toBe(0);
      expect(jump.state.status).not.toBe("wrecked");
    }
    // Restart retains normal physics. Only initial pose/entry velocity are test fixtures.
    const hit = await page.evaluate(
      ({ h, track }) => {
        const g = window.__game!;
        g.startTrack(track);
        g.place({ x: h.x, y: 2.1, z: h.z }, 0);
        if (h.kind === "hydrant") g.setVelocity({ x: 0, y: 0, z: 30 });
        if (h.kind === "potion") {
          g.place({ x: h.x - 6.6, y: 2, z: h.z }, 0);
          g.advanceFrames(6, 1, {});
          g.place({ x: h.x - 2.2, y: 2, z: h.z }, 0);
          g.advanceFrames(6, 1, {});
        } else g.advanceFrames(330, 1, {});
        return g.snapshot();
      },
      { h, track: track.id },
    );
    expect(
      hit.comic.hazards.find((m) => m.id === h.id)!.contacts,
    ).toBeGreaterThan(0);
    expect(hit.status).toBe("wrecked");
    expect(hit.parts["chassis-front"].detached).toBe(true);
    expect(errors).toEqual([]);
    await info.attach("physical encounter", {
      body: JSON.stringify(hit),
      contentType: "application/json",
    });
  });
test("water boost pad enables a genuine 200 MPH skim; braking below 180 sinks", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const result = await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("harbor-sprint");
    const h = g.snapshot().comic.hazards.find((h) => h.kind === "water")!;
    g.place({ x: h.x, y: 2.1, z: h.z - 30 }, 0);
    g.setVelocity({ x: 0, y: 0, z: 25 });
    let peak = 0,
      skim = false;
    g.driveFrames(
      65,
      1,
      (s) => {
        peak = Math.max(peak, s.speed * 3.6);
        skim ||= s.comic.hazards.find((m) => m.id === h.id)!.skimming;
        return { throttle: 1 };
      },
      false,
    );
    const fast = g.snapshot();
    g.startTrack("harbor-sprint");
    g.place({ x: h.x, y: 2.1, z: h.z }, 0);
    g.setVelocity({ x: 0, y: 0, z: 58 });
    g.advanceFrames(1, 1, { throttle: 1 });
    const entered = g
      .snapshot()
      .comic.hazards.find((m) => m.id === h.id)!.skimming;
    g.setVelocity({ x: 0, y: 0, z: 49 });
    g.advanceFrames(180, 1, { brake: 1 });
    return { peak, skim, fast, entered, slow: g.snapshot() };
  });
  expect(result.peak).toBeGreaterThan(200);
  expect(result.skim).toBe(true);
  expect(result.fast.status).not.toBe("wrecked");
  expect(result.entered).toBe(true);
  expect(result.slow.status).toBe("wrecked");
});
