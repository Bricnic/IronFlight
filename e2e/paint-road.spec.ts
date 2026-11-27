import { test, expect, type Page } from "@playwright/test";

test.slow();

async function openEditor(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await expect(page.locator("#level-editor canvas")).toHaveCount(1);
}

async function drawCircle(page: Page, cx: number, cy: number, r: number) {
  await page.mouse.move(cx + r, cy);
  await page.mouse.down();
  for (let i = 1; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    await page.mouse.move(cx + Math.cos(a) * r, cy + Math.sin(a) * r, { steps: 2 });
  }
  await page.mouse.up();
}

test("paint a circular track, materialize, playtest and drive it", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() => window.__game!.customLevels.remove("e2e-paint-circle").catch(() => {}));
  await page.locator("#editor-name").fill("e2e-paint-circle");
  await page.locator("#editor-new").click();
  try {
    const before = await page.evaluate(() => window.__game!.editor().solids);
    const camBefore = await page.evaluate(() => window.__game!.editor().cameraTarget);
    await page.locator("#editor-paint-mode").click();
    await expect(page.locator("#editor-paint-layer")).toBeVisible();
    const box = (await page.locator("#editor-paint-canvas").boundingBox())!;
    // Corner circle, clear of the default straight road and checkpoint gate.
    const cx = box.x + box.width * 0.68;
    const cy = box.y + box.height * 0.6;
    const r = Math.min(box.width, box.height) * 0.2;
    await drawCircle(page, cx, cy, r);
    await expect(page.locator("#editor-paint-materialize")).toBeEnabled();
    await page.locator("#level-editor .editor-viewport").screenshot({ path: "artifacts/paint-stroke.png" });
    await page.locator("#editor-paint-materialize").click();
    await expect(page.locator("#editor-status")).toContainText("Materialized");
    await expect(page.locator("#editor-paint-layer")).toBeHidden();
    const after = await page.evaluate(() => window.__game!.editor().solids);
    expect(after).toBeGreaterThan(before + 10);
    // The camera returns to where painting found it.
    const camAfter = await page.evaluate(() => window.__game!.editor().cameraTarget);
    expect(camAfter.x).toBeCloseTo(camBefore.x);
    expect(camAfter.y).toBeCloseTo(camBefore.y);
    expect(camAfter.z).toBeCloseTo(camBefore.z);
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText("Saved e2e-paint-circle");
    // Fit the painted circle from the materialized pieces for waypoints.
    const circle = await page.evaluate(async () => {
      const level = await window.__game!.customLevels.load("e2e-paint-circle");
      const pieces = level.solids.filter((s) => s.kind === "road" && s.id !== "road-1");
      const cx = pieces.reduce((a, s) => a + s.x, 0) / pieces.length;
      const cz = pieces.reduce((a, s) => a + s.z, 0) / pieces.length;
      const r = pieces.reduce((a, s) => a + Math.hypot(s.x - cx, s.z - cz), 0) / pieces.length;
      return { x: cx, z: cz, r };
    });
    expect(circle.r).toBeGreaterThan(5);
    await page.locator("#editor-playtest").click();
    await expect(page.locator("#level-editor")).toBeHidden({ timeout: 20000 });
    await page.evaluate((c) => {
      const g = window.__game!;
      g.place({ x: c.x + c.r, y: 2.1, z: c.z }, 0);
    }, circle);
    const start = await page.evaluate(() => window.__game!.snapshot().position);
    let farthest = 0;
    for (let leg = 0; leg < 8; leg++) {
      await page.evaluate(([c]) => {
        const g = window.__game!;
        const wps = Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return { x: c.x + Math.cos(a) * c.r, z: c.z + Math.sin(a) * c.r };
        });
        g.driveFrames(75, 1, (s) => {
          const p = s.position;
          let bi = 0;
          let bd = Infinity;
          wps.forEach((w, i) => {
            const d = Math.hypot(w.x - p.x, w.z - p.z);
            if (d < bd) {
              bd = d;
              bi = i;
            }
          });
          const t = wps[(bi + 3) % wps.length];
          const yaw = Math.atan2(s.forward[0], s.forward[2]);
          let diff = Math.atan2(t.x - p.x, t.z - p.z) - yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          return { throttle: 0.55, steer: Math.max(-1, Math.min(1, diff * 2.2)) };
        });
      }, [circle]);
      await page.locator("#viewport canvas").screenshot({ path: `artifacts/paint-drive-${leg}.png` });
      const pos = await page.evaluate(() => window.__game!.snapshot().position);
      farthest = Math.max(farthest, Math.hypot(pos.x - start.x, pos.z - start.z));
    }
    // The car ranged to the far side of the ring and kept driving it.
    expect(farthest).toBeGreaterThan(circle.r * 1.5);
  } finally {
    await page.evaluate(() => window.__game!.customLevels.remove("e2e-paint-circle").catch(() => {}));
  }
});

test("cancel discards painted strokes without creating roads", async ({ page }) => {
  await openEditor(page);
  await page.locator("#editor-name").fill("e2e-paint-cancel");
  await page.locator("#editor-new").click();
  const before = await page.evaluate(() => window.__game!.editor().solids);
  await page.locator("#editor-paint-mode").click();
  await expect(page.locator("#editor-paint-layer")).toBeVisible();
  const box = (await page.locator("#editor-paint-canvas").boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 200, { steps: 5 });
  await page.mouse.up();
  await page.locator("#editor-paint-cancel").click();
  await expect(page.locator("#editor-paint-layer")).toBeHidden();
  expect(await page.evaluate(() => window.__game!.editor().solids)).toBe(before);
});
