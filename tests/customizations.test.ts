import { expect, it } from "vitest";
import * as T from "three";
import { getVehicle } from "../src/vehicles";
import {
  MAX_CUSTOMS,
  activeCustomization,
  applyCustomization,
  colorDistance,
  deleteCustomization,
  listCustomizations,
  loadCustomizations,
  partOf,
  saveCustomization,
  setActiveFinish,
  type Customization,
} from "../src/customizations";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

const blank = (over: Partial<Customization> = {}): Customization => ({
  id: "c1",
  name: "Custom 1",
  createdAt: 1,
  fills: [],
  dabs: [],
  ...over,
});

it("starts empty with the default finish active", () => {
  const storage = memoryStorage();
  expect(listCustomizations("monster-truck", storage)).toEqual([]);
  expect(activeCustomization("monster-truck", storage)).toBe(null);
});

it("round-trips saved paint jobs per vehicle", () => {
  const storage = memoryStorage();
  const saved = saveCustomization(
    "monster-truck",
    "Flames",
    [{ part: "hood", from: 0x112233, to: 0xff0000, tolerance: 0 }],
    [{ part: "hood", at: [0, 1, 0], normal: [0, 1, 0], color: 0x00ff00, size: 0.2 }],
    storage,
  )!;
  expect(saved.name).toBe("Flames");
  expect(listCustomizations("monster-truck", storage)).toEqual([saved]);
  expect(listCustomizations("sports-car", storage)).toEqual([]);
  expect(setActiveFinish("monster-truck", saved.id, storage)).toBe(saved.id);
  expect(activeCustomization("monster-truck", storage)).toEqual(saved);
  expect(setActiveFinish("monster-truck", "default", storage)).toBe("default");
  expect(activeCustomization("monster-truck", storage)).toBe(null);
});

it("suffixes duplicate names and caps customs per vehicle", () => {
  const storage = memoryStorage();
  expect(saveCustomization("monster-truck", "Hot", [], [], storage)!.name).toBe("Hot");
  expect(saveCustomization("monster-truck", "Hot", [], [], storage)!.name).toBe("Hot 2");
  for (let i = 2; i < MAX_CUSTOMS; i++)
    saveCustomization("monster-truck", `Hot ${i}`, [], [], storage);
  expect(listCustomizations("monster-truck", storage)).toHaveLength(MAX_CUSTOMS);
  expect(saveCustomization("monster-truck", "One more", [], [], storage)).toBe(null);
});

it("deleting the active finish falls back to default", () => {
  const storage = memoryStorage();
  const a = saveCustomization("monster-truck", "A", [], [], storage)!;
  setActiveFinish("monster-truck", a.id, storage);
  deleteCustomization("monster-truck", a.id, storage);
  expect(listCustomizations("monster-truck", storage)).toEqual([]);
  expect(activeCustomization("monster-truck", storage)).toBe(null);
});

it("repairs corrupt or invalid stored data", () => {
  const storage = memoryStorage();
  storage.setItem("iron-flight-customizations-v1", "{broken");
  expect(loadCustomizations(storage)).toEqual({});
  storage.setItem(
    "iron-flight-customizations-v1",
    JSON.stringify({
      "monster-truck": {
        active: "missing",
        customs: [
          blank({ id: "good" }),
          { id: "bad", name: 42 },
          null,
        ],
      },
      "ghost-car": { active: "default", customs: [] },
    }),
  );
  const loaded = loadCustomizations(storage);
  expect(Object.keys(loaded)).toEqual(["monster-truck"]);
  expect(loaded["monster-truck"].customs.map((c) => c.id)).toEqual(["good"]);
  expect(loaded["monster-truck"].active).toBe("default");
});

it("measures color distance 0..1 for tolerance matching", () => {
  expect(colorDistance(0x112233, 0x112233)).toBe(0);
  expect(colorDistance(0x000000, 0xffffff)).toBeCloseTo(1, 5);
  expect(colorDistance(0xff0000, 0x00ff00)).toBeGreaterThan(0.5);
});

function partMeshes(root: T.Group, part: string): T.Mesh[] {
  const group = root.getObjectByName(part)!;
  const out: T.Mesh[] = [];
  group.traverse((o) => {
    if (o instanceof T.Mesh) out.push(o);
  });
  return out;
}

it("fills recolor in-tolerance meshes within one part only", () => {
  const root = getVehicle("monster-truck").build();
  const hoodMeshes = partMeshes(root, "hood");
  expect(hoodMeshes.length).toBeGreaterThan(0);
  const hoodBefore = hoodMeshes.map((m) => (m.material as T.MeshStandardMaterial).color.getHex());
  const target = hoodBefore[0];
  const all: T.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof T.Mesh) all.push(o);
  });
  const outsider = all.find((m) => {
    const part = partOf(root, m);
    return part !== null && part !== "hood";
  });
  expect(outsider, "a mesh outside the hood").toBeDefined();
  const otherBefore = (outsider!.material as T.MeshStandardMaterial).color.getHex();
  const { fills } = applyCustomization(root, blank({ fills: [{ part: "hood", from: target, to: 0x123456, tolerance: 0 }] }));
  expect(fills).toBeGreaterThan(0);
  for (const m of partMeshes(root, "hood")) {
    const hex = (m.material as T.MeshStandardMaterial).color.getHex();
    if (hoodBefore[partMeshes(root, "hood").indexOf(m)] === target) expect(hex).toBe(0x123456);
  }
  // Same shared base paint elsewhere keeps its color (materials are cloned per mesh).
  expect((outsider!.material as T.MeshStandardMaterial).color.getHex()).toBe(otherBefore);
});

it("tolerance 1 floods the whole part", () => {
  const root = getVehicle("monster-truck").build();
  applyCustomization(root, blank({ fills: [{ part: "bed", from: 0x000000, to: 0xabcdef, tolerance: 1 }] }));
  for (const m of partMeshes(root, "bed"))
    expect((m.material as T.MeshStandardMaterial).color.getHex()).toBe(0xabcdef);
});

it("dabs land under the right part group with their color", () => {
  const root = getVehicle("monster-truck").build();
  const { dabs } = applyCustomization(
    root,
    blank({ dabs: [{ part: "door-left", at: [1.2, 0.3, 0], normal: [1, 0, 0], color: 0xff00ff, size: 0.2 }] }),
  );
  expect(dabs).toBe(1);
  const group = root.getObjectByName("door-left")!;
  const dab = group.children.filter((c) => c.userData.paintDab);
  expect(dab).toHaveLength(1);
  expect((dab[0] as T.Mesh).position.toArray()).toEqual([1.2, 0.3, 0]);
  expect(((dab[0] as T.Mesh).material as T.MeshStandardMaterial).color.getHex()).toBe(0xff00ff);
});

it("resolves part identity by walking to the named group", () => {
  const root = getVehicle("monster-truck").build();
  const mesh = partMeshes(root, "hood")[0];
  expect(partOf(root, mesh)).toBe("hood");
  expect(partOf(root, root)).toBe(null);
});
