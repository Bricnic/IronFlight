import { beforeAll, expect, it, vi } from "vitest";
import * as T from "three";
import R from "@dimforge/rapier3d-compat";
import { Simulation, initPhysics } from "../src/simulation";
import {
  PREFAB_KINDS,
  blankLevel,
  toTrack,
  registerCustomTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import { courseSolids } from "../src/course";
import { ComicView } from "../src/comic-view";
import { DungeonView } from "../src/dungeon-view";
import { CourseView } from "../src/course-view";
import { PropView } from "../src/prop-view";
import { LooseBlocksView } from "../src/loose-blocks-view";
import { BurningCoalsView } from "../src/burning-coals-view";
import { FragileIceView } from "../src/fragile-ice-view";
import { FairgroundView } from "../src/fairground-view";
import { courseProps } from "../src/course";
import { Destructibles } from "../src/destructibles";

beforeAll(initPhysics);

// Headless canvas/texture loads need a fake document: any 2d method is a
// no-op, since label painters use a wide spread of the canvas API.
const fake2d = () =>
  new Proxy(
    { measureText: () => ({ width: 10 }) },
    {
      get: (t, p) =>
        p in t ? (t as Record<string | symbol, unknown>)[p] : () => {},
      set: () => true,
    },
  );
vi.stubGlobal("document", {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: fake2d,
  }),
  createElementNS: () => ({
    addEventListener: () => {},
    removeEventListener: () => {},
    src: "",
  }),
});

/** Off-axis probe angle: no symmetry multiple, so squares differ too. */
const YAW = 0.6;
const ID = "yaw-probe";

function prefabFor(kind: string, yaw: number): CustomPrefab {
  const base = { id: ID, kind, x: 0, z: 0, yaw };
  // Pelican needs deterministic perches; otherwise spots are random.
  if (kind === "pelican")
    return {
      ...base,
      spots: [
        { x: 0, z: 40 },
        { x: 10, z: 40 },
        { x: -10, z: 40 },
      ],
      seed: 1,
    };
  return base;
}

function startKind(kind: string, yaw: number) {
  const level = blankLevel(`Yaw Sweep ${kind} ${String(yaw).replace(".", "p")}`);
  level.prefabs = [prefabFor(kind, yaw)];
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  return { sim, track };
}

function shapeFingerprint(c: R.Collider): string {
  const s = c.shape as unknown as Record<string, unknown>;
  const parts = [(s?.constructor as { name?: string })?.name ?? "?"];
  for (const key of ["halfExtents", "radius", "halfHeight", "vertices"]) {
    const v = s?.[key];
    if (v === undefined || v === null) continue;
    parts.push(
      `${key}=${JSON.stringify(v, (_, n) =>
        typeof n === "number" ? Number(n.toFixed(4)) : n,
      )}`,
    );
  }
  return parts.join("|");
}

function colliderSignature(sim: Simulation): string[] {
  const out: string[] = [];
  sim.world.forEachCollider((c) => {
    const t = c.translation();
    const r = c.rotation();
    const nums = [t.x, t.y, t.z, r.x, r.y, r.z, r.w].map((n) =>
      n.toFixed(4),
    );
    out.push(`${nums.join(",")}|${shapeFingerprint(c)}`);
  });
  return out.sort();
}

function buildViews(sim: Simulation): T.Group[] {
  const comic = new ComicView();
  comic.update(sim);
  const dungeon = new DungeonView();
  dungeon.update(sim);
  const course = new CourseView();
  course.update(sim);
  const fairground = new FairgroundView();
  fairground.update(sim);
  const props = new PropView();
  props.update(
    new Destructibles(sim.world, false, courseProps(sim.courseTrack!)),
    0,
  );
  const loose = new LooseBlocksView();
  loose.update(sim.looseBlocks);
  const coals = new BurningCoalsView();
  coals.update(sim.burningCoals, 0);
  const ice = new FragileIceView();
  ice.update(sim.fragileIce, 0);
  return [comic, dungeon, course, fairground, props, loose, coals, ice];
}

/** Model root named by prefab id (ghost uses its indexed name). */
function findModel(views: T.Group[], kind: string, id: string): T.Object3D | null {
  const name = kind === "ghost" ? "ghost-1" : id;
  for (const v of views) {
    const exact = v.getObjectByName(name);
    if (exact) return exact;
  }
  return null;
}

function worldYaw(o: T.Object3D): number {
  const q = o.getWorldQuaternion(new T.Quaternion());
  return new T.Euler().setFromQuaternion(q, "YXZ").y;
}

const norm = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

it("every prefab kind rotates its model with yaw", () => {
  expect(PREFAB_KINDS.length).toBeGreaterThan(0);
  const failures: string[] = [];
  for (const kind of PREFAB_KINDS) {
    if (VIEW_EXEMPT.has(kind)) continue;
    // Checkpoint prefabs become gates: the gate normal carries the yaw.
    if (kind === "checkpoint") {
      const { track } = startKind(kind, YAW);
      const gate = track.checkpoints.at(-1)!;
      if (
        Math.abs((gate.nx ?? 0) - Math.sin(YAW)) > 0.01 ||
        Math.abs((gate.nz ?? 0) - Math.cos(YAW)) > 0.01
      )
        failures.push(`${kind}: gate normal (${gate.nx}, ${gate.nz}) ignores yaw`);
      continue;
    }
    const { sim, track } = startKind(kind, YAW);
    try {
      const views = buildViews(sim);
      // Instanced tiles carry no named node: read the sheet matrix instead.
      if (kind === "fragile-ice") {
        const ice = views.find(
          (v): v is FragileIceView => v instanceof FragileIceView,
        )!;
        const i = ice.tileIndex(ID);
        const m = new T.Matrix4();
        ice.sheets!.getMatrixAt(i, m);
        const got = norm(
          new T.Euler().setFromQuaternion(
            new T.Quaternion().setFromRotationMatrix(m),
            "YXZ",
          ).y,
        );
        if (Math.abs(norm(got - YAW)) > 0.02)
          failures.push(`${kind}: sheet instance yaw ${got.toFixed(3)} != ${YAW}`);
        continue;
      }
      const model = findModel(views, kind, ID);
      if (model) {
        // Dragon statues rest at a -PI/2 base heading plus prefab yaw.
        const want = kind === "dragon" ? -Math.PI / 2 + YAW : YAW;
        const got = norm(worldYaw(model));
        if (Math.abs(norm(got - want)) > 0.02)
          failures.push(`${kind}: ${model.name} world yaw ${got.toFixed(3)} != ${want.toFixed(3)}`);
        continue;
      }
      // Solid-derived kinds (loop rings, jail bars, ...): the expansion
      // must carry the yaw into every solid definition.
      const defs = courseSolids(track).filter((s) => s.id.startsWith(`${ID}-`));
      if (!defs.length) {
        failures.push(`${kind}: no model found for prefab id`);
        continue;
      }
      for (const s of defs) {
        if (s.yaw === undefined || Math.abs(norm(s.yaw - YAW)) > 0.02)
          failures.push(`${kind}: ${s.id} solid yaw ${s.yaw} != ${YAW}`);
      }
    } finally {
      sim.dispose();
    }
  }
  if (failures.length) console.log(`VIEW-FAIL:\n${failures.join("\n")}`);
  expect(failures).toEqual([]);
});

/**
 * View exemptions: kind -> why the model cannot carry yaw. Everything else
 * must rotate its model root with yaw.
 */
const VIEW_EXEMPT = new Map<string, string>([
  [
    "ghost",
    "homing specter: the model lookAts the truck every frame, so a static yaw has no observable meaning",
  ],
]);

/**
 * Physics exemptions: kind -> why identical collider sets are correct.
 * CODE kinds honor yaw in codeless behavior (covered by the cited tests);
 * NO_COLLIDERS kinds are radial/symmetric with no directional physics.
 * View rotation above still applies to every physics-exempt kind.
 */
const PHYSICS_EXEMPT = new Map<string, string>([
  ["boost-pad", "CODE: footprint rotates via onBoostPad (boost-pad.test.ts)"],
  ["dragon", "CODE: flame jet rotates via dragonAim (prefab-rotation.test.ts)"],
  ["lime-chomper", "CODE: strike box rotates with yaw (dungeon.test.ts)"],
  ["robot", "CODE: laser arc rotates with yaw (robot.test.ts); stomp is radial"],
  ["raptor", "CODE: bite cone rotates with yaw (dinosaur.test.ts)"],
  ["pterosaur", "CODE: bite cone rotates with yaw (shared attackWithDinosaur path)"],
  ["spinosaurus", "CODE: bite cone rotates with yaw (shared attackWithDinosaur path)"],
  ["ember-wyvern", "CODE: bite cone rotates with yaw (shared attackWithDinosaur path)"],
  ["pelican", "CODE: bill arc turns from the yawed heading (dungeon-physics pelican bite)"],
  ["guided-pipe", "CODE: ride path rotates with yaw (guided-pipe pose)"],
  ["crusher-claw", "CODE: catch zone evaluated in the yawed local frame"],
  ["spike-gates", "CODE: spike zones evaluated in the yawed local frame"],
  ["ghost", "NO_COLLIDERS: homing chase plus radial drain; model lookAts the truck"],
  ["hot-air-balloon", "NO_COLLIDERS: bananas drop at the balloon position; radial drift"],
  ["spider", "NO_COLLIDERS: radial web plus homing chase; model carries yaw"],
  ["start-gate", "NO_COLLIDERS: visual gate with no behavior"],
  ["candle", "NO_COLLIDERS: decorative flames with no strike entry"],
  ["hands", "NO_COLLIDERS: radial snap-strike zone; model carries yaw"],
  ["scissors", "NO_COLLIDERS: radial snap-strike zone; model carries yaw"],
  ["cup", "NO_COLLIDERS: radial snap-strike zone; model carries yaw"],
  ["clip", "NO_COLLIDERS: radial snap-strike zone; model carries yaw"],
  ["candy-snap-jaws", "NO_COLLIDERS: radial snap-strike zone; model carries yaw"],
  ["gummy-vice", "NO_COLLIDERS: radial snap-strike zone; model carries yaw"],
  ["licorice-shears", "NO_COLLIDERS: radial snap-strike zone; model carries yaw"],
  ["sugar-chomper", "NO_COLLIDERS: radial snap-strike zone; model carries yaw"],
  ["taffy-snapper", "NO_COLLIDERS: radial snap-strike zone; model carries yaw"],
  [
    "christmas-ice-vice",
    "NO_COLLIDERS: radial snap-strike zone; model carries yaw",
  ],
  [
    "christmas-icicle-shears",
    "NO_COLLIDERS: radial snap-strike zone; model carries yaw",
  ],
  [
    "christmas-tinsel-snapper",
    "NO_COLLIDERS: radial snap-strike zone; model carries yaw",
  ],
  [
    "christmas-toy-chomper",
    "NO_COLLIDERS: radial snap-strike zone; model carries yaw",
  ],
  [
    "christmas-yeti-jaws",
    "NO_COLLIDERS: radial snap-strike zone; model carries yaw",
  ],
]);

it("every prefab kind rotates its physics with yaw", () => {
  const failures: string[] = [];
  for (const kind of PREFAB_KINDS) {
    if (kind === "checkpoint") continue; // gates have no colliders by design
    const a = startKind(kind, 0);
    const b = startKind(kind, YAW);
    const c = startKind(kind, YAW);
    try {
      const sigA = colliderSignature(a.sim);
      const sigB = colliderSignature(b.sim);
      const sigC = colliderSignature(c.sim);
      if (JSON.stringify(sigB) !== JSON.stringify(sigC)) {
        failures.push(`${kind}: nondeterministic colliders`);
        continue;
      }
      if (JSON.stringify(sigA) === JSON.stringify(sigB) && !PHYSICS_EXEMPT.has(kind))
        failures.push(`${kind}: identical collider sets at yaw 0 and ${YAW}`);
    } finally {
      a.sim.dispose();
      b.sim.dispose();
      c.sim.dispose();
    }
  }
  if (failures.length) console.log(`PHYS-FAIL:\n${failures.join("\n")}`);
  expect(failures).toEqual([]);
});
