import { test, expect } from "@playwright/test";
import { ROUTES } from "../src/routes";
import { LOOP } from "../src/loop";

test("dragon statues visibly cycle jets; prolonged exposure causes real damage", async ({
  page,
}, info) => {
  await page.goto("/?test=dragon");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(
    ({ z }) => {
      const g = window.__game!;
      g.pause(true);
      g.select("easy");
      g.place({ x: -24, y: 2, z }, 0);
      g.advanceFrames(90, 1, {});
    },
    { z: LOOP.dragonZ[0] },
  );
  const burning = await page.evaluate(() => ({
    state: window.__game!.snapshot(),
    art: window.__game!.stats(),
  }));
  expect(burning.state.integrity).toBeGreaterThan(0.42);
  expect(burning.state.integrity).toBeLessThan(0.55);
  expect(burning.art.dragonStatues).toBe(12);
  expect(burning.art.jetsVisible).toBe(6);
  await page.screenshot({ path: info.outputPath("dragon-fire.png") });
  await page.evaluate(() => window.__game!.advanceFrames(120, 1, {}));
  expect(await page.evaluate(() => window.__game!.stats().jetsVisible)).toBe(0);
});

for (const rate of [1, 16])
  for (const route of ROUTES)
    test(`${route.id} jump and dragon loop are feasible at ${rate}x default boost`, async ({
      page,
    }, info) => {
      await page.goto("/?test=loop");
      await page.waitForFunction(() => !!window.__game);
      const data = await page.evaluate(
        ({ stage, x, rate, loop }) => {
          const g = window.__game!;
          g.pause(true);
          g.select(stage);
          let peakSpeed = 0,
            peakY = 0,
            apexContacts = 0;
          const samples: {
            time: number;
            y: number;
            z: number;
            speed: number;
            up: number;
            contacts: number;
          }[] = [];
          for (
            let frame = 0;
            frame < 2400 / rate && !g.snapshot().loopCompleted;
            frame++
          ) {
            g.driveFrames(
              1,
              rate,
              (s) => {
                let theta = Math.atan2(
                  s.position.z - loop.z,
                  loop.radius - s.position.y,
                );
                if (theta < 0) theta += 2 * Math.PI;
                const targetX =
                  x + (12 * (theta - Math.sin(theta))) / (2 * Math.PI);
                const steer =
                  s.position.y > 3 && s.position.z > loop.z - loop.radius - 5
                    ? Math.max(
                        -0.2,
                        Math.min(
                          0.2,
                          (targetX - s.position.x) * 0.08 - s.forward[0] * 0.6,
                        ),
                      )
                    : 0;
                peakSpeed = Math.max(peakSpeed, s.signedSpeed);
                peakY = Math.max(peakY, s.position.y);
                if (s.position.y > 85)
                  apexContacts = Math.max(apexContacts, s.wheelContacts);
                if (s.ticks % 30 === 0)
                  samples.push({
                    time: s.time,
                    y: s.position.y,
                    z: s.position.z,
                    speed: s.signedSpeed,
                    up: s.upDot,
                    contacts: s.wheelContacts,
                  });
                return { throttle: 1, steer };
              },
              false,
            );
          }
          const landing = g.snapshot();
          g.advanceFrames(60 / rate, rate, { throttle: 1 });
          return {
            state: g.snapshot(),
            landing,
            peakSpeed,
            peakY,
            apexContacts,
            samples,
          };
        },
        { stage: route.id, x: route.x, rate, loop: LOOP },
      );
      await info.attach("loop-telemetry", {
        body: JSON.stringify(data, null, 2),
        contentType: "application/json",
      });
      expect(data.state.tuning.boostPower).toBe(3);
      expect(data.state.status).toBe("finished");
      expect(data.state.landed).toBe(true);
      expect(data.peakSpeed).toBeGreaterThan(74);
      expect(data.peakSpeed).toBeLessThan(77);
      expect(data.peakY).toBeGreaterThan(85);
      expect(data.apexContacts).toBeGreaterThanOrEqual(2);
      expect(data.state.loopApex).toBe(true);
      expect(data.state.loopCompleted).toBe(true);
      expect(data.state.upDot).toBeGreaterThan(0.85);
      expect(data.state.wheelContacts).toBeGreaterThanOrEqual(2);
      expect(data.state.integrity).toBeGreaterThan(0.8);
      expect(data.state.position.z).toBeGreaterThan(LOOP.z + 15);
      expect(Math.abs(data.state.position.x - (route.x + 12))).toBeLessThan(6);
      await page.screenshot({
        path: info.outputPath(`${route.id}-loop-${rate}x.png`),
      });
    });
