import { test, expect } from "@playwright/test";
test("hero art and local PBR maps load without renderer errors", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const missing: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/textures/") && r.status() !== 200)
      missing.push(r.url());
  });
  await page.goto("/?test=1");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    window.__game!.select("easy");
    window.__game!.pause(true);
  });
  await page.waitForLoadState("networkidle");
  const stats = await page.evaluate(() => window.__game!.stats());
  expect(stats.triangles).toBeGreaterThanOrEqual(60000);
  expect(stats.textures).toBeGreaterThanOrEqual(12);
  expect(missing).toEqual([]);
  expect(errors).toEqual([]);
  await info.attach("render-stats", {
    body: JSON.stringify(stats),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("hero-truck.png") });
});
test("dent tool deforms rendered panel vertices", async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Destruction lab" }).click();
  await page.getByLabel("Target part").selectOption("hood");
  const before = await page.evaluate(
    () => window.__game!.visualPart("hood").vertices,
  );
  await page.getByRole("button", { name: "Dent panel" }).click();
  const after = await page.evaluate(
    () => window.__game!.visualPart("hood").vertices,
  );
  expect(after).not.toBe(before);
  expect(
    await page.evaluate(() => window.__game!.snapshot().parts.hood.detached),
  ).toBe(false);
});
test("rebuilding truck releases old textures and geometry", async ({
  page,
}) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => !!window.__game);
  await page.waitForLoadState("networkidle");
  const result = await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.select("lab");
    const before = g.stats();
    for (let i = 0; i < 8; i++) g.select("lab");
    return { before, after: g.stats() };
  });
  expect(result.after.geometries).toBeLessThanOrEqual(
    result.before.geometries + 2,
  );
  expect(result.after.textures).toBeLessThanOrEqual(result.before.textures + 2);
});
