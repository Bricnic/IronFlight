import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { loopDriver } from "./loop-driver";
import { ROUTES } from "../src/routes";
beforeAll(initPhysics);
for (const route of ROUTES)
  it(`Triple Loop ${route.id} requires the full jump, loop and exit from spawn`, () => {
    const s = new Simulation();
    s.startTrack("triple-loop", route.id);
    let sawJumpOnlyFinish = false;
    for (let i = 0; i < 7200 && s.trackRun?.status === "running"; i++) {
      s.step(loopDriver(s.snapshot(), route.x));
      if (s.status === "finished" && !s.loopCompleted) {
        sawJumpOnlyFinish = true;
        expect(s.trackRun.status).toBe("running");
      }
    }
    expect(
      sawJumpOnlyFinish,
      JSON.stringify({
        position: s.body.translation(),
        run: s.trackRun?.snapshot(),
        landed: s.landed,
        status: s.status,
      }),
    ).toBe(true);
    expect(s.trackRun?.status).toBe("completed");
    expect(s.loopApex).toBe(true);
    expect(s.loopCompleted).toBe(true);
    expect(s.snapshot().upDot).toBeGreaterThan(0.8);
    expect(s.trackRun?.checkpoint).toBe(3);
    s.dispose();
  });
