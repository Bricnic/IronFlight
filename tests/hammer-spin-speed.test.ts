import { beforeAll, expect, it, vi } from "vitest";
import { Quaternion, Vector3 } from "three";
import { initPhysics, Simulation } from "../src/simulation";
import { EditorStore } from "../src/editor-state";
import { editableProperties, propertyValue } from "../src/editor-properties";
import {
  blankLevel,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";
import { hammerRotation } from "../src/hazards";
import { CourseView } from "../src/course-view";

beforeAll(initPhysics);

it("offers spin speed only for hammer selections, with a backward-compatible default", () => {
  const store = new EditorStore("Hammer settings");
  const a = store.addPrefab("hammer", 100, 100);
  const object = store.selectedItem()!;
  expect(editableProperties([object]).some((p) => p.key === "spinSpeed")).toBe(
    true,
  );
  expect(propertyValue(object, "spinSpeed", store.level)).toBe(1);
  store.updateSelectionProperties({ spinSpeed: 0.25 });
  expect(a.spinSpeed).toBe(0.25);
  expect(
    validateCustomLevel(JSON.parse(JSON.stringify(store.level))).prefabs[0]
      .spinSpeed,
  ).toBe(0.25);
  store.undo();
  expect(store.level.prefabs[0].spinSpeed).toBeUndefined();
  store.redo();
  expect(store.level.prefabs[0].spinSpeed).toBe(0.25);
  for (const value of [-1, NaN, Infinity])
    store.updateSelectionProperties({ spinSpeed: value });
  expect(store.level.prefabs[0].spinSpeed).toBe(0.25);
  store.addPrefab("burner");
  expect(
    editableProperties([store.selectedItem()!]).some(
      (p) => p.key === "spinSpeed",
    ),
  ).toBe(false);
});

it("edits several hammer speeds together without changing other prefab kinds", () => {
  const store = new EditorStore("Hammer bulk");
  const a = store.addPrefab("hammer"),
    b = store.addPrefab("hammer");
  store.select({ kind: "prefab", id: a.id });
  store.select({ kind: "prefab", id: b.id }, true);
  store.updateSelectionProperties({ spinSpeed: 2 });
  expect(store.level.prefabs.map((p) => p.spinSpeed)).toEqual([2, 2]);
});

it("rejects invalid speeds and speed properties on non-hammers when loading", () => {
  for (const [kind, spinSpeed] of [
    ["hammer", -1],
    ["hammer", Infinity],
    ["hammer", "2"],
    ["burner", 2],
  ] as const) {
    const level = blankLevel("Invalid hammer speed");
    level.prefabs = [
      { id: "test", kind, x: 0, z: 0, spinSpeed: spinSpeed as number },
    ];
    expect(() => validateCustomLevel(level)).toThrow(/spin speed/);
  }
});

it.each(
  [undefined, 0, 0.25, 2].flatMap((spinSpeed) =>
    [1, 10].map((resizeScale) => ({ spinSpeed, resizeScale })),
  ),
)(
  "synchronizes visual and physical speed $spinSpeed at size $resizeScale",
  ({ spinSpeed, resizeScale }) => {
    const level = blankLevel("Hammer rotor speed");
    level.prefabs = [
      {
        id: "hammer",
        kind: "hammer",
        x: 100,
        z: 100,
        y: 8,
        yaw: 0.7,
        spinSpeed,
        resizeScale,
      },
    ];
    const track = toTrack(validateCustomLevel(level));
    registerCustomTrack(track);
    const sim = new Simulation();
    try {
      sim.startTrack(track.id as never);
      for (let i = 0; i < 17; i++) sim.step({});
      const expected = new Quaternion()
        .setFromAxisAngle(new Vector3(0, 1, 0), 0.7)
        .multiply(
          new Quaternion().setFromAxisAngle(
            new Vector3(0, 0, 1),
            hammerRotation(level.prefabs[0], sim.hammerPhase),
          ),
        );
      const actual = new Quaternion().copy(
        sim.hazardBodies.get("hammer")!.rotation(),
      );
      expect(Math.abs(actual.dot(expected))).toBeCloseTo(1, 5);
      expect(hammerRotation(level.prefabs[0], sim.hammerPhase)).toBeCloseTo(
        sim.hammerPhase * (spinSpeed ?? 1),
      );
      const ctx = new Proxy(
        {},
        { get: () => () => ({ addColorStop() {}, width: 100 }) },
      );
      vi.stubGlobal("document", {
        createElement: () => ({
          width: 128,
          height: 128,
          getContext: () => ctx,
        }),
        createElementNS: () => ({
          addEventListener() {},
          removeEventListener() {},
          set src(_value: string) {},
        }),
      });
      const view = new CourseView();
      view.update(resizeScale === 1 ? sim : sim.resizedPrefabs[0].sim);
      const rotor = view.getObjectByName("hammer")!.children[0].children[0];
      expect(rotor.rotation.z).toBeCloseTo(
        hammerRotation(level.prefabs[0], sim.hammerPhase),
      );
    } finally {
      vi.unstubAllGlobals();
      sim.dispose();
    }
  },
);
