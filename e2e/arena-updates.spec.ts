import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Tuning } from "../src/tuning";
async function boot(page: import("@playwright/test").Page) {
  await page.goto("/?test=arena-updates");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => window.__game!.pause(true));
}
test("Store as Defaults writes the source config and Reset tuning reads it", async ({
  page,
  request,
}) => {
  const original = JSON.parse(
    await readFile("src/tuning-defaults.json", "utf8"),
  ) as Tuning;
  try {
    await boot(page);
    await page.keyboard.press("Backquote");
    for (const [key, value] of [
      ["brakePower", "4.2"],
      ["gravity", "0.7"],
    ]) {
      const input = page.locator(`#tune-${key}`);
      await input.fill(value);
      await input.dispatchEvent("input");
    }
    await expect(page.locator("#tune-gravity")).toHaveAttribute("min", "0.1");
    await page
      .getByRole("button", { name: "Store as Defaults", exact: true })
      .click();
    await expect(page.locator("#tuning-status")).toHaveText(
      "Stored in src/tuning-defaults.json.",
    );
    const source = JSON.parse(
      await readFile("src/tuning-defaults.json", "utf8"),
    );
    expect(source.brakePower).toBe(4.2);
    expect(source.gravity).toBe(0.7);
    const brake = page.locator("#tune-brakePower");
    await brake.fill("6.7");
    await brake.dispatchEvent("input");
    await page
      .getByRole("button", { name: "Reset tuning", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() => window.__game!.snapshot().tuning.brakePower),
      )
      .toBe(4.2);
    expect(
      await page.evaluate(() => window.__game!.snapshot().gravity.y),
    ).toBeCloseTo(-9.81 * 0.7);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => !!window.__game);
    expect(
      await page.evaluate(() => window.__game!.snapshot().tuning.gravity),
    ).toBe(0.7);
  } finally {
    const response = await request.post("/__tuning-defaults", {
      headers: { Origin: "http://127.0.0.1:5173" },
      data: original,
    });
    expect(response.ok()).toBe(true);
  }
});
test("source defaults endpoint rejects foreign origins and incomplete config", async ({
  request,
}) => {
  const before = await readFile("src/tuning-defaults.json", "utf8");
  expect(
    (
      await request.post("/__tuning-defaults", {
        headers: { Origin: "https://example.com" },
        data: { gravity: 3 },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/__tuning-defaults", {
        headers: { Origin: "http://127.0.0.1:5173" },
        data: { gravity: 3 },
      })
    ).status(),
  ).toBe(400);
  expect(await readFile("src/tuning-defaults.json", "utf8")).toBe(before);
});
test("the dark truck shadow stays visible when driving on grass", async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => {
    const g = window.__game!;
    g.select("easy");
    g.place({ x: -45, y: 2.1, z: -65 }, 0);
    g.advanceFrames(60, 1, { throttle: 0.3 });
  });
  const stats = await page.evaluate(() => ({
    art: window.__game!.stats(),
    state: window.__game!.snapshot(),
  }));
  expect(stats.state.surfaces).toContain("grass");
  expect(stats.art.shadow.visible).toBe(true);
  expect(stats.art.shadow.opacity).toBeGreaterThan(0.6);
  expect(stats.art.shadow.y).toBeCloseTo(-0.108, 2);
  await page.screenshot({ path: "artifacts/grass-shadow.png" });
});
test("lava actually changes visible pixels while drifting inside a grounded stone basin", async ({
  page,
}) => {
  await boot(page);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    window.__game!.select("easy");
    window.__game!.lavaOverview();
  });
  const probe = await page.evaluate(() => window.__game!.environmentProbe());
  const clip = {
    x: Math.round(probe.x) - 16,
    y: Math.round(probe.y) - 16,
    width: 32,
    height: 32,
  };
  const a = await page.screenshot({ clip });
  const repeat = await page.screenshot({ clip });
  expect(Buffer.compare(a, repeat)).toBe(0);
  await page.screenshot({ path: "artifacts/lava-basin-before.png" });
  await page.evaluate(() => window.__game!.advanceFrames(120, 1, {}));
  const b = await page.screenshot({ clip });
  expect(Buffer.compare(a, b)).not.toBe(0);
  expect(
    await page.evaluate(() => window.__game!.stats().lavaOffsets[0][0]),
  ).toBeCloseTo(0.07);
  await page.screenshot({ path: "artifacts/lava-basin-after.png" });
});
for (const [kind, fast] of [
  ["sign", false],
  ["trash", false],
  ["barrel", false],
  ["barrel", true],
] as const)
  test(`${kind} ${fast ? "high" : "low"} speed collision uses actual driving physics`, async ({
    page,
  }, info) => {
    await boot(page);
    const state = await page.evaluate(
      ({ kind, fast }) => {
        const g = window.__game!;
        g.select("lab");
        const prop = g.snapshot().props.find((p) => p.kind === kind)!;
        g.place(
          {
            x: prop.position.x - 1.65,
            y: 1.94,
            z: prop.position.z - (fast ? 60 : 4),
          },
          0,
        );
        let hit = false;
        for (let frame = 0; frame < 360 && !hit; frame++) {
          g.driveFrames(1, 1, () => ({ throttle: 1 }), false);
          const current = g.snapshot().props.find((p) => p.id === prop.id)!;
          hit =
            kind === "sign"
              ? current.broken
              : kind === "trash"
                ? current.spilled
                : fast
                  ? current.burning
                  : Math.hypot(current.velocity.x, current.velocity.z) > 1;
        }
        g.advanceFrames(5, 1, {});
        return g.snapshot();
      },
      { kind, fast },
    );
    const prop = state.props.find((p) => p.kind === kind)!;
    if (kind === "sign") expect(prop.broken).toBe(true);
    if (kind === "trash") expect(prop.trashPieces).toBe(13);
    if (kind === "barrel") expect(prop.burning).toBe(fast);
    await info.attach("prop-impact", {
      body: JSON.stringify(state),
      contentType: "application/json",
    });
    await page.screenshot({
      path: `artifacts/${kind}-${fast ? "fast" : "slow"}-impact.png`,
    });
    if (kind === "barrel" && fast) {
      const box = (await page.locator("canvas").first().boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width / 2 + 400,
        box.y + box.height / 2,
        { steps: 8 },
      );
      await page.mouse.up();
      await page.screenshot({ path: "artifacts/barrel-fast-impact-side.png" });
    }
  });
