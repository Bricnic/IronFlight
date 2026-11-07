import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, expect, it, vi } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import { Destructibles } from "../src/destructibles";
import { PropView } from "../src/prop-view";
import { courseProps } from "../src/course";
import { CourseView } from "../src/course-view";
import { DRAGON_FLAME_LENGTH, dragonAim } from "../src/loop";
import {
  toTrack,
  registerCustomTrack,
  validateCustomLevel,
  type CustomLevel,
  type CustomPrefab,
} from "../src/custom-level";

beforeAll(initPhysics);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const minimal = (prefabs: CustomPrefab[]): CustomLevel => ({
  name: "Prefab Spin",
  mode: "race",
  spawn: { x: 0, y: 2.1, z: -100, yaw: 0 },
  checkpoints: [{ x: 0, z: 100 }],
  solids: [
    {
      id: "ground",
      kind: "ground",
      x: 0,
      y: -0.6,
      z: 0,
      w: 200,
      h: 1.2,
      d: 400,
      color: 0x6d817c,
    },
  ],
  prefabs,
  medals: { gold: 30, silver: 45, bronze: 60 },
});

// Headless texture loads need a fake document (see tests/comic-labels.test.ts).
vi.stubGlobal("document", {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({ fillRect: () => {}, fillText: () => {} }),
  }),
  createElementNS: () => ({
    addEventListener: () => {},
    removeEventListener: () => {},
    src: "",
  }),
});

it("prop prefabs accept yaw, pitch and roll", () => {
  const level = validateCustomLevel(
    minimal([
      { id: "barrel-1", kind: "barrel", x: 4, z: 8, yaw: 0.5, angle: 0.2, roll: -0.1 },
    ]),
  );
  expect(courseProps(toTrack(level))).toContainEqual(
    expect.objectContaining({ id: "barrel-1", yaw: 0.5, angle: 0.2, roll: -0.1 }),
  );
});

it("dragon prefabs accept yaw but not pitch or roll", () => {
  expect(() =>
    validateCustomLevel(
      minimal([{ id: "dragon-1", kind: "dragon", x: 10, z: 213, yaw: Math.PI }]),
    ),
  ).not.toThrow();
  expect(() =>
    validateCustomLevel(
      minimal([{ id: "dragon-1", kind: "dragon", x: 10, z: 213, angle: 0.1 }]),
    ),
  ).toThrow(/pitch/);
  expect(() =>
    validateCustomLevel(
      minimal([{ id: "dragon-1", kind: "dragon", x: 10, z: 213, roll: 0.1 }]),
    ),
  ).toThrow(/roll/);
});

it("loop, hammer and comic prefabs reject rotation", () => {
  for (const kind of ["loop", "hammer", "book", "lamp", "grandstand"]) {
    expect(
      () =>
        validateCustomLevel(
          minimal([{ id: "p-1", kind, x: 0, z: 0, yaw: 1 }]),
        ),
      kind,
    ).toThrow(/yaw/);
  }
});

it("non-finite prefab rotation is rejected", () => {
  for (const patch of [{ yaw: NaN }, { angle: Infinity }, { roll: -Infinity }]) {
    expect(() =>
      validateCustomLevel(
        minimal([{ id: "barrel-1", kind: "barrel", x: 0, z: 0, ...patch }]),
      ),
    ).toThrow();
  }
});

it("dragonAim rotates the mouth offset and jet direction", () => {
  expect(dragonAim(0)).toMatchObject({ mx: -4.05, my: 3.25, mz: 0, dx: -1, dz: 0 });
  const flipped = dragonAim(Math.PI);
  expect(flipped.mx).toBeCloseTo(4.05, 9);
  expect(flipped.mz).toBeCloseTo(0, 9);
  expect(flipped.dx).toBeCloseTo(1, 9);
  expect(flipped.dz).toBeCloseTo(0, 9);
  const quarter = dragonAim(Math.PI / 2);
  expect(quarter.mx).toBeCloseTo(0, 9);
  expect(quarter.mz).toBeCloseTo(4.05, 9);
  expect(quarter.dx).toBeCloseTo(0, 9);
  expect(quarter.dz).toBeCloseTo(1, 9);
});

it("a rotated custom dragon has dark bronze and emits from its mouth toward the tip", () => {
  const level = minimal([
    { id: "dragon-1", kind: "dragon", x: 10, y: 1.5, z: 20, yaw: Math.PI / 2 },
  ]);
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const sim = new Simulation();
  try {
    sim.startTrack(track.id);
    const view = new CourseView();
    sim.time = 5;
    view.update(sim);
    const statue = view.getObjectByName("dragon-1")!;
    const body = statue.children[1] as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>;
    const horn = statue.children[7] as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>;
    const jets = statue.getObjectByName("dragon-jets")!;
    expect(body.material.color.getHex()).toBe(0x15191b);
    expect(body.material.emissiveIntensity).toBe(0);
    expect(jets.visible).toBe(false);

    sim.time = 0.1;
    view.update(sim);
    expect(body.material.color.equals(
      new T.Color(0x15191b).lerp(new T.Color(0xff0000), 0.5),
    )).toBe(true);
    expect(body.material.emissiveIntensity).toBe(0.35);
    expect(horn.material.color.getHex()).toBe(0xd7c7a0);
    expect(jets.visible).toBe(true);

    const jet = jets.children[3] as T.Mesh<T.BufferGeometry, T.ShaderMaterial>;
    const mouth = jet.getWorldPosition(new T.Vector3());
    expect(mouth.toArray()).toEqual([10, 4.75, 24.05]);
    const { position, uv } = jet.geometry.attributes;
    for (let i = 0; i < position.count; i++) {
      const vertex = jet.localToWorld(new T.Vector3().fromBufferAttribute(position, i));
      expect(vertex.z).toBeCloseTo(mouth.z + DRAGON_FLAME_LENGTH * uv.getY(i));
    }
    expect(jet.material.uniforms.head.value).toBeCloseTo(0.25);
  } finally {
    sim.dispose();
  }
});

it("clone triple-loop dragons face the reference headings", () => {
  const level = validateCustomLevel(
    JSON.parse(
      readFileSync(
        join(root, "public/showcase/clone-triple-loop.json"),
        "utf8",
      ),
    ),
  );
  const loop = level.prefabs.find((p) => p.kind === "loop")!;
  const dragons = level.prefabs.filter((p) => p.kind === "dragon");
  expect(dragons.length).toBeGreaterThanOrEqual(4);
  const norm = (a: number) =>
    Math.atan2(Math.sin(a), Math.cos(a));
  for (const d of dragons) {
    const side = Math.sign(d.x - loop.x);
    expect(side).not.toBe(0);
    // Reference statues use rotation.y = -side * PI / 2.
    expect(norm(-Math.PI / 2 + (d.yaw ?? 0))).toBeCloseTo(
      norm((-side * Math.PI) / 2),
      6,
    );
  }
});

it("prop tilt renders pitch/roll while physics keeps yaw", () => {
  const sim = new Simulation();
  try {
    const defs = courseProps(
      toTrack(
        validateCustomLevel(
          minimal([
            {
              id: "tilt-1",
              kind: "barrel",
              x: 4,
              z: 8,
              yaw: 0.6,
              angle: 0.5,
              roll: -0.2,
            },
          ]),
        ),
      ),
    );
    const source = new Destructibles(sim.world, false, defs);
    const view = new PropView();
    view.update(source, 0);
    const found = view.children.find((c) => c.name === "tilt-1");
    expect(found).toBeInstanceOf(T.Group);
    const rootGroup = found as T.Group;
    // Physics body (and model root) carries yaw only.
    const euler = new T.Euler().setFromQuaternion(
      rootGroup.quaternion,
      "YXZ",
    );
    expect(euler.x).toBeCloseTo(0, 6);
    expect(euler.z).toBeCloseTo(0, 6);
    expect(euler.y).toBeCloseTo(0.6, 6);
    const tilt = rootGroup.children.find((c) => c.name === "prop-tilt");
    expect(tilt).toBeInstanceOf(T.Group);
    expect((tilt as T.Group).rotation.x).toBeCloseTo(0.5, 6);
    expect((tilt as T.Group).rotation.z).toBeCloseTo(-0.2, 6);
  } finally {
    sim.dispose();
  }
});
