import { test, expect, type Page } from "@playwright/test";
import { PREFAB_KINDS } from "../src/custom-level";

test.use({ viewport: { width: 960, height: 720 } });
test.slow();

async function playtest(page: Page) {
  await page.locator("#editor-playtest").click();
  await expect(page.locator("#level-editor")).toBeHidden({ timeout: 20000 });
  await expect(page.locator("#placement-bar")).toBeVisible();
  await page.evaluate(() => window.__game!.pause(true));
  await page.waitForLoadState("networkidle");
}

async function editNumber(page: Page, prop: string, value: number) {
  const input = page.locator(`#editor-props input[data-prop="${prop}"]`);
  await input.fill(String(value));
  await input.dispatchEvent("change");
}

// Decode the actual screenshots, rather than comparing PNG compression or
// trusting scene/collider counts. Ignore small antialiasing differences.
async function changedPixels(page: Page, before: Buffer, after: Buffer) {
  return page.evaluate(
    async ([a, b]) => {
      async function pixels(base64: string) {
        const img = new Image();
        img.src = `data:image/png;base64,${base64}`;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height).data;
      }
      const [left, right] = await Promise.all([pixels(a), pixels(b)]);
      let changed = 0;
      for (let i = 0; i < left.length; i += 4)
        if (
          Math.max(
            ...[0, 1, 2].map((c) => Math.abs(left[i + c] - right[i + c])),
          ) > 20
        )
          changed++;
      return changed;
    },
    [before.toString("base64"), after.toString("base64")],
  );
}

for (const kind of [...PREFAB_KINDS, "wall"] as const) {
  test(`${kind} added in front of the player is visible on repeated playtest`, async ({
    page,
  }, info) => {
    const name = `e2e-visible-${kind}`;
    await page.goto("/");
    await page.waitForFunction(() => !!window.__game);
    // Freeze RAF so every playtest captures time zero with the same chase
    // camera and truck pose. Network-backed editor saves still run normally.
    // Use an explicit future time relative to install: pausing at the host's
    // current time can already be in the browser clock's past under load.
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
    await page
      .getByRole("button", { name: "Level editor", exact: true })
      .click();
    await page.locator("#editor-name").fill(name);
    await page.locator("#editor-new").click();
    try {
      await playtest(page);
      const canvas = page.locator("#viewport canvas");
      const empty = await canvas.screenshot({
        path: info.outputPath("empty.png"),
      });
      // Starting with an already-rendered level is essential: the regression
      // reused its old geometry when the editor saved under the same name.
      await page
        .getByRole("button", { name: "Level editor", exact: true })
        .click();
      if (kind === "wall") {
        await page.locator("#editor-solid-kind").selectOption("barrier");
        await page.locator("#editor-add-solid").click();
        await editNumber(page, "w", 12);
        await editNumber(page, "h", 5);
        await editNumber(page, "d", 2);
        await editNumber(page, "y", 2.5);
      } else {
        await page.locator("#editor-prefab-kind").selectOption(kind);
        await page.locator("#editor-add-prefab").click();
      }
      await editNumber(page, "x", 0);
      await editNumber(page, "z", -18);
      await playtest(page);
      const placed = await canvas.screenshot({
        path: info.outputPath(`${kind}.png`),
      });
      await info.attach("playtest with object", {
        body: placed,
        contentType: "image/png",
      });
      expect(
        await changedPixels(page, empty, placed),
        `${kind} must change visible game pixels`,
      ).toBeGreaterThan(100);

      // Exercise another save/replay as well: deleted models must disappear,
      // rather than leaving stale geometry that could satisfy the first check.
      await page
        .getByRole("button", { name: "Level editor", exact: true })
        .click();
      // Reopening syncs the saved level and clears the editor selection.
      const id = await page.evaluate(
        async ({ name, kind }) => {
          const level = await window.__game!.customLevels.load(name);
          return kind === "wall"
            ? level.solids.at(-1)!.id
            : level.prefabs[0].id;
        },
        { name, kind },
      );
      await page
        .locator(`li[data-key="${kind === "wall" ? "solid" : "prefab"}:${id}"]`)
        .click();
      await page.locator("#editor-remove").click();
      await playtest(page);
      const removed = await canvas.screenshot({
        path: info.outputPath("removed.png"),
      });
      expect(await changedPixels(page, placed, removed)).toBeGreaterThan(100);
      expect(await changedPixels(page, empty, removed)).toBeLessThan(20);
    } finally {
      await page.evaluate(
        (levelName) => window.__game!.customLevels.remove(levelName),
        name,
      );
    }
  });
}
