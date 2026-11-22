import { test, expect } from "@playwright/test";

test.slow();
const id = "custom:sweet-celebrations-dream";

test("flies from flat ground to the cherry-top star without visiting the ramp", async ({ page }, info) => {
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
  const result = await page.evaluate(id => {
    const g = window.__game!; g.startTrack(id as `custom:${string}`); g.pause(true);
    const star = g.track(id).goldStars![0];
    let held = false, flaps = 0, maxZ = -Infinity;
    for (let frame = 0; frame < 7200 && !g.snapshot().run!.stars.length; frame++) {
      g.driveFrames(1, 1, s => {
        const p = s.position, v = s.velocity, equipped = !!s.run?.wings;
        maxZ = Math.max(maxZ, p.z);
        const target = equipped ? star : { x: 4, y: 2, z: 180 };
        const distance = Math.hypot(target.x - p.x, target.z - p.z);
        const aim = Math.atan2(target.x - p.x, target.z - p.z) - Math.atan2(s.forward[0], s.forward[2]);
        const error = Math.atan2(Math.sin(aim), Math.cos(aim));
        const flap = equipped && !held && p.y < star.y + 2 && v.y < Math.min(5, (star.y + 1 - p.y) * 0.8);
        if (flap) flaps++;
        held = flap;
        const pace = Math.hypot(v.x, v.z), speed = equipped ? Math.max(2, Math.min(12, distance * 0.35)) : 12;
        const pitch = Math.asin(Math.max(-1, Math.min(1, s.forward[1])));
        return { throttle: pace < speed ? 1 : 0, brake: !equipped && pace > speed + 1 ? 0.5 : 0,
          steer: Math.max(-1, Math.min(1, error * 1.5)), airPitch: s.flying ? Math.max(-1, Math.min(1, -pitch * 2)) : 0, handbrake: Number(flap) };
      }, false);
      if (g.snapshot().status !== "driving") break;
    }
    const ramp = g.track(id).custom!.solids.find(s => s.kind === "ramp")!;
    g.frameSpot(star.x, star.y - 8, star.z, 65, 0.65, 0.45);
    return { snapshot: g.snapshot(), flaps, maxZ, rampStart: ramp.z - ramp.d / 2 };
  }, id);
  expect(result.snapshot.run!.stars).toContain("gold-star-1");
  expect(result.snapshot.position.y).toBeGreaterThan(40);
  expect(result.flaps).toBeGreaterThan(1);
  expect(result.maxZ).toBeLessThan(result.rampStart);
  await page.screenshot({ path: info.outputPath("cherry-star-flight.png") });
});

test("live keyboard, both sticks, mouse and persistent flight tuning work", async ({ page }, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("iron-flight-settings-v1", JSON.stringify({ video: "low", input: "controller" }));
    const pad = { connected: true, id: "Flight test pad", axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.assign(window, { __flightPad: pad });
    Object.defineProperty(navigator, "getGamepads", { value: () => [pad] });
    Object.defineProperty(document, "hasFocus", { value: () => true });
  });
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.keyboard.press("Backquote");
  for (const [key, value] of [["flightJumpStrength", "1.6"], ["flightLookPower", "2.1"], ["flightSteerPower", "1.1"]]) {
    const slider = page.locator(`#tune-${key}`);
    await expect(slider).toHaveAttribute("min", "0.1");
    await slider.fill(value); await slider.dispatchEvent("input");
  }
  await page.reload(); await page.waitForFunction(() => !!window.__game);
  expect(await page.evaluate(() => window.__game!.snapshot().tuning)).toMatchObject({ flightJumpStrength: 1.6, flightLookPower: 2.1, flightSteerPower: 1.1 });
  await page.keyboard.press("Backquote"); await page.getByRole("button", { name: "Reset tuning", exact: true }).click();
  await page.locator("#tune-flightJumpStrength").scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("flight-tuning.png") });
  await page.keyboard.press("Backquote");
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.evaluate(id => {
    const g = window.__game!; g.startTrack(id as `custom:${string}`); g.pause(true); g.place({ x: 4, y: 2, z: 180 }, 0); g.advanceFrames(5, 1, {});
    g.place({ x: 0, y: 60, z: 200 }, 0); g.setVelocity({ x: 0, y: 0, z: 12 }); g.advanceFrames(1, 1, {});
  }, id);
  await expect(page.locator("#handbrake-label")).toHaveText("FLAP WINGS");
  await page.keyboard.down("Space"); await page.keyboard.down("w");
  await page.evaluate(() => window.__game!.advanceFrames(1, 1));
  const jumped = await page.evaluate(() => window.__game!.snapshot());
  expect(jumped.velocity.y).toBeGreaterThan(10);
  await page.evaluate(() => window.__game!.advanceFrames(10, 1));
  expect((await page.evaluate(() => window.__game!.snapshot())).velocity.y).toBeLessThan(jumped.velocity.y);
  await page.keyboard.up("Space"); await page.keyboard.up("w");
  await page.keyboard.down("ArrowLeft"); await page.evaluate(() => window.__game!.advanceFrames(20, 1)); await page.keyboard.up("ArrowLeft");
  expect((await page.evaluate(() => window.__game!.snapshot())).forward[0]).toBeGreaterThan(0.1);
  // B launches, the left stick steers, and the right stick independently looks/steers.
  const padState = await page.evaluate(() => {
    const g = window.__game!, pad = (window as unknown as { __flightPad: { axes: number[]; buttons: { pressed: boolean; value: number }[] } }).__flightPad;
    g.place({ x: 0, y: 60, z: 200 }, 0); g.setVelocity({ x: 0, y: 0, z: 12 }); g.advanceFrames(1, 1, {});
    pad.buttons[1] = { pressed: true, value: 1 }; pad.axes[0] = -1;
    g.advanceFrames(20, 1); const left = g.snapshot();
    pad.buttons[1] = { pressed: false, value: 0 }; pad.axes[0] = 0;
    g.place({ x: 0, y: 60, z: 200 }, 0); g.setVelocity({ x: 0, y: 0, z: 12 }); pad.axes[2] = 1;
    g.advanceFrames(20, 1); const right = g.snapshot(); pad.axes[2] = 0;
    g.place({ x: 0, y: 60, z: 200 }, 0); g.setVelocity({ x: 0, y: 0, z: 12 }); g.advanceFrames(1, 1, {});
    return { left, right };
  });
  expect(padState.left.velocity.y).toBeGreaterThan(10); expect(padState.left.forward[0]).toBeGreaterThan(0.1);
  expect(padState.right.forward[0]).toBeLessThan(-0.2);
  const canvas = page.locator("#viewport canvas");
  const box = await canvas.boundingBox(); expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2); await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 - 30, box!.y + box!.height / 2 - 15);
  await page.evaluate(() => window.__game!.advanceFrames(1, 1)); await page.mouse.up();
  const mouse = await page.evaluate(() => window.__game!.snapshot());
  expect(mouse.forward[0]).toBeGreaterThan(0.02); expect(mouse.forward[1]).toBeGreaterThan(0.005);
});
