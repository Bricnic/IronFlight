import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  CANDY_LETHAL_PREFAB_KINDS,
  DUNGEON_PREFAB_KINDS,
  isCandyDecor,
  isCandyLethal,
  placeInLevel,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import {
  DUNGEON_STRIKE,
  dungeonHazards,
  SNAP_CYCLE,
  snapStriking,
} from "../src/dungeon-hazards";
import { buildDungeonModel, DungeonView } from "../src/dungeon-view";
import { buildCandyLethal, candyLethalMode, poseCandyLethal } from "../src/candy-lethal-view";

beforeAll(initPhysics);

// Hazard labels draw on a canvas; stub the DOM like tests/dungeon.test.ts.
beforeEach(() => {
  const ctx = { fillRect: () => {}, strokeRect: () => {}, fillText: () => {} };
  vi.stubGlobal("document", {
    createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
    createElementNS: () => ({ addEventListener: () => {}, removeEventListener: () => {}, src: "" }),
  });
});

const KINDS = [...CANDY_LETHAL_PREFAB_KINDS];
const POST_KINDS = ["jawbreaker-crusher", "peppermint-slammer", "caramel-crusher"];

function fixture(prefabs: CustomPrefab[], spawn = { x: 0, y: 2.1, z: -20, yaw: 0 }) {
  const level = blankLevel("Candy Lethal Fixture");
  level.prefabs = prefabs;
  level.spawn = spawn;
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:candy-lethal-fixture");
  return sim;
}

it("registers eight candy-land lethal prefabs as striking dungeon traps", () => {
  expect(KINDS).toHaveLength(8);
  for (const kind of KINDS) {
    for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS, CANDY_LETHAL_PREFAB_KINDS])
      expect(list).toContain(kind);
    expect(isCandyLethal(kind)).toBe(true);
    expect(isCandyDecor(kind)).toBe(false);
    const strike = DUNGEON_STRIKE[kind];
    expect(strike, `${kind} strike`).toBeDefined();
    expect(strike.radius).toBeGreaterThanOrEqual(7);
  }
  expect(isCandyLethal("cage")).toBe(false);
  expect(isCandyLethal("candy-cane-arch")).toBe(false);
});

it("validates lethal candy prefabs with yaw and places them from the palette", () => {
  const level = validateCustomLevel({
    ...blankLevel("Candy Lethal Parking"),
    prefabs: KINDS.map((kind, i) => ({
      id: `lethal-${i}`,
      kind,
      x: i * 10,
      z: 0,
      y: 0,
      yaw: 0.5,
    })),
  });
  expect(level.prefabs).toHaveLength(8);
  expect(dungeonHazards(toTrack(level)).map((h) => h.kind).sort()).toEqual(
    [...KINDS].sort(),
  );
  const placed = placeInLevel(blankLevel("Candy Lethal Placement"), {
    type: "prefab",
    kind: "sugar-chomper",
    x: 5,
    z: 5,
  });
  expect(placed.prefabs).toHaveLength(1);
  expect(placed.prefabs[0].kind).toBe("sugar-chomper");
});

it("builds eight detailed animated models headlessly", () => {
  for (const kind of KINDS) {
    const raw = new T.Group();
    const pivots = buildCandyLethal(raw, kind);
    let parts = 0;
    raw.traverse((o) => {
      if (o instanceof T.Mesh) parts++;
    });
    expect(parts, `${kind} parts`).toBeGreaterThanOrEqual(10);
    expect(pivots.length, `${kind} pivots`).toBeGreaterThanOrEqual(1);
    const model = buildDungeonModel({ id: `test-${kind}`, kind, x: 0, z: 0, phase: 0 });
    expect(model.pivots.length, `${kind} model pivots`).toBeGreaterThanOrEqual(1);
    expect(model.triangles, `${kind} triangles`).toBeGreaterThan(100);
    let labels = 0;
    model.root.traverse((o) => {
      if (o instanceof T.Sprite) labels++;
    });
    expect(labels, `${kind} labels`).toBe(1);
  }
});

it("snaps shut onto car-body height, not wheels or ground only", () => {
  for (const kind of KINDS) {
    const root = new T.Group();
    const pivots = buildCandyLethal(root, kind);
    const mode = candyLethalMode(kind);
    poseCandyLethal(kind, pivots, 1);
    const snapshot = () =>
      pivots.map((p) => ({
        x: p.position.x,
        y: p.position.y,
        rx: p.rotation.x,
        rz: p.rotation.z,
      }));
    const openPose = snapshot();
    poseCandyLethal(kind, pivots, 0);
    const shutPose = snapshot();
    expect(shutPose, `${kind} moves`).not.toEqual(openPose);
    if (mode === "slide") {
      // Crusher balls close to the lane center at chassis height (y ~2.2).
      expect(Math.abs(shutPose[0].x), `${kind} shut x`).toBeLessThan(
        Math.abs(openPose[0].x),
      );
      expect(Math.abs(shutPose[0].x), `${kind} shut reach`).toBeLessThan(3.5);
    } else if (mode === "stamp") {
      // Plate bottom lands at y ~1, overlapping the car body band.
      expect(shutPose[0].y, `${kind} shut y`).toBeLessThan(1.5);
      expect(openPose[0].y, `${kind} open y`).toBeGreaterThan(6);
    } else if (mode === "jaw") {
      // Upper jaw rotates down onto the car.
      expect(shutPose[0].rx, `${kind} shut jaw`).toBeGreaterThan(0.5);
      expect(openPose[0].rx, `${kind} open jaw`).toBe(0);
    } else {
      // Shear blades level out across the lane at hood height.
      expect(Math.abs(shutPose[0].rz), `${kind} shut shear`).toBeLessThan(0.1);
      expect(Math.abs(openPose[0].rz), `${kind} open shear`).toBeGreaterThan(0.4);
    }
  }
});

it("drives pivots live from the snap cycle", () => {
  const sim = fixture([{ id: "vice", kind: "gummy-vice", x: 0, z: 40 }]);
  try {
    const view = new DungeonView();
    sim.step({ throttle: 0 });
    view.update(sim);
    const first = view.inspect().find((m) => m.id === "vice");
    expect(first?.animated).toBe(true);
  } finally {
    sim.dispose();
  }
});

for (const kind of KINDS) {
  it(`${kind} snap is instantly lethal to a truck in the zone`, () => {
    const sim = fixture([{ id: `${kind}-1`, kind, x: 0, z: 0 }]);
    try {
      expect(sim.dungeon.mechanisms).toHaveLength(1);
      // Parked beside the trap, inside the strike zone, at car-body height.
      sim.body.setTranslation({ x: 4, y: 2.1, z: 4 }, true);
      sim.run(SNAP_CYCLE + 1);
      const hits = sim.damageEvents.filter((e) => e.source === kind);
      expect(hits.length).toBeGreaterThanOrEqual(1);
      expect(sim.snapshot().status).toBe("wrecked");
      expect(sim.trackRun?.status).toBe("failed");
      expect(sim.parts.get("chassis-front")!.health).toBeLessThanOrEqual(0);
    } finally {
      sim.dispose();
    }
  });
}

it("press traps keep solid posts while the rest drive straight through", () => {
  const sim = fixture(KINDS.map((kind, i) => ({ id: `lethal-${i}`, kind, x: i * 30, z: 60 })));
  try {
    const mechanisms = sim.dungeon.mechanisms.filter((m) => isCandyLethal(m.h.kind));
    expect(mechanisms).toHaveLength(8);
    for (const m of mechanisms) {
      const want = POST_KINDS.includes(m.h.kind) ? 2 : 0;
      expect(m.colliders.length, m.h.kind).toBe(want);
    }
  } finally {
    sim.dispose();
  }
  // A dead-center drive passes the drive-through jaw inside the open window.
  const drive = fixture([{ id: "jaws-1", kind: "candy-snap-jaws", x: 0, z: 0 }]);
  try {
    drive.body.setTranslation({ x: 12, y: 2.1, z: 0 }, true);
    drive.body.setRotation(
      { x: 0, y: -Math.SQRT1_2, z: 0, w: Math.SQRT1_2 },
      true,
    );
    const phase = drive.dungeon.mechanisms[0].h.phase;
    let sawStrike = false;
    for (let i = 0; i < 120 * 8; i++) {
      drive.step({ throttle: 0, steer: 0, brake: 1 });
      if (snapStriking(drive.time + phase)) sawStrike = true;
      else if (sawStrike) break;
    }
    expect(sawStrike).toBe(true);
    for (let i = 0; i < 120 * 3; i++)
      drive.step({ throttle: 1, steer: 0, brake: 0 });
    expect(drive.body.translation().x).toBeLessThan(-4);
    expect(drive.snapshot().status).not.toBe("wrecked");
  } finally {
    drive.dispose();
  }
});
