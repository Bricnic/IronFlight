import { beforeAll, expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { Simulation, initPhysics } from "../src/simulation";
import { Destructibles } from "../src/destructibles";
import { courseProps } from "../src/course";
import { getTrack } from "../src/tracks";
import { buildGravestoneMesh, gravestoneStats } from "../src/prop-view";
beforeAll(initPhysics);
const hollow = () => getTrack("haunted-hollow");
const stoned = () => {
  const sim = new Simulation();
  sim.props = new Destructibles(sim.world, false, courseProps(hollow()));
  return sim;
};
it("gravestone props match the demolition targets", () => {
  const defs = courseProps(hollow());
  expect(defs).toHaveLength(12);
  const targets = new Map(hollow().demolish!.map((p) => [p.id, p]));
  for (const d of defs) {
    expect(d.kind).toBe("gravestone");
    expect(targets.get(d.id)).toMatchObject({ x: d.x, z: d.z });
  }
});
it("every gravestone breaks when rammed and stays reported", () => {
  const sim = stoned();
  const defs = courseProps(hollow());
  for (const def of defs) {
    sim.body.setTranslation({ x: def.x, y: 2.1, z: def.z - 8 }, true);
    sim.body.setRotation(new Quaternion(), true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    sim.run(2, { throttle: 1 });
    const broken = sim.props
      .snapshot(sim.time)
      .filter((p) => p.broken)
      .map((p) => p.id);
    expect(broken).toContain(def.id);
  }
  expect(
    sim.props.snapshot(sim.time).filter((p) => p.broken),
  ).toHaveLength(12);
  expect(sim.status).toBe("driving");
  expect(sim.props.takeDestroyed()).toEqual([]);
  sim.dispose();
});
it("a parked touch does not break stone, but a shove does", () => {
  const sim = stoned();
  const def = courseProps(hollow())[0];
  sim.body.setTranslation({ x: def.x, y: 2.1, z: def.z - 3.1 }, true);
  sim.body.setRotation(new Quaternion(), true);
  sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  sim.run(1);
  expect(
    sim.props.snapshot(sim.time).find((p) => p.id === def.id)!.broken,
  ).toBe(false);
  sim.run(1, { throttle: 1 });
  expect(
    sim.props.snapshot(sim.time).find((p) => p.id === def.id)!.broken,
  ).toBe(true);
  sim.dispose();
});
it("destroyed ids drain exactly once through takeDestroyed", () => {
  const sim = stoned();
  const def = courseProps(hollow())[0];
  sim.body.setTranslation({ x: def.x, y: 2.1, z: def.z - 1.5 }, true);
  sim.props.update(
    sim.body,
    sim.parts,
    sim.wheelPositions(),
    new Vector3(0, 0, 15),
    sim.time,
  );
  expect(sim.props.takeDestroyed()).toEqual([def.id]);
  expect(sim.props.takeDestroyed()).toEqual([]);
  sim.dispose();
});
it("gravestone meshes are solid memorial slabs", () => {
  const stats = gravestoneStats(buildGravestoneMesh(0));
  expect(stats.meshes).toBeGreaterThanOrEqual(2);
  expect(stats.triangles).toBeGreaterThan(200);
});
