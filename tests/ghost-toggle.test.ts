import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
beforeAll(initPhysics);
it("disabled ghosts stop moving and cannot damage the truck, including pending overlaps", () => {
  const sim = new Simulation();
  sim.startTrack("haunted-hollow");
  const ghost = sim.ghosts.ghosts[0];
  ghost.overlapping = true;
  sim.ghostsEnabled = false;
  const position = { x: ghost.x, y: ghost.y, z: ghost.z };
  const health = [...sim.parts.values()].map((p) => p.health);
  sim.ghosts.attack();
  sim.ghosts.update();
  expect(ghost).toMatchObject({ ...position, overlapping: false, contacts: 0 });
  expect([...sim.parts.values()].map((p) => p.health)).toEqual(health);
  expect(sim.ghosts.snapshot().enabled).toBe(false);
  sim.startTrack("haunted-hollow");
  expect(sim.ghostsEnabled).toBe(false);
  sim.ghostsEnabled = true;
  const target = sim.body.translation();
  Object.assign(sim.ghosts.ghosts[0], {
    x: target.x,
    y: target.y + 2,
    z: target.z,
  });
  sim.ghosts.update();
  sim.ghosts.attack();
  expect(sim.ghosts.ghosts[0].contacts).toBe(1);
  expect(sim.snapshot(false).integrity).toBeLessThan(1);
  sim.dispose();
});
