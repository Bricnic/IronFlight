import { test, expect, type Page } from "@playwright/test";
test.slow();
async function openEditor(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await expect(page.locator("#level-editor canvas")).toHaveCount(1);
}
test("wireframe editor creates, edits and saves", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() =>
    window.__game!.customLevels.remove("e2e-edit").catch(() => {}),
  );
  await page.locator("#editor-name").fill("e2e-edit");
  await page.locator("#editor-new").click();
  await page.locator("#editor-solid-kind").selectOption("barrier");
  await page.locator("#editor-add-solid").click();
  const x = page.locator('#editor-props input[data-prop="x"]');
  await x.fill("30");
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText("Saved e2e-edit");
  const probe = await page.evaluate(() => window.__game!.editor());
  expect(probe).toMatchObject({ name: "e2e-edit", solids: 3, dirty: false });
  const loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("e2e-edit"),
  );
  expect(loaded.solids.find((s) => s.kind === "barrier")?.x).toBe(30);
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "e2e-edit",
  );
});
test("wireframe editor reloads and deletes from disk", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(async () => {
    const g = window.__game!;
    await g.customLevels.remove("e2e-edit").catch(() => {});
    await g.customLevels.save({
      name: "e2e-edit",
      mode: "race",
      spawn: { x: 0, y: 2.1, z: -40, yaw: 0 },
      checkpoints: [{ x: 0, z: 40 }],
      solids: [
        {
          id: "ground",
          kind: "ground",
          x: 0,
          y: -0.6,
          z: 0,
          w: 200,
          h: 1.2,
          d: 200,
          color: 0x6d817c,
        },
        {
          id: "barrier-1",
          kind: "barrier",
          x: 30,
          y: 0.8,
          z: 0,
          w: 6,
          h: 1.6,
          d: 5,
          color: 0xe6c16a,
        },
      ],
      prefabs: [],
      medals: { gold: 30, silver: 45, bronze: 60 },
    });
  });
  await page.reload();
  await openEditor(page);
  await page.locator("#editor-levels").selectOption("e2e-edit");
  await expect(page.locator("#editor-status")).toContainText("Opened e2e-edit");
  let probe = await page.evaluate(() => window.__game!.editor());
  expect(probe).toMatchObject({ name: "e2e-edit", solids: 2 });
  await page.locator('#editor-objects li[data-key="solid:barrier-1"]').click();
  await page.locator("#editor-remove").click();
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText("Saved e2e-edit", {
    timeout: 15000,
  });
  probe = await page.evaluate(() => window.__game!.editor());
  expect(probe.solids).toBe(1);
  const loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("e2e-edit"),
  );
  expect(loaded.solids).toHaveLength(1);
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "e2e-edit",
  );
});
test("wireframe editor assigns a texture per primitive", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() =>
    window.__game!.customLevels.remove("e2e-tex").catch(() => {}),
  );
  await page.locator("#editor-name").fill("e2e-tex");
  await page.locator("#editor-new").click();
  await page.locator("#editor-solid-kind").selectOption("barrier");
  await page.locator("#editor-add-solid").click();
  await page
    .locator('#editor-props select[data-prop="texture"]')
    .selectOption("rock_06");
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText("Saved e2e-tex");
  const loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("e2e-tex"),
  );
  expect(
    loaded.solids.find((s) => s.kind === "barrier")?.texture,
  ).toBe("rock_06");
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "e2e-tex",
  );
});
test("wireframe editor blocks invalid saves with an error", async ({
  page,
}) => {
  await openEditor(page);
  await page.locator("#editor-name").fill("");
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-error")).toContainText("name");
  let probe = await page.evaluate(() => window.__game!.editor());
  expect(probe.levels).not.toContain("");
  await page.locator("#editor-name").fill("e2e-bad");
  await page.locator('#editor-objects li[data-key="checkpoint:0"]').click();
  await page.locator("#editor-remove").click();
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-error")).toContainText("checkpoint");
  probe = await page.evaluate(() => window.__game!.editor());
  expect(probe.levels).not.toContain("e2e-bad");
});
test("wireframe viewport selects, moves and deselects with the mouse", async ({
  page,
}) => {
  await openEditor(page);
  await page.evaluate(() =>
    window.__game!.customLevels.remove("e2e-viewport").catch(() => {}),
  );
  await page.locator("#editor-name").fill("e2e-viewport");
  await page.locator("#editor-new").click();
  await page.locator("#editor-solid-kind").selectOption("barrier");
  await page.locator("#editor-add-solid").click();
  const probeSel = () =>
    page.evaluate(() => window.__game!.editor().selection);
  await expect.poll(probeSel, { timeout: 15000 }).toBe("solid:barrier-3");
  const canvas = page.locator("#level-editor canvas");
  const box = (await canvas.boundingBox())!;
  // An empty corner click clears the list-driven selection.
  await page.mouse.click(box.x + 10, box.y + 10);
  await expect.poll(probeSel, { timeout: 15000 }).toBe(null);
  // Clicking the barrier wirebox selects it.
  const at = await page.evaluate(() =>
    window.__game!.editorProject({ x: 4, y: 0.8, z: 0 }),
  );
  await page.mouse.click(at.x, at.y);
  await expect.poll(probeSel, { timeout: 15000 }).toBe("solid:barrier-3");
  const xInput = page.locator('#editor-props input[data-prop="x"]');
  const before = await xInput.inputValue();
  // Dragging relocates it on its own height plane.
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 80, at.y + 40, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(async () => xInput.inputValue(), { timeout: 15000 })
    .not.toBe(before);
  const dirty = await page.evaluate(() => window.__game!.editor().dirty);
  expect(dirty).toBe(true);
  expect(await probeSel()).toBe("solid:barrier-3");
  // Empty click deselects; the move persists to disk.
  await page.mouse.click(box.x + 10, box.y + 10);
  await expect.poll(probeSel, { timeout: 15000 }).toBe(null);
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText(
    "Saved e2e-viewport",
    { timeout: 15000 },
  );
  const loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("e2e-viewport"),
  );
  expect(loaded.solids.find((s) => s.id === "barrier-3")?.x).not.toBe(4);
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "e2e-viewport",
  );
});
test("wireframe tools pan, sample textures and rotate", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() =>
    window.__game!.customLevels.remove("e2e-tools").catch(() => {}),
  );
  await page.locator("#editor-name").fill("e2e-tools");
  await page.locator("#editor-new").click();
  await page.locator("#editor-solid-kind").selectOption("barrier");
  await page.locator("#editor-add-solid").click();
  const tool = () => page.evaluate(() => window.__game!.editor().tool);
  const sel = () => page.evaluate(() => window.__game!.editor().selection);
  await expect.poll(sel, { timeout: 15000 }).toBe("solid:barrier-3");
  expect(await tool()).toBe("select");
  const canvas = page.locator("#level-editor canvas");
  const box = (await canvas.boundingBox())!;
  const project = (point: { x: number; y: number; z: number }) =>
    page.evaluate((p) => window.__game!.editorProject(p), point);
  // Pan drags move the camera target without touching selection.
  await page.locator("#editor-tool-pan").click();
  await expect.poll(tool, { timeout: 15000 }).toBe("pan");
  const before = await project({ x: 4, y: 0.8, z: 0 });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  const after = await project({ x: 4, y: 0.8, z: 0 });
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(
    5,
  );
  expect(await sel()).toBe("solid:barrier-3");
  // Eyedropper copies the ground texture onto the selected barrier.
  await page.locator("#editor-tool-select").click();
  await page.locator("#editor-tool-eyedropper").click();
  await expect.poll(tool, { timeout: 15000 }).toBe("eyedropper");
  const ground = await project({ x: -30, y: 0, z: -30 });
  await page.mouse.click(ground.x, ground.y);
  const texture = page.locator('#editor-props select[data-prop="texture"]');
  await expect
    .poll(async () => texture.inputValue(), { timeout: 15000 })
    .toBe("grass_ground");
  expect(await sel()).toBe("solid:barrier-3");
  // Rotator drags yaw the selection; it persists to disk.
  await page.locator("#editor-tool-rotator").click();
  await expect.poll(tool, { timeout: 15000 }).toBe("rotator");
  const at = await project({ x: 4, y: 0.8, z: 0 });
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 60, at.y, { steps: 8 });
  await page.mouse.up();
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText(
    "Saved e2e-tools",
    { timeout: 15000 },
  );
  const loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("e2e-tools"),
  );
  expect(
    loaded.solids.find((s) => s.id === "barrier-3")?.yaw ?? 0,
  ).toBeGreaterThan(0.1);
  // Pan planes: left drags stay on x/z, right/middle switch to x/y.
  await page.locator("#editor-tool-pan").click();
  await expect.poll(tool, { timeout: 15000 }).toBe("pan");
  const target = () =>
    page.evaluate(() => window.__game!.editor().cameraTarget);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const targetBeforeLeft = await target();
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + 60, { steps: 8 });
  await page.mouse.up();
  const targetAfterLeft = await target();
  expect(targetAfterLeft.z).not.toBeCloseTo(targetBeforeLeft.z, 3);
  expect(targetAfterLeft.y).toBeCloseTo(targetBeforeLeft.y, 6);
  for (const button of ["right", "middle"] as const) {
    const beforeButton = await target();
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button });
    await page.mouse.move(cx, cy + 40, { steps: 8 });
    await page.mouse.up({ button });
    const afterButton = await target();
    expect(afterButton.y).not.toBeCloseTo(beforeButton.y, 3);
    expect(afterButton.z).toBeCloseTo(beforeButton.z, 6);
    expect(await sel()).toBe("solid:barrier-3");
  }
  expect(await sel()).toBe("solid:barrier-3");
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "e2e-tools",
  );
});
test("wireframe rotator spins euler angles and drives the yawed wall", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(async () => {
    const g = window.__game!;
    await g.customLevels.remove("e2e-euler").catch(() => {});
    await g.customLevels.save({
      name: "e2e-euler",
      mode: "race",
      spawn: { x: 0, y: 2.1, z: -40, yaw: 0 },
      checkpoints: [{ x: 0, z: 40 }],
      solids: [
        {
          id: "ground",
          kind: "ground",
          x: 0,
          y: -0.6,
          z: 0,
          w: 200,
          h: 1.2,
          d: 200,
          color: 0x6d817c,
          texture: "grass_ground",
        },
        {
          id: "road-1",
          kind: "road",
          x: 0,
          y: 0.015,
          z: 0,
          w: 24,
          h: 0.03,
          d: 110,
          color: 0x303e49,
          texture: "asphalt_02",
        },
        {
          id: "yaw-1",
          kind: "barrier",
          x: 3,
          y: 1.5,
          z: 20,
          w: 24,
          h: 3,
          d: 1,
          color: 0xe6c16a,
        },
        {
          id: "spin-1",
          kind: "barrier",
          x: 10,
          y: 0.8,
          z: -20,
          w: 6,
          h: 1.6,
          d: 5,
          color: 0xe6c16a,
        },
      ],
      prefabs: [],
      medals: { gold: 30, silver: 45, bronze: 60 },
    });
  });
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await expect(page.locator("#level-editor canvas")).toHaveCount(1);
  await page.locator("#editor-levels").selectOption("e2e-euler");
  await expect(page.locator("#editor-status")).toContainText(
    "Opened e2e-euler",
    { timeout: 15000 },
  );
  // A diagonal rotator drag spins yaw, pitch and roll together.
  await page.locator("#editor-tool-rotator").click();
  const at = await page.evaluate((p) => window.__game!.editorProject(p), {
    x: 10,
    y: 0.8,
    z: -20,
  });
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 70, at.y + 50, { steps: 10 });
  await page.mouse.up();
  // The yaw numeric swings the road-blocking wall open.
  await page.locator('#editor-objects li[data-key="solid:yaw-1"]').click();
  await page.locator('#editor-props input[data-prop="yaw"]').fill("1.5708");
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText(
    "Saved e2e-euler",
    { timeout: 15000 },
  );
  const loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("e2e-euler"),
  );
  const spin = loaded.solids.find((s) => s.id === "spin-1")!;
  expect(Math.abs(spin.yaw ?? 0)).toBeGreaterThan(0.02);
  expect(Math.abs(spin.angle ?? 0)).toBeGreaterThan(0.02);
  expect(spin.roll).toBeDefined();
  expect(
    loaded.solids.find((s) => s.id === "yaw-1")?.yaw,
  ).toBeCloseTo(Math.PI / 2, 3);
  // The opened wall lets the truck through in a real playtest.
  await page.locator("#editor-playtest").click();
  await expect(page.locator("#level-editor")).toBeHidden({ timeout: 20000 });
  await expect(page.locator("#placement-bar")).toBeVisible();
  const endZ = await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    for (let i = 0; i < 30; i++)
      g.driveFrames(1, 16, () => ({ throttle: 1, steer: 0, brake: 0 }), false);
    return g.snapshot().position.z;
  });
  expect(endZ).toBeGreaterThan(21);
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "e2e-euler",
  );
});
test("back leaves immediately when clean", async ({ page }) => {
  await openEditor(page);
  await page.locator("#editor-back").click();
  await expect(page.locator("#level-editor")).toBeHidden();
  await expect(page.locator("#editor-unsaved")).toBeHidden();
});
test("back prompts on unsaved changes", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() =>
    window.__game!.customLevels.remove("e2e-back").catch(() => {}),
  );
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await page.locator("#editor-name").fill("e2e-back");
  await page.locator("#editor-new").click();
  await page.locator("#editor-solid-kind").selectOption("barrier");
  await page.locator("#editor-add-solid").click();
  await expect(page.locator("#editor-status")).toContainText("Unsaved changes");
  // Cancel stays in the editor.
  await page.locator("#editor-back").click();
  await expect(page.locator("#editor-unsaved")).toBeVisible();
  await page.locator("#editor-unsaved-cancel").click();
  await expect(page.locator("#editor-unsaved")).toBeHidden();
  await expect(page.locator("#level-editor")).toBeVisible();
  // Discard leaves without saving.
  await page.locator("#editor-back").click();
  await page.locator("#editor-unsaved-discard").click();
  await expect(page.locator("#level-editor")).toBeHidden();
  const names = await page.evaluate(() =>
    window.__game!.customLevels.list(),
  );
  expect(names).not.toContain("e2e-back");
  // Save leaves and persists.
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await page.locator("#editor-name").fill("e2e-back");
  await page.locator("#editor-new").click();
  await page.locator("#editor-solid-kind").selectOption("barrier");
  await page.locator("#editor-add-solid").click();
  await page.locator("#editor-back").click();
  await page.locator("#editor-unsaved-save").click();
  await expect(page.locator("#level-editor")).toBeHidden({ timeout: 20000 });
  const loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("e2e-back"),
  );
  expect(loaded.solids.some((s) => s.kind === "barrier")).toBe(true);
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "e2e-back",
  );
});
