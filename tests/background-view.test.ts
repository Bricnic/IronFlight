import { expect, it, vi, beforeEach, afterEach } from "vitest";
import { BoxGeometry, BufferAttribute, Color, Mesh, Sprite, Texture, TextureLoader } from "three";
import { BackgroundView, applyHaze, tileSkyscraperUVs } from "../src/background-view";
import { getTrack } from "../src/tracks";

beforeEach(() => {
  vi.spyOn(TextureLoader.prototype, "load").mockReturnValue(new Texture());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function meshes(view: BackgroundView) {
  const out: Mesh[] = [];
  view.traverse((o) => {
    if (o instanceof Mesh) out.push(o);
  });
  return out;
}

function sprites(view: BackgroundView) {
  const out: Sprite[] = [];
  view.traverse((o) => {
    if (o instanceof Sprite) out.push(o);
  });
  return out;
}

function cloudHex(view: BackgroundView) {
  const out: number[] = [];
  view.traverse((o) => {
    if (o instanceof Sprite && o.name === "background-cloud")
      out.push((o.material as import("three").SpriteMaterial).color.getHex());
  });
  return out;
}

it("builds a sky dome, shapes and clouds for a track", () => {
  const view = new BackgroundView();
  view.update(getTrack("triple-loop"), 0, 0, 0, 650);
  const stats = view.stats();
  expect(stats.template).toBe("pastoral-hills");
  expect(view.getObjectByName("background-sky")).toBeDefined();
  expect(meshes(view).length).toBeGreaterThan(1);
  expect(sprites(view)).toHaveLength(12);
  expect(stats.shapes).toBeGreaterThan(0);
  expect(stats.clouds).toBe(12);
});

for (const template of ["christmas-village", "christmas-midnight"]) {
  it(`builds the festive rings for ${template}`, () => {
    const view = new BackgroundView();
    view.update(
      { ...getTrack("triple-loop"), backgroundTemplate: template },
      0,
      0,
      0,
      650,
    );
    expect(view.stats().template).toBe(template);
    expect(view.stats().shapes).toBeGreaterThan(10);
    expect(meshes(view).length).toBeGreaterThan(1);
  });
}

it("darkens clouds to storm gray in rain", () => {
  const view = new BackgroundView();
  const dry = { night: false, rain: false };
  const wet = { night: false, rain: true };
  view.update(getTrack("triple-loop"), 0, 0, 0, 650, dry);
  const day = cloudHex(view);
  expect(day.length).toBeGreaterThan(0);
  view.update(getTrack("triple-loop"), 0, 0, 0, 650, wet);
  const storm = cloudHex(view);
  expect(storm).not.toEqual(day);
  for (const hex of storm) expect(hex).toBeLessThan(0x808080);
  view.update(getTrack("triple-loop"), 0, 0, 0, 650, dry);
  expect(cloudHex(view)).toEqual(day);
});

it("centers the rain field on the focus height", () => {
  const view = new BackgroundView();
  const wet = { night: false, rain: true };
  view.update(getTrack("triple-loop"), 0, 0, 0, 650, wet, 120);
  const rain = view.getObjectByName("background-rain")!;
  expect(rain.position.y).toBeCloseTo(120 - 40, 9);
  view.update(getTrack("triple-loop"), 0, 0, 0, 650, wet, 0);
  expect(rain.position.y).toBeCloseTo(-40, 9);
});

it("follows the focus point and scales to the far plane", () => {
  const view = new BackgroundView();
  view.update(getTrack("triple-loop"), 0, 100, 200, 350);
  expect(view.position.x).toBe(100);
  expect(view.position.z).toBe(200);
  expect(view.scale.x).toBeCloseTo(350 / 650, 9);
  view.update(getTrack("triple-loop"), 0, -50, 75, 650);
  expect(view.position.x).toBe(-50);
  expect(view.position.z).toBe(75);
  expect(view.scale.x).toBeCloseTo(1, 9);
});

it("rebuilds only when the track changes", () => {
  const view = new BackgroundView();
  view.update(getTrack("triple-loop"), 0, 0, 0, 650);
  const first = meshes(view);
  view.update(getTrack("triple-loop"), 10, 30, 40, 650);
  const again = meshes(view);
  expect(again.map((m) => m.id)).toEqual(first.map((m) => m.id));
  view.update(getTrack("canyon-plunge"), 10, 30, 40, 650);
  expect(view.stats().template).toBe("desert-mesas");
  const rebuilt = meshes(view);
  expect(rebuilt.map((m) => m.id)).not.toEqual(first.map((m) => m.id));
});

it("disposes geometries when rebuilding", () => {
  const view = new BackgroundView();
  view.update(getTrack("triple-loop"), 0, 0, 0, 650);
  let disposed = 0;
  for (const m of meshes(view))
    m.geometry.addEventListener("dispose", () => disposed++);
  view.update(getTrack("canyon-plunge"), 0, 0, 0, 650);
  expect(disposed).toBeGreaterThan(0);
});

it("renders underground templates without sky or clouds", () => {
  const view = new BackgroundView();
  view.update(
    { ...getTrack("triple-loop"), backgroundTemplate: "cavern-dark" },
    0,
    0,
    0,
    650,
  );
  expect(view.stats().template).toBe("cavern-dark");
  expect(view.getObjectByName("background-sky")).toBeUndefined();
  expect(sprites(view)).toHaveLength(0);
  expect(meshes(view).length).toBeGreaterThan(0);
});

it("falls back to the default template without a track", () => {
  const view = new BackgroundView();
  view.update(null, 0, 0, 0, 650);
  expect(view.stats().template).toBe("pastoral-hills");
  expect(view.getObjectByName("background-sky")).toBeDefined();
});

it("drifts clouds deterministically with time", () => {
  const view = new BackgroundView();
  view.update(getTrack("triple-loop"), 0, 0, 0, 650);
  const x0 = sprites(view).map((s) => s.position.x);
  view.update(getTrack("triple-loop"), 20, 0, 0, 650);
  const x1 = sprites(view).map((s) => s.position.x);
  expect(x1).not.toEqual(x0);
  view.update(getTrack("triple-loop"), 20, 0, 0, 650);
  expect(sprites(view).map((s) => s.position.x)).toEqual(x1);
});

it("builds deterministically for the same template", () => {
  const a = new BackgroundView();
  const b = new BackgroundView();
  a.update(getTrack("foundry-run"), 5, 0, 0, 650);
  b.update(getTrack("foundry-run"), 5, 0, 0, 650);
  const positions = (v: BackgroundView) =>
    meshes(v).map((m) => m.position.toArray());
  expect(positions(a)).toEqual(positions(b));
});

it("keeps background materials out of fog and shadow maps", () => {
  const view = new BackgroundView();
  view.update(getTrack("foundry-run"), 0, 0, 0, 650);
  expect(meshes(view).length).toBeGreaterThan(0);
  for (const m of meshes(view)) {
    expect(m.castShadow).toBe(false);
    for (const mat of Array.isArray(m.material) ? m.material : [m.material])
      expect((mat as { fog?: boolean }).fog ?? false).toBe(false);
  }
  for (const s of sprites(view)) {
    expect(s.material.fog).toBe(false);
    expect(s.material.depthWrite).toBe(false);
  }
});

it("hazes distant colors toward the horizon", () => {
  const base = new Color(0xffffff);
  expect(applyHaze(base.clone(), new Color(0x000000), 0).getHex()).toBe(
    0xffffff,
  );
  const hazed = applyHaze(base.clone(), new Color(0x000000), 600);
  expect(hazed.getHex()).not.toBe(0xffffff);
  expect(hazed.getHex()).not.toBe(0x000000);
  const nearer = applyHaze(base.clone(), new Color(0x000000), 100);
  expect(nearer.getHex()).toBeGreaterThan(hazed.getHex());
});

it("tiles skyscraper windows with building size (~0.67m cells)", () => {
  const geo = new BoxGeometry(1, 4, 1);
  tileSkyscraperUVs(geo, 100);
  const uv = geo.attributes.uv as BufferAttribute;
  const n = geo.attributes.normal as BufferAttribute;
  let umax = 0, vmax = 0, roofmax = 0;
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(n.getY(i)) > 0.5) roofmax = Math.max(roofmax, uv.getX(i), uv.getY(i));
    else { umax = Math.max(umax, uv.getX(i)); vmax = Math.max(vmax, uv.getY(i)); }
  }
  expect(umax).toBeCloseTo(25, 6);
  expect(vmax).toBeCloseTo(50, 6);
  expect(roofmax).toBeLessThanOrEqual(1);
});

it("builds tiled skyscraper UVs for city tracks", () => {
  const view = new BackgroundView();
  view.update(getTrack("skyline-circuit"), 0, 0, 0, 650);
  let umax = 0;
  view.traverse((o) => {
    if (o instanceof Mesh && o.name !== "background-sky") {
      const uv = (o.geometry.attributes.uv ?? {}) as Partial<BufferAttribute>;
      for (let i = 0; uv.count !== undefined && i < uv.count; i++) umax = Math.max(umax, uv.getX!(i));
    }
  });
  expect(umax).toBeGreaterThan(10);
});
