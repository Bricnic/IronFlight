import { beforeEach, expect, it, vi } from "vitest";
import * as T from "three";
import {
  COMIC_PREFAB_KINDS,
  JAW_PREFAB_KINDS,
  PREFAB_KINDS,
} from "../src/custom-level";
import { buildComicModel } from "../src/comic-view";

beforeEach(() => {
  const ctx = {
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
  };
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ctx,
    }),
    createElementNS: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
      src: "",
    }),
  });
});

it("registers the donut in the jaw family", () => {
  for (const list of [PREFAB_KINDS, COMIC_PREFAB_KINDS, JAW_PREFAB_KINDS])
    expect(list).toContain("donut");
});

it("builds a jawed donut model headlessly", () => {
  const model = buildComicModel({
    id: "test-donut",
    kind: "donut",
    x: 0,
    z: 0,
    phase: 0,
  });
  expect(model.jaw).toBeDefined();
  expect(model.triangles).toBeGreaterThan(0);
  let torus = 0;
  model.root.traverse((o) => {
    if (o instanceof T.Mesh && o.geometry instanceof T.TorusGeometry)
      torus++;
  });
  expect(torus).toBeGreaterThan(0);
});

it("shares the jaw snap timing with books", () => {
  const donut = buildComicModel({
    id: "jaw-donut",
    kind: "donut",
    x: 0,
    z: 0,
    phase: 0,
  });
  const book = buildComicModel({
    id: "jaw-book",
    kind: "book",
    x: 0,
    z: 0,
    phase: 0,
  });
  expect(donut.jaw!.position.toArray()).toEqual(
    book.jaw!.position.toArray(),
  );
});
