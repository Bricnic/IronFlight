import { beforeEach, expect, it, vi } from "vitest";
import * as T from "three";
import { buildDungeonModel } from "../src/dungeon-view";
import {
  buildBat,
  buildCaterpillar,
  buildFairy,
  buildFirefly,
  buildMoth,
  buildMushroom,
  poseBat,
  poseCaterpillar,
  poseFairy,
  poseFirefly,
  poseMoth,
  poseMushroom,
} from "../src/mystic-view";
import { ChaseCamera } from "../src/camera";
import { buildHeadlightRig, setHeadlightDim } from "../src/headlights";

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

for (const kind of ["cave-caterpillar", "cave-moth", "cave-bat", "glow-mushroom", "cave-fairy", "firefly"] as const) {
  it(`builds a ${kind} model${kind === "cave-caterpillar" || kind === "cave-moth" ? " with a warning label" : " with no label"}`, () => {
    const model = buildDungeonModel({ id: `${kind}-1`, kind, x: 0, z: 0, phase: 0 });
    expect(model.triangles).toBeGreaterThan(kind === "firefly" ? 10 : 100);
    expect(model.root.children.length).toBeGreaterThanOrEqual(1);
    // Warning labels are canvas sprites; glow halos share one DataTexture.
    const labels = model.root.children.filter(
      (o) => o instanceof T.Sprite && (o.material as T.SpriteMaterial).map instanceof T.CanvasTexture,
    );
    expect(labels.length).toBe(kind === "cave-caterpillar" || kind === "cave-moth" ? 1 : 0);
  });
}

it("caterpillar crawls to its sim position", () => {
  const root = new T.Group();
  const model = buildCaterpillar(root);
  poseCaterpillar(model, root, 0, { home: { x: 0, z: 0 }, pos: { x: 5, z: 7 }, yaw: 1, dest: { x: 0, z: 0 }, trips: 0 }, 1.5, true);
  expect(root.position.x).toBe(5);
  expect(root.position.z).toBe(7);
  expect(root.rotation.y).toBe(1);
});

it("moth syncs motes and fading piles", () => {
  const root = new T.Group();
  const model = buildMoth(root);
  poseMoth(
    model, root, { x: 0, z: 0 },
    {
      home: { x: 0, z: 0 }, pos: { x: 4, y: 10, z: 6 }, yaw: 0, dest: { x: 0, z: 0 },
      trips: 0, sprinkleAt: 0,
      motes: [{ x: 4, z: 6, y: 5 }],
      piles: [{ x: 1, z: 1, until: 3 }],
    },
    1, true,
  );
  expect(model.motes.filter((s) => s.visible)).toHaveLength(1);
  expect(model.piles.filter((p) => p.visible)).toHaveLength(1);
  const opacity = (model.piles[0].material as T.MeshBasicMaterial).opacity;
  expect(opacity).toBeGreaterThan(0.15);
  expect(opacity).toBeLessThanOrEqual(0.6);
});

it("bat perches then flees away", () => {
  const root = new T.Group();
  const model = buildBat(root);
  poseBat(model, root, { x: 0, y: 6, z: 0 }, { fled: false, fledAt: 0, fleeYaw: 0 }, 1, true);
  expect(root.position.y).toBe(6);
  poseBat(model, root, { x: 0, y: 6, z: 0 }, { fled: true, fledAt: 1, fleeYaw: Math.PI }, 2, true);
  expect(root.position.z).toBeLessThan(0);
  expect(root.position.y).toBeGreaterThan(6);
});

it("decor wanders around its placed spot", () => {
  const root = new T.Group();
  const fairy = buildFairy(root);
  poseFairy(fairy, root, { x: 10, y: 3, z: 10, phase: 0 }, 1, true);
  expect(Math.hypot(root.position.x - 10, root.position.z - 10)).toBeLessThanOrEqual(4);
  const shroom = buildMushroom(new T.Group());
  expect(shroom.top).toBeGreaterThan(2);
  const fire = buildFirefly(new T.Group());
  poseFirefly(fire, new T.Group(), { x: 0, y: 2, z: 0, phase: 0 }, 1, true);
});

it("poison roll flips the chase camera upside down", () => {
  const camera = new T.PerspectiveCamera();
  const chase = new ChaseCamera(camera);
  const localUp = () => new T.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).y;
  chase.update(new T.Vector3(0, 0, 0), new T.Quaternion(), 0.016, true);
  expect(localUp()).toBeCloseTo(1, 1);
  chase.update(new T.Vector3(0, 0, 0), new T.Quaternion(), 0.016, true, false, Math.PI);
  expect(localUp()).toBeCloseTo(-1, 1);
});

it("headlight dim scales spots, cones and bulbs", () => {
  const rig = buildHeadlightRig();
  setHeadlightDim(rig, 0.35);
  const spots: T.SpotLight[] = [];
  const cones: T.Mesh[] = [];
  const bulbs: T.Mesh[] = [];
  rig.traverse((o) => {
    if (o instanceof T.SpotLight) spots.push(o);
    else if (o instanceof T.Mesh && o.name === "headlight-cone") cones.push(o);
    else if (o instanceof T.Mesh && o.name === "headlight-bulb") bulbs.push(o);
  });
  expect(spots).toHaveLength(2);
  for (const spot of spots) expect(spot.intensity).toBeCloseTo(1225, 6);
  for (const cone of cones) expect((cone.material as T.MeshBasicMaterial).opacity).toBeCloseTo(0.021, 6);
  for (const bulb of bulbs) expect((bulb.material as T.MeshStandardMaterial).emissiveIntensity).toBeCloseTo(1.05, 6);
});
