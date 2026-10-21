import { test, expect } from "@playwright/test";

for (const key of ["s", " "])
  test(`maximum ${key === "s" ? "service brake" : "handbrake"} stops a speeding truck upright using keyboard controls`, async ({
    page,
  }, testInfo) => {
    await page.goto("/?test=1");
    await page.waitForFunction(() => !!window.__game);
    await page.evaluate(() => {
      const g = window.__game!;
      g.select("lab");
      g.pause(true);
      g.setTuning({
        acceleration: 4.5,
        topSpeed: 1.3,
        brakePower: 10,
        handbrakePower: 10,
      });
      g.advanceFrames(60, 1, {});
    });
    await page.keyboard.down("w");
    await page.evaluate(() => window.__game!.advanceFrames(180, 1));
    await page.keyboard.up("w");
    const start = await page.evaluate(() => window.__game!.snapshot());
    expect(start.speed * 3.6).toBeGreaterThan(100);
    await page.keyboard.down(key);
    const result = await page.evaluate(() => {
      const g = window.__game!;
      const start = g.snapshot();
      let minUp = start.upDot,
        stopTime = 0,
        stopDistance = 0;
      for (let frame = 0; frame < 120; frame++) {
        // Real keyboard input is resolved by the same path used during play.
        g.advanceFrames(1, 1);
        const s = g.snapshot();
        minUp = Math.min(minUp, s.upDot);
        if (!stopTime && s.signedSpeed < 0.5) {
          stopTime = s.time - start.time;
          stopDistance = Math.abs(s.position.z - start.position.z);
        }
      }
      return {
        minUp,
        stopTime,
        stopDistance,
        startMPH: start.speed * 3.6,
        end: g.snapshot(),
      };
    });
    await page.keyboard.up(key);
    expect(result.stopTime).toBeGreaterThan(0);
    expect(result.stopTime).toBeLessThan(1.5);
    expect(result.stopDistance).toBeLessThan(25);
    expect(result.minUp).toBeGreaterThan(0.97);
    expect(result.end.integrity).toBe(start.integrity);
    if (key === " ") expect(result.end.speed).toBeLessThan(0.05);
    else expect(result.end.signedSpeed).toBeLessThan(-1);
    await testInfo.attach("braking measurements", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
    await page.screenshot({
      path: `artifacts/braking-${key === "s" ? "service" : "handbrake"}.png`,
    });
  });
