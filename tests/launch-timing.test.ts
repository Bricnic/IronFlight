import { beforeAll, it, expect } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
beforeAll(initPhysics);
for (const delay of [0, 0.25, 0.5, 1, 2, 4, 8, 16])
  it(`hard route remains feasible after ${delay}s at the start`, () => {
    const s = new Simulation("hard");
    s.run(delay);
    s.run(12, { throttle: 1 });
    const t = s.snapshot();
    expect(
      t.status,
      JSON.stringify({
        delay,
        p: t.position,
        v: t.velocity,
        air: t.airborneTicks,
        landed: t.landed,
        events: t.damageEvents,
      }),
    ).toBe("finished");
    s.dispose();
  });
