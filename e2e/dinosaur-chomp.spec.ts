import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 800, height: 450 } });

// Bite spots mirror the unit tests: the mouth lands on the parked truck.

const DINOS = [
  { track: "custom:jurassic-junction", id: "purple-raptor", x: -52, y: 11, z: 52 },
  { track: "custom:jurassic-junction", id: "gold-pterosaur", x: -4.5, y: 17, z: -39.5 },
  { track: "custom:jurassic-junction", id: "green-spinosaurus", x: 68.5, y: 11, z: -44.7 },
  { track: "custom:emberfall-causeway", id: "ember-wyvern", x: 33, y: 20, z: 19 },
] as const;

for (const dino of DINOS)
  test(`${dino.id} visibly chomps the truck body`, async ({ page }) => {
    test.setTimeout(180000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) =>
        raf((t) => {
          if (!(window as unknown as { __captureFreeze: boolean }).__captureFreeze) cb(t);
        });
    });
    await page.goto("/");
    await page.waitForFunction(() => !!window.__game);
    await page.addStyleTag({
      content:
        "#app > :not(#viewport) { visibility: hidden !important; } #viewport { inset: 0 !important; }",
    });
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    await page.waitForFunction((id) => {
      try {
        window.__game!.track(id);
        return true;
      } catch {
        return false;
      }
    }, dino.track);
    await page.evaluate(
      (d) => {
        const g = window.__game!;
        (window as unknown as { __captureFreeze: boolean }).__captureFreeze = true;
        g.pause(true);
        g.startTrack(d.track);
        g.place({ x: d.x, y: d.y, z: d.z }, 0);
        g.dinosaurOverview(d.id);
      },
      { track: dino.track, id: dino.id, x: dino.x, y: dino.y, z: dino.z },
    );
    const canvas = page.locator("#viewport canvas");
    await canvas.screenshot({ path: `artifacts/dino-chomp/${dino.id}-rest.png` });
    const rest = await page.evaluate((id) => window.__game!.dinosaurStrike(id), dino.id);
    expect(rest, "strike inspection hook").toBeDefined();
    // Lunge entry (~0.3s in): jaw gaping, head visibly diving at the truck.
    await page.evaluate((id) => {
      const g = window.__game!;
      g.advanceFrames(18, 1, {});
      g.dinosaurOverview(id);
    }, dino.id);
    await canvas.screenshot({ path: `artifacts/dino-chomp/${dino.id}-lunge.png` });
    const lunge = await page.evaluate((id) => window.__game!.dinosaurStrike(id), dino.id);
    expect(lunge!.jawOpen).toBeGreaterThan(0.5);
    expect(lunge!.head.y).toBeLessThan(rest!.head.y);
    // First striking frame: the head is fully down on the truck.
    let striking = false;
    for (let i = 0; i < 60 && !striking; i++) {
      striking = await page.evaluate((id) => {
        const g = window.__game!;
        g.advanceFrames(1, 1, {});
        return !!g.snapshot().dungeon.hazards.find((h) => h.id === id)?.striking;
      }, dino.id);
    }
    expect(striking).toBe(true);
    await page.evaluate((id) => window.__game!.dinosaurOverview(id), dino.id);
    await canvas.screenshot({ path: `artifacts/dino-chomp/${dino.id}-strike.png` });
    const hit = await page.evaluate((id) => window.__game!.dinosaurStrike(id), dino.id);
    expect(hit!.head.y).toBeLessThan(rest!.head.y);
    // The pictured bite is a real hit, not a rehearsal.
    const end = await page.evaluate((id) => {
      const g = window.__game!;
      g.advanceFrames(90, 1, {});
      return g.snapshot().dungeon.hazards.find((h) => h.id === id)!.contacts;
    }, dino.id);
    expect(end).toBeGreaterThanOrEqual(1);
    expect(errors).toHaveLength(0);
  });
