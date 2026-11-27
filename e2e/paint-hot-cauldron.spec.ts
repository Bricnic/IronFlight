import { test, expect, type Page } from "@playwright/test";

// Paints the Hot Cauldron base circuits through the real draw-from-minimap
// UI. A follow-up enrichment script adds lava, hazards, gates and decor.
test.slow();

async function openEditor(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
}

async function paintStroke(page: Page, pts: [number, number][]) {
  await page.mouse.move(pts[0][0], pts[0][1]);
  await page.mouse.down();
  for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 2 });
  await page.mouse.up();
}

async function paintLevel(
  page: Page,
  name: string,
  brush: number,
  paths: (box: { x: number; y: number; width: number; height: number }) => [number, number][][],
) {
  await page.evaluate((n) => window.__game!.customLevels.remove(n).catch(() => {}), name);
  await page.locator("#editor-name").fill(name);
  await page.locator("#editor-new").click();
  await page.locator("#editor-paint-mode").click();
  await expect(page.locator("#editor-paint-layer")).toBeVisible();
  await page.locator("#editor-paint-width").fill(String(brush));
  const box = (await page.locator("#editor-paint-canvas").boundingBox())!;
  for (const pts of paths(box)) await paintStroke(page, pts);
  await page.locator("#editor-paint-materialize").click();
  await expect(page.locator("#editor-status")).toContainText("Materialized");
  await page.locator("#editor-folder").fill("official/hot-cauldron");
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
}

const circle = (cx: number, cy: number, r: number, n = 64, close = true): [number, number][] => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  if (!close) pts.pop();
  return pts;
};

test("paint Figure Eight Inferno", async ({ page }) => {
  await openEditor(page);
  await paintLevel(page, "Figure Eight Inferno", 12, (box) => {
    // Lemniscate through the middle; the hole and jumps come later.
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const a = Math.min(box.width, box.height) * 0.33;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 140; i++) {
      const t = (i / 140) * Math.PI * 2;
      const d = 1 + Math.sin(t) ** 2;
      pts.push([cx + ((a * Math.cos(t)) / d) * 1.35, cy + ((a * Math.sin(t) * Math.cos(t)) / d) * 1.35]);
    }
    return [pts];
  });
});

test("paint Double Serpent", async ({ page }) => {
  await openEditor(page);
  await paintLevel(page, "Double Serpent", 12, (box) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 160; i++) {
      const t = i / 160;
      pts.push([
        box.x + box.width * (0.12 + 0.76 * t),
        box.y + box.height * (0.5 + 0.18 * Math.sin(t * Math.PI * 4)),
      ]);
    }
    return [pts];
  });
});

test("paint Spiral Ascent", async ({ page }) => {
  await openEditor(page);
  await paintLevel(page, "Spiral Ascent", 12, (box) => {
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const R = Math.min(box.width, box.height) * 0.4;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 220; i++) {
      const t = i / 220;
      const a = t * Math.PI * 2 * 2.75;
      const r = R * (1 - 0.78 * t);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return [pts];
  });
});

test("paint Caldera Rim", async ({ page }) => {
  await openEditor(page);
  await paintLevel(page, "Caldera Rim", 14, (box) => [
    circle(box.x + box.width / 2, box.y + box.height / 2, Math.min(box.width, box.height) * 0.3),
  ]);
});

test("paint Ember Falls", async ({ page }) => {
  await openEditor(page);
  await paintLevel(page, "Ember Falls", 12, (box) => {
    // Out along the top, hairpin, back along the bottom.
    const pts: [number, number][] = [];
    const x0 = box.x + box.width * 0.2, x1 = box.x + box.width * 0.8;
    const yT = box.y + box.height * 0.32, yB = box.y + box.height * 0.68;
    for (let i = 0; i <= 50; i++) pts.push([x0 + ((x1 - x0) * i) / 50, yT]);
    for (let i = 1; i <= 30; i++) {
      const a = -Math.PI / 2 + (i / 30) * Math.PI;
      pts.push([x1 + Math.cos(a) * ((yB - yT) / 2), (yT + yB) / 2 + Math.sin(a) * ((yB - yT) / 2)]);
    }
    for (let i = 1; i <= 50; i++) pts.push([x1 - ((x1 - x0) * i) / 50, yB]);
    return [pts];
  });
});

test("paint Hot Cauldron Dream", async ({ page }) => {
  await openEditor(page);
  await paintLevel(page, "Hot Cauldron Dream", 8, (box) => {
    // Serpent approach, a wings gap, then a landing loop.
    const top: [number, number][] = [];
    for (let i = 0; i <= 90; i++) {
      const t = i / 90;
      top.push([
        box.x + box.width * (0.12 + 0.4 * t),
        box.y + box.height * (0.3 + 0.14 * Math.sin(t * Math.PI * 3)),
      ]);
    }
    const land: [number, number][] = [];
    for (let i = 0; i <= 90; i++) {
      const t = i / 90;
      land.push([
        box.x + box.width * (0.62 + 0.26 * t),
        box.y + box.height * (0.62 + 0.14 * Math.sin(t * Math.PI * 2 + 1)),
      ]);
    }
    return [top, land];
  });
});
