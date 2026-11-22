import { test, expect, type Page } from "@playwright/test";
import { LEVEL_COLLECTIONS } from "../src/level-collections";

test.slow();
async function openSpooky(page: Page) {
  await page.getByRole("button", { name: "Select level", exact: true }).click();
  if (await page.locator("#collection-back").isVisible()) await page.locator("#collection-back").click();
  await page.locator('[data-collection="spooky-places"] button').click();
}
test.beforeEach(async ({ page }) => {
  const records = Object.fromEntries(LEVEL_COLLECTIONS.find(c => c.id === "spooky-places")!.trackIds.map(id => [`${id}:default`, { time: 1, splits: [] }]));
  await page.addInitScript(records => localStorage.setItem("iron-flight-best-times-v1", JSON.stringify({ version: 1, records })), records);
  // Exercise editor saves and registration without writing the user's official files.
  await page.route("**/__levels", async route => {
    if (route.request().method() === "POST") await route.fulfill({ json: route.request().postDataJSON().level });
    else await route.continue();
  });
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") }); await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
});

test("all collections omit level descriptions and show full thumbnail/minimap images", async ({ page }, info) => {
  for (const collection of LEVEL_COLLECTIONS) {
    await page.locator(`[data-collection="${collection.id}"] button`).click();
    await expect(page.locator(".track-card .track-card-body > p")).toHaveCount(0);
    const size = await page.locator(".track-image").first().boundingBox();
    expect(size!.width / size!.height).toBeCloseTo(16 / 9, 2);
    await page.locator("#collection-back").click();
  }
  await openSpooky(page);
  for (const slug of ["firefly-grotto", "lavabridge-abyss"]) {
    const card = page.locator(`[data-track="custom:${slug}"]`);
    await expect(card.locator(".track-image img")).toHaveAttribute("src", `/tracks/${slug}.png`);
    await expect.poll(() => card.locator("img").evaluate(img => (img as HTMLImageElement).naturalWidth)).toBe(800);
    await card.screenshot({ path: info.outputPath(`${slug}-desktop.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const image = page.locator('[data-track="custom:firefly-grotto"] .track-image');
  const size = (await image.boundingBox())!; expect(size.width / size.height).toBeCloseTo(16 / 9, 2);
  await page.locator('[data-track="custom:firefly-grotto"]').screenshot({ path: info.outputPath("firefly-grotto-mobile.png") });
});

for (const [name, slug] of [["Firefly Grotto", "firefly-grotto"], ["Lavabridge Abyss", "lavabridge-abyss"]])
test(`editing ${name} preserves its catalogue thumbnail in the same session`, async ({ page }) => {
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-levels").selectOption(`official/spooky-places/${name}`);
  await expect(page.locator("#editor-status")).toContainText(`Opened official/spooky-places/${name}`);
  const before = await page.evaluate(() => window.__game!.editor().solids);
  await page.locator("#editor-add-solid").click(); await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
  const track = await page.evaluate(id => window.__game!.track(id), `custom:${slug}`);
  expect(track.custom!.solids).toHaveLength(before + 1);
  expect(track.thumbnail).toBe(`/tracks/${slug}.png`);
  expect(track.sourceFile).toBe(`levels/official/spooky-places/${name}.json`);
  await page.locator("#editor-playtest").click();
  await expect(page.locator("#level-editor")).toBeHidden();
  expect(await page.evaluate(id => window.__game!.track(id).thumbnail, `custom:${slug}`)).toBe(`/tracks/${slug}.png`);
  await openSpooky(page);
  await expect(page.locator(`[data-track="custom:${slug}"] img`)).toHaveAttribute("src", `/tracks/${slug}.png`);
});
