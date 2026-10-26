import { test, expect, type Page } from "@playwright/test";
import { TEXTURE_IDS, type CustomLevel } from "../src/custom-level";
import { TRACK_IDS } from "../src/tracks";
test.slow();
type SolidInspect = {
  id: string;
  visible: boolean;
  transparent: boolean;
  opacity: number;
  map: string;
  normalMap: string;
  roughnessMap: string;
};
type SolidSeed = CustomLevel["solids"][number];
function baseLevel(name: string, solids: SolidSeed[]): CustomLevel {
  return {
    name,
    mode: "race",
    spawn: { x: 0, y: 2.1, z: -40, yaw: 0 },
    checkpoints: [{ x: 0, z: 40 }],
    solids: [
      {
        id: "ground-1",
        kind: "ground",
        x: 0,
        y: -0.6,
        z: 0,
        w: 200,
        h: 1.2,
        d: 200,
        color: 0x6d817c,
      },
      ...solids,
    ],
    prefabs: [],
    medals: { gold: 30, silver: 45, bronze: 60 },
  };
}
async function startCustom(page: Page, level: CustomLevel) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(async (l) => {
    const g = window.__game!;
    await g.customLevels.remove(l.name).catch(() => {});
    await g.customLevels.save(l);
    g.pause(true);
    g.startTrack(`custom:${l.name}` as `custom:${string}`);
  }, level);
  await expect(page.locator("#placement-bar")).toBeVisible({ timeout: 20000 });
}
async function settledSolids(page: Page) {
  let last: SolidInspect[] = [];
  for (let i = 0; i < 60; i++) {
    last = (await page.evaluate(() =>
      window.__game!.inspectSolids(),
    )) as SolidInspect[];
    if (
      last.length > 0 &&
      last.every(
        (s) =>
          s.map !== "pending" &&
          s.normalMap !== "pending" &&
          s.roughnessMap !== "pending",
      )
    )
      return last;
    await page.waitForTimeout(500);
  }
  return last;
}
async function removeLevels(page: Page, names: string[]) {
  await page.evaluate(async (list) => {
    const g = window.__game!;
    for (const name of list) await g.customLevels.remove(name).catch(() => {});
  }, names);
}
test("monastery ramp renders instead of vanishing", async ({ page }) => {
  const ramp: SolidSeed = {
    id: "ramp-1",
    kind: "ramp",
    x: 0,
    y: 1.5,
    z: -20,
    w: 24,
    h: 3,
    d: 12,
    color: 0xb9b2a7,
    texture: "monastery_stone_floor",
    angle: -0.124,
  };
  await startCustom(page, baseLevel("e2e-tex-ramp", [ramp]));
  const solids = await settledSolids(page);
  const seen = solids.find((s) => s.id === "ramp-1")!;
  expect(seen).toMatchObject({
    visible: true,
    transparent: false,
    map: "loaded",
  });
  const errors = await page.evaluate(() =>
    window.__game!.textureLoadErrors(),
  );
  expect(errors).toEqual([]);
  const withRamp = await page.screenshot();
  await startCustom(page, baseLevel("e2e-tex-noramp", []));
  await page.waitForTimeout(2000);
  const withoutRamp = await page.screenshot();
  expect(withRamp.equals(withoutRamp)).toBe(false);
  await removeLevels(page, ["e2e-tex-ramp", "e2e-tex-noramp"]);
});
test("every editor texture renders on a custom solid", async ({ page }) => {
  const solids: SolidSeed[] = TEXTURE_IDS.map((texture, i) => ({
    id: `tex-${i}`,
    kind: "barrier",
    x: -66 + i * 12,
    y: 0.8,
    z: -20,
    w: 6,
    h: 1.6,
    d: 5,
    color: 0xffffff,
    texture,
  }));
  await startCustom(page, baseLevel("e2e-tex-all", solids));
  const seen = await settledSolids(page);
  expect(seen).toHaveLength(TEXTURE_IDS.length + 1);
  for (const [i, texture] of TEXTURE_IDS.entries()) {
    const entry = seen.find((s) => s.id === `tex-${i}`);
    expect(entry, texture).toMatchObject({
      visible: true,
      transparent: false,
      map: "loaded",
      normalMap: "loaded",
      roughnessMap: "loaded",
    });
  }
  const errors = await page.evaluate(() =>
    window.__game!.textureLoadErrors(),
  );
  expect(errors).toEqual([]);
  await removeLevels(page, ["e2e-tex-all"]);
});
test("official tracks use only editor-listed textures", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  for (const id of TRACK_IDS) {
    await page.evaluate((trackId) => {
      const g = window.__game!;
      g.pause(true);
      g.startTrack(trackId);
    }, id);
    await page.waitForTimeout(5000);
  }
  const loaded = await page.evaluate(() =>
    window.__game!.loadedTextureIds(),
  );
  const listed = new Set<string>(TEXTURE_IDS);
  expect(loaded).not.toHaveLength(0);
  for (const id of loaded) expect(listed.has(id), id).toBe(true);
});
