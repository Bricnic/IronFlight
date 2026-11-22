import { beforeEach, it, expect, vi } from "vitest";
import * as T from "three";
import { buildBirthdayCandle } from "../src/birthday-view";
import { buildDungeonModel } from "../src/dungeon-view";
import { BIRTHDAY_CANDLE } from "../src/dungeon-hazards";

beforeEach(() => {
  const ctx = {
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    measureText: () => ({ width: 10 }),
  };
  vi.stubGlobal("document", {
    createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
  });
});

function bottomY(mesh: T.Mesh): number {
  const h = (mesh.geometry as T.CylinderGeometry).parameters.height as number;
  return mesh.position.y - h / 2;
}

it("birthday candle dish and body bottoms are not coplanar (no z-fight when flipped)", () => {
  const root = new T.Group();
  buildBirthdayCandle(root);
  const cylinders = root.children.filter(
    (c): c is T.Mesh => c instanceof T.Mesh && c.geometry instanceof T.CylinderGeometry,
  );
  const dish = cylinders.find(
    (c) => (c.geometry as T.CylinderGeometry).parameters.height === 0.18,
  );
  const body = cylinders.find(
    (c) => (c.geometry as T.CylinderGeometry).parameters.height === BIRTHDAY_CANDLE.height,
  );
  expect(dish).toBeDefined();
  expect(body).toBeDefined();
  expect(Math.abs(bottomY(dish!) - bottomY(body!))).toBeGreaterThan(0.005);
});

function flameTriangles(flame: T.Group): number {
  let total = 0;
  for (const child of flame.children) {
    if (!(child instanceof T.Mesh)) continue;
    const g = child.geometry;
    total += (g.index ? g.index.count : g.position.count) / 3;
  }
  return total;
}

for (const kind of ["birthday-candle", "candle"] as const) {
  it(`${kind} flame has layered high-poly geometry`, () => {
    const model = buildDungeonModel({ id: `${kind}-1`, kind, x: 0, z: 0, phase: 0 });
    expect(model.pivots.length).toBeGreaterThan(0);
    for (const pivot of model.pivots) {
      // Outer shell + mid layer + bright core.
      expect(pivot.children.length).toBe(3);
      const outer = pivot.children[0] as T.Mesh;
      expect(outer.geometry instanceof T.ConeGeometry).toBe(true);
      expect(
        (outer.geometry as T.ConeGeometry).parameters.radialSegments,
      ).toBeGreaterThanOrEqual(24);
      expect(flameTriangles(pivot)).toBeGreaterThan(300);
      for (const child of pivot.children) expect(child.userData.animate).toBe(true);
    }
  });
}

it("candle flame pivots keep their flicker bases and light anchor", () => {
  const birthday = buildDungeonModel({
    id: "bday-1",
    kind: "birthday-candle",
    x: 0,
    z: 0,
    phase: 0,
  });
  expect(birthday.pivots).toHaveLength(1);
  expect(birthday.pivots[0].name).toBe("prefab-light-origin");
  expect(birthday.pivots[0].userData.base).toBe(1);
  const cluster = buildDungeonModel({ id: "c-1", kind: "candle", x: 0, z: 0, phase: 0 });
  expect(cluster.pivots).toHaveLength(3);
  cluster.pivots.map((p) => p.userData.base as number).forEach((base, i) => {
    expect(base).toBeCloseTo(0.9 + i * 0.12, 10);
  });
});
