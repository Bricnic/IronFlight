import { beforeEach, expect, it, vi } from "vitest";
import * as T from "three";
import type { ComicKind } from "../src/comic-hazards";
import { buildComicLabel, buildComicModel } from "../src/comic-view";

const KINDS: ComicKind[] = [
  "book",
  "teeth",
  "computer",
  "flippers",
  "hydrant",
  "burner",
  "water",
  "potion",
];
const TITLES: Record<ComicKind, string> = {
  book: "CURSED CHAPTER",
  teeth: "BITE CLUB",
  computer: "FATAL ERROR",
  flippers: "COLOUR SNAP",
  hydrant: "PRESSURE POP",
  burner: "HOT WHEELS",
  water: "SKIM OR SWIM",
  potion: "PICK YOUR POISON",
};

let drawn: string[];
beforeEach(() => {
  drawn = [];
  const ctx = {
    fillRect: () => {},
    strokeRect: () => {},
    fillText: (text: string) => {
      drawn.push(String(text));
    },
  };
  const img = () => ({
    addEventListener: () => {},
    removeEventListener: () => {},
    src: "",
  });
  vi.stubGlobal("document", {
    createElement: (tag: string) =>
      tag === "img"
        ? img()
        : { width: 0, height: 0, getContext: () => ctx },
    createElementNS: () => img(),
  });
});

for (const kind of KINDS) {
  it(`${kind} label is an upright billboard close above the model`, () => {
    const model = buildComicModel({
      id: `test-${kind}`,
      kind,
      x: 0,
      z: 0,
      phase: 0,
    });
    const sprites = model.root.children.filter(
      (c): c is T.Sprite => c instanceof T.Sprite,
    );
    expect(sprites).toHaveLength(1);
    const [label] = sprites;
    // Close: directly overhead, not 20 m down the road.
    expect(Math.hypot(label.position.x, label.position.z)).toBeLessThan(3);
    expect(label.position.y).toBeGreaterThan(2);
    const solid = new T.Group();
    for (const c of model.root.children)
      if (!(c instanceof T.Sprite)) solid.add(c.clone());
    const top = new T.Box3().setFromObject(solid).max.y;
    expect(label.position.y - top).toBeGreaterThan(0.5);
    expect(label.position.y - top).toBeLessThan(2);
    // Upright 4:1 billboard.
    expect(label.scale.x / label.scale.y).toBeCloseTo(4, 1);
    expect(drawn).toContain(TITLES[kind]);
  });
}

it("no flat ground-plane labels remain", () => {
  for (const kind of KINDS) {
    const model = buildComicModel({
      id: `flat-${kind}`,
      kind,
      x: 0,
      z: 0,
      phase: 0,
    });
    const flats: T.Mesh[] = [];
    model.root.traverse((o) => {
      if (
        o instanceof T.Mesh &&
        o.geometry instanceof T.PlaneGeometry &&
        Math.abs(o.geometry.parameters.width - 4.2) < 1e-6 &&
        Math.abs(o.geometry.parameters.height - 1.3) < 1e-6
      )
        flats.push(o);
    });
    expect(flats).toHaveLength(0);
  }
});

it("buildComicLabel sizes 4:1 and anchors at the given height", () => {
  const label = buildComicLabel(
    { id: "x", kind: "hydrant", x: 0, z: 0, phase: 0 },
    7.5,
  );
  expect(label).toBeInstanceOf(T.Sprite);
  expect(label.position.toArray()).toEqual([0, 7.5, 0]);
  expect(label.scale.x / label.scale.y).toBeCloseTo(4, 1);
  expect(drawn).toContain("PRESSURE POP");
});
