import { beforeAll, it, expect } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { DestructionLab } from "../src/lab";
beforeAll(initPhysics);
it("lab tools use normal damage and preserve unrelated pieces", () => {
  const s = new Simulation("lab"),
    lab = new DestructionLab(s);
  lab.select("door-left");
  lab.use("dent");
  expect(s.parts.get("door-left")!.health).toBe(50);
  expect(s.parts.get("hood")!.health).toBe(90);
  lab.use("destroy");
  expect(s.parts.get("door-left")!.body).toBeDefined();
  lab.use("sever");
  expect(s.parts.get("chassis-rear")!.body).toBeDefined();
  lab.reset();
  expect(s.snapshot().stage).toBe("lab");
  expect([...s.parts.values()].every((p) => p.health > 0)).toBe(true);
  s.dispose();
});
it("rejects unknown tool targets", () => {
  const s = new Simulation();
  const lab = new DestructionLab(s);
  expect(() => lab.select("not-a-part")).toThrow();
  s.dispose();
});
