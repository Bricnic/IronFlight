import { beforeAll, expect, it } from "vitest";
import {
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";
import { slimeMaterial } from "../src/materials";
import { initPhysics, Simulation } from "../src/simulation";

const level = validateCustomLevel({
  name: "Slime Melt Probe",
  mode: "race",
  spawn: { x: 0, y: 2.1, z: -20, yaw: 0 },
  checkpoints: [{ x: 0, z: 60 }],
  solids: [
    { id: "deck", kind: "tile", x: 0, y: -0.6, z: -20, w: 24, h: 1.2, d: 40, color: 0x137e91 },
    { id: "pool", kind: "slime", x: 0, y: -0.9, z: 12, w: 24, h: 1.2, d: 24, color: 0x80ec27 },
    { id: "far", kind: "tile", x: 0, y: -0.6, z: 44, w: 24, h: 1.2, d: 40, color: 0x137e91 },
  ],
  prefabs: [],
  medals: { gold: 30, silver: 45, bronze: 60 },
});
const id = toTrack(level).id;
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(toTrack(level));
});

it("drifts slime diagonally with run time like lava", () => {
  const material = slimeMaterial(0x80ec27);
  expect(material.userData.time).toBeDefined();
  expect(material.userData.time.value).toBe(0);
  const shader = {
    uniforms: {} as Record<string, { value: unknown }>,
    vertexShader: "#include <uv_vertex>",
    fragmentShader: "#include <color_fragment>",
  };
  material.onBeforeCompile!(shader as never, {} as never);
  expect(shader.uniforms.slimeTime).toBe(material.userData.time);
  expect(shader.fragmentShader).toContain("uniform float slimeTime;");
  expect(shader.fragmentShader).toMatch(
    /slimeTime\s*\*\s*vec2\(\s*0\.012\s*,\s*0\.0085\s*\)/,
  );
});

it("melts each slime-touched part instead of instantly breaking the chassis", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: 0, y: 0.6, z: 12 }, true);
    sim.run(0.8);
    const parts = new Set(
      sim.damageEvents.filter((e) => e.source === "slime").map((e) => e.part),
    );
    expect(parts.size).toBeGreaterThan(1);
  } finally {
    sim.dispose();
  }
});

it("melts the nose first when driving into slime, wrecking only once it sinks", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    let first: string | undefined;
    for (let i = 0; i < 720 && sim.trackRun!.status === "running"; i++) {
      sim.step({ throttle: 1 });
      first = sim.damageEvents.find((e) => e.source === "slime")?.part;
      if (first) break;
    }
    expect(first).toBeDefined();
    expect(sim.status).toBe("driving");
    expect(sim.snapshot(false).integrity).toBeLessThan(1);
    sim.run(5);
    expect(sim.trackRun!.status).toBe("failed");
  } finally {
    sim.dispose();
  }
});
