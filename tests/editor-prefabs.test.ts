import { expect, it, beforeAll, afterAll, vi } from "vitest";
import * as T from "three";
import { PREFAB_KINDS } from "../src/custom-level";
import { buildEditorPrefab, buildEditorIceBatch } from "../src/editor-prefabs";
beforeAll(() => {
  const ctx = new Proxy({}, { get: () => () => ({ addColorStop() {}, width: 100 }) });
  vi.stubGlobal("document", {
    createElement: () => ({ width: 128, height: 128, getContext: () => ctx }),
    createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, set src(_value: string) {} }),
  });
});
afterAll(() => vi.unstubAllGlobals());
it("renders a thousand-tile field with four shared draw objects and preserves transforms", () => {
  const batch = buildEditorIceBatch(Array.from({ length: 1000 }, (_, i) => ({ id: `ice-${i}`, kind: "fragile-ice", x: i * 10, y: 6, z: 0, resizeScale: 2 })), true);
  expect(batch.children).toHaveLength(4);
  const sheets = batch.children[0] as T.InstancedMesh;
  expect(sheets.count).toBe(1000);
  const matrix = new T.Matrix4(); sheets.getMatrixAt(999, matrix);
  expect(new T.Vector3().setFromMatrixPosition(matrix).x).toBeCloseTo(9990);
  expect(new T.Vector3().setFromMatrixPosition(matrix).y).toBeCloseTo(5.74);
});
it("uses gameplay origins and offsets for elevated and ground-mounted prefabs", () => {
  const bounds = (kind: string) => new T.Box3().setFromObject(buildEditorPrefab({ id: kind, kind, x: 0, z: 0 }, true));
  expect(bounds("lamp").min.y).toBeCloseTo(0);
  expect(bounds("burning-coals").min.y).toBeCloseTo(0);
  expect(bounds("burning-coals").max.y).toBeCloseTo(0.9);
  expect(bounds("checkpoint").min.y).toBeCloseTo(0);
  expect(bounds("checkpoint").max.x - bounds("checkpoint").min.x).toBeGreaterThan(24);
  expect(bounds("hot-air-balloon").min.y).toBeGreaterThan(20);
  expect(buildEditorPrefab({ id: "ghost", kind: "ghost", x: 0, z: 0 }, true).position.y).toBe(3);
});

it.each(PREFAB_KINDS)("builds real, static %s geometry in preview and wireframe", (kind) => {
  for (const preview of [true, false]) {
    const root = buildEditorPrefab({ id: `test-${kind}`, kind, x: 0, z: 0 }, preview);
    const box = new T.Box3().setFromObject(root);
    expect(box.isEmpty(), `${kind} empty`).toBe(false);
    expect(box.getSize(new T.Vector3()).length()).toBeGreaterThan(0.1);
    let meshes = 0;
    root.traverse(o => {
      if (!(o instanceof T.Mesh)) return;
      meshes++;
      if (Array.isArray(o.material)) {
        const count = o.material.length;
        expect(o.geometry.groups.length, `${kind}: array material needs geometry groups`).toBeGreaterThan(0);
        expect(o.geometry.groups.every((g: { materialIndex?: number }) => (g.materialIndex ?? 0) < count), `${kind}: missing face material`).toBe(true);
      }
      if (!preview) for (const m of Array.isArray(o.material) ? o.material : [o.material]) expect((m as T.MeshBasicMaterial).wireframe).toBe(true);
    });
    expect(meshes).toBeGreaterThan(0);
    expect(root.userData.pick).toEqual({ kind: "prefab", id: `test-${kind}` });
  }
});
