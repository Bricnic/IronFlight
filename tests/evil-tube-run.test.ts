import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { SCREW_POSITIONS, screwWave, volcanoPhase } from "../src/gauntlet-timing";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";
import { driveEvilTubeToCompletion } from "./evil-tube-drive";

const id = "custom:evil-tube-run";
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(officialFileTracks.find((track) => track.id === id)!);
});
function race() {
  const sim = new Simulation();
  sim.startTrack(id);
  return sim;
}

it("completes the evil tube run within the six-minute limit", () => {
  const elapsed = driveEvilTubeToCompletion();
  expect(elapsed).toBeLessThan(360);
});

it("mounts the double-size book hinge twofold up and out", () => {
  const sim = race();
  try {
    const book = sim.comic.mechanisms.find((m) => m.h.id === "molar-tome")!;
    expect(book.h.scale).toBe(2);
    const hinge = book.bodies[0].translation();
    expect(hinge.x).toBeCloseTo(-48);
    expect(hinge.y).toBeCloseTo(23 + 2.4);
    expect(hinge.z).toBeCloseTo(-100 + 10);
    const teeth = sim.comic.mechanisms.find((m) => m.h.id === "spike-jaws")!;
    const jaw = teeth.bodies[0].translation();
    expect(jaw.y).toBeCloseTo(9 + 1.2);
    expect(jaw.z).toBeCloseTo(-70 + 5);
  } finally {
    sim.dispose();
  }
});

it("the double-size book kills past the single-size footprint", () => {
  const sim = race();
  try {
    sim.body.setTranslation({ x: -40, y: 26, z: -100 }, true);
    sim.run(3.5, { brake: 1 });
    expect(sim.status).toBe("wrecked");
    expect(sim.damageEvents.at(-1)?.source).toBe("book");
  } finally {
    sim.dispose();
  }
});

it("the lava spike jaws kill on contact", () => {
  const sim = race();
  try {
    sim.body.setTranslation({ x: 346, y: 11.5, z: -70 }, true);
    sim.run(3.5, { brake: 1 });
    expect(sim.status).toBe("wrecked");
    expect(sim.damageEvents.at(-1)?.source).toBe("teeth");
  } finally {
    sim.dispose();
  }
});

it("launches the car backward and upward on a rising screw", () => {
  const sim = race();
  try {
    const { h } = sim.dungeon.gauntlet.machines.get("brass-screws")!;
    const { x, z } = SCREW_POSITIONS[screwWave(0, h.phase).shots[0].index];
    sim.body.setTranslation({ x: h.x + x, y: 25, z: h.z + z }, true);
    sim.run(0.37, { brake: 1 });
    expect(sim.damageEvents.some((e) => e.source === "screw-field")).toBe(true);
    expect(sim.body.linvel().z).toBeLessThan(-20);
    expect(sim.body.linvel().y).toBeGreaterThan(12);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("wrecks a truck in the erupting plume, but leaves the same space safe between eruptions", () => {
  const sim = race();
  try {
    const { h } = sim.dungeon.gauntlet.machines.get("north-crater")!;
    while (volcanoPhase(sim.time + h.phase).erupting) sim.run(0.1);
    sim.body.setTranslation({ x: 374, y: 14, z: -317.9 }, true);
    sim.run(0.12);
    expect(sim.status).toBe("driving");
    sim.startTrack(id);
    while (!volcanoPhase(sim.time + h.phase).erupting) sim.run(0.1);
    sim.body.setTranslation({ x: 374, y: 14, z: -317.9 }, true);
    sim.run(0.2);
    expect(sim.status).toBe("wrecked");
    expect(sim.damageEvents.at(-1)?.source).toBe("volcano");
  } finally {
    sim.dispose();
  }
});

it("the trap path bumps slow the car without damage", () => {
  const sim = race();
  try {
    sim.body.setTranslation({ x: -24, y: 24.8, z: -12 }, true);
    for (let i = 0; i < 30 / DT; i++) {
      const p = sim.body.translation();
      const v = sim.body.linvel();
      const speed = Math.hypot(v.x, v.z);
      if (p.z >= 26) {
        if (speed < 0.5) break;
        sim.step({ brake: 1 });
      } else {
        sim.step({ throttle: speed < 5 ? 1 : 0, brake: speed > 6.5 ? 0.5 : 0 });
      }
    }
    expect(sim.body.translation().z).toBeGreaterThan(25);
    expect(sim.status).toBe("driving");
    expect(sim.snapshot(false).integrity).toBe(1);
    expect(sim.damageEvents).toEqual([]);
  } finally {
    sim.dispose();
  }
});

it("the lava spill destroys parts on contact", () => {
  const sim = race();
  try {
    sim.body.setTranslation({ x: 329.5, y: 10.5, z: -70 }, true);
    sim.run(0.5, { brake: 1 });
    expect(sim.damageEvents.some((e) => e.source === "lava")).toBe(true);
    expect(sim.snapshot(false).integrity).toBeLessThan(1);
  } finally {
    sim.dispose();
  }
});

it("the evil tube shoots the trap path into a spiked lava dead end", () => {
  const sim = race();
  try {
    sim.body.setTranslation({ x: -24, y: 24.8, z: -12 }, true);
    let entered = false;
    for (let i = 0; i < 25 / DT && sim.status === "driving"; i++) {
      const ride = sim.guidedPipe.snapshot();
      if (ride?.id === "evil-tube") {
        entered = true;
        break;
      }
      if (ride) break;
      const p = sim.body.translation();
      if (p.z > 40) break;
      const v = sim.body.linvel();
      const speed = Math.hypot(v.x, v.z);
      const steer = Math.max(-1, Math.min(1, (-24 - p.x) * 0.3));
      sim.step({ steer, throttle: speed < 8 ? 1 : 0 });
    }
    expect(entered).toBe(true);
    expect(sim.guidedPipe.snapshot()?.id).toBe("evil-tube");
    for (let i = 0; i < 20 / DT && sim.guidedPipe.snapshot(); i++) sim.step({});
    expect(sim.guidedPipe.snapshot()).toBeNull();
    const exit = sim.body.translation();
    expect(exit.x).toBeCloseTo(-60, 0);
    expect(exit.z).toBeGreaterThan(110);
    for (let i = 0; i < 5 / DT && sim.status === "driving"; i++) sim.step({ brake: 1 });
    expect(sim.status).toBe("wrecked");
    expect(sim.damageEvents.some((e) => e.source === "lava" || e.source === "teeth")).toBe(true);
    expect(sim.trackRun!.status).not.toBe("completed");
  } finally {
    sim.dispose();
  }
});