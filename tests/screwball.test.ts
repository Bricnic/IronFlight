import { Group, Mesh, Quaternion, Vector3 } from "three";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { buildMailbox } from "../src/screwball-view";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  DUNGEON_PREFAB_KINDS,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  TOYBOX_PREFAB_KINDS,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import {
  DUNGEON_STRIKE,
  dungeonHazards,
  MAILBOX,
  SPEED_TUBE,
  TEETER,
} from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";

beforeAll(initPhysics);

beforeEach(() => {
  const ctx = {
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    measureText: () => ({ width: 10 }),
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

function fixture(name: string, prefabs: CustomPrefab[]) {
  const level = blankLevel(name);
  level.prefabs = prefabs;
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  return sim;
}

it("registers the toybox prefabs with models and no strike entries", () => {
  for (const kind of ["speed-tube", "teeter-totter", "mailbox"]) {
    expect(PREFAB_KINDS).toContain(kind);
    expect(DUNGEON_PREFAB_KINDS).toContain(kind);
    expect(TOYBOX_PREFAB_KINDS).toContain(kind);
    expect((DUNGEON_STRIKE as Record<string, unknown>)[kind]).toBeUndefined();
    const model = buildDungeonModel({ id: kind, kind: kind as never, x: 0, z: 0, phase: 0 });
    expect(model.triangles, kind).toBeGreaterThan(0);
  }
  const level = validateCustomLevel({
    ...blankLevel("Toybox Parking"),
    prefabs: [
      { id: "t", kind: "speed-tube", x: 0, z: 0, yaw: 1 },
      { id: "tt", kind: "teeter-totter", x: 0, z: 0 },
      { id: "mb", kind: "mailbox", x: 0, z: 0 },
    ],
  });
  expect(dungeonHazards(toTrack(level)).map((h) => h.kind)).toEqual([
    "speed-tube",
    "teeter-totter",
    "mailbox",
  ]);
});

it("speed tube locks steering, cruises at 1.5x and shoots the exit", () => {
  const sim = fixture("Tube Ride", [
    { id: "t", kind: "speed-tube", x: 0, z: 60, yaw: Math.PI },
  ]);
  try {
    const mech = () => sim.dungeon.mechanisms.find((m) => m.h.kind === "speed-tube")!;
    sim.body.setTranslation({ x: 0, y: 2, z: 85 }, true);
    sim.body.setRotation({ x: 0, y: 1, z: 0, w: 0 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: -10 }, true);
    for (let i = 0; i < 240 && !mech().tube!.inside; i++) sim.step({ throttle: 1 });
    expect(mech().tube!.inside).toBe(true);
    // Locked to the axis at 1.5x entry pace despite full steering lock.
    for (let i = 0; i < 30; i++) sim.step({ throttle: 1, steer: 1 });
    const v = sim.body.linvel();
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(mech().tube!.cruise, 0);
    expect(mech().tube!.cruise).toBeGreaterThanOrEqual(SPEED_TUBE.minCruise);
    expect(Math.abs(v.x)).toBeLessThan(1);
    const p = sim.body.translation();
    expect(Math.abs(p.x)).toBeLessThan(1);
    expect(sim.snapshot().dungeon.hazards.find((h) => h.kind === "speed-tube")!.tubed).toBe(true);
    // Out the end: shot onward at burst pace with steering back.
    for (let i = 0; i < 600 && mech().tube!.inside; i++) sim.step({ throttle: 1 });
    expect(mech().tube!.inside).toBe(false);
    const out = sim.body.linvel();
    expect(Math.hypot(out.x, out.z)).toBeGreaterThanOrEqual(SPEED_TUBE.exitBurst - 0.5);
    expect(out.z).toBeLessThan(0);
    expect(sim.damageEvents.some((e) => e.source === "speed-tube")).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("teeter-totter rocks on its motor and carries coasting trucks", () => {
  const sim = fixture("Teeter Ride", [
    { id: "tt", kind: "teeter-totter", x: 0, z: 60 },
  ]);
  try {
    const body = () =>
      sim.dungeon.mechanisms.find((m) => m.h.kind === "teeter-totter")!.body!;
    const pitch = () => {
      const q = body().rotation();
      return Math.asin(Math.max(-1, Math.min(1, 2 * (q.w * q.x + q.y * q.z))));
    };
    const tilts = new Set<string>();
    for (let i = 0; i < 1440; i++) {
      sim.step({ brake: 1 });
      if (i % 60 === 0) tilts.add(pitch() > 0 ? "+" : "-");
    }
    expect(tilts.has("+") && tilts.has("-")).toBe(true);
    expect(Math.abs(pitch())).toBeLessThanOrEqual(TEETER.amp + 0.01);
    // Timed crossing: hold at the lip for a low near end, drop in, ride the
    // sweep up, and exit as the far end settles back to flat.
    const endBottomNorth = () => {
      const q = body().rotation();
      const end = new Vector3(0, -TEETER.h / 2, TEETER.d / 2).applyQuaternion(
        new Quaternion(q.x, q.y, q.z, q.w),
      );
      return body().translation().y + end.y;
    };
    sim.body.setTranslation({ x: 0, y: 2, z: 79 }, true);
    sim.body.setRotation({ x: 0, y: 1, z: 0, w: 0 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    let waited = 0;
    for (; waited < 1080; waited++) {
      sim.step({ brake: 1 });
      if (endBottomNorth() < -2) break;
    }
    expect(waited).toBeLessThan(1080);
    sim.body.setLinvel({ x: 0, y: 0, z: -14 }, true);
    for (let i = 0; i < 600; i++) sim.step({ throttle: 1 });
    expect(sim.body.translation().z).toBeLessThan(45);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("mailbox interior panel sits proud of the body (no z-fighting)", () => {
  const root = new Group();
  buildMailbox(root);
  root.updateMatrixWorld(true);
  const box = (w: number, h: number, d: number) => {
    const found: Mesh[] = [];
    root.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const p = (o.geometry as { parameters?: { width?: number; height?: number; depth?: number } })
        .parameters;
      if (p?.width === w && p?.height === h && p?.depth === d) found.push(o);
    });
    expect(found).toHaveLength(1);
    return found[0];
  };
  const frontZ = (m: Mesh) => {
    const d = (m.geometry as { parameters: { depth: number } }).parameters.depth;
    return new Vector3(0, 0, d / 2).applyMatrix4(m.matrixWorld).z;
  };
  const body = box(3, 2.6, 4.4);
  const dark = box(2.4, 2.0, 0.1);
  // Coplanar fronts shimmer; a hair of separation kills the fight.
  expect(frontZ(dark) - frontZ(body)).toBeGreaterThan(0.005);
});

it("teeter-totter lifts its end high enough to drive underneath", () => {
  const sim = fixture("Teeter Underpass", [
    { id: "tt", kind: "teeter-totter", x: 0, z: 60 },
  ]);
  try {
    const mech = () =>
      sim.dungeon.mechanisms.find((m) => m.h.kind === "teeter-totter")!;
    // Pin the motor so the north end starts at max lift.
    mech().h.phase = -TEETER.period / 4;
    const body = () => mech().body!;
    const endBottomNorth = () => {
      const q = body().rotation();
      const end = new Vector3(0, -TEETER.h / 2, TEETER.d / 2).applyQuaternion(
        new Quaternion(q.x, q.y, q.z, q.w),
      );
      return body().translation().y + end.y;
    };
    sim.step({ brake: 1 });
    expect(endBottomNorth()).toBeGreaterThan(5);
    // Drive at the raised end; the truck passes under it, never climbs it.
    sim.body.setTranslation({ x: 0, y: 2, z: 82 }, true);
    sim.body.setRotation({ x: 0, y: 1, z: 0, w: 0 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: -14 }, true);
    let clearance = 0;
    let i = 0;
    for (; i < 300; i++) {
      sim.step({ throttle: 1 });
      if (sim.body.translation().z < 75) {
        clearance = endBottomNorth();
        break;
      }
    }
    expect(i).toBeLessThan(300);
    expect(clearance).toBeGreaterThan(4.5);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("mailbox shrinks, parcels, posts and explodes touching trucks", () => {
  const sim = fixture("Mailbox Post", [{ id: "mb", kind: "mailbox", x: 0, z: 0 }]);
  try {
    sim.body.setTranslation({ x: 5, y: 2, z: 0 }, true);
    for (let i = 0; i < 120 && !sim.dungeon.mailboxHolding; i++) sim.step({ brake: 1 });
    expect(sim.dungeon.mailboxHolding).toBe(true);
    expect(sim.damageEvents.some((e) => e.source === "mailbox")).toBe(true);
    // Mid-shrink the truck renders tiny; inputs do nothing to the frozen body.
    for (let i = 0; i < 54; i++) sim.step({ throttle: 1, steer: 1 });
    expect(sim.dungeon.mailboxShrink).toBeLessThan(1);
    expect(sim.dungeon.mailboxShrink).toBeGreaterThan(0);
    // The parcel flight carries the frozen truck to the mailbox slot.
    const from = { ...sim.body.translation() };
    for (let i = 0; i < 120; i++) sim.step({});
    const slot = sim.body.translation();
    expect(Math.hypot(slot.x - 0, slot.z - 0)).toBeLessThan(
      Math.hypot(from.x - 0, from.z - 0),
    );
    expect(slot.y).toBeGreaterThan(from.y);
    // After the wait comes the scorched burst and the wreck.
    for (let i = 0; i < 600 && sim.status === "driving"; i++) sim.step({});
    expect(sim.status).toBe("wrecked");
    // The burst debris stays small: the truck never un-shrinks.
    expect(sim.dungeon.mailboxShrink).toBe(0.3);
    expect(sim.dungeon.mailboxHolding).toBe(false);
    expect(sim.scorch).toBeGreaterThan(0.5);
    expect(sim.smoking).toBe(true);
    const burst = [...sim.parts.values()].filter((p) => !!p.body);
    expect(burst.length).toBeGreaterThanOrEqual(4);
    expect(
      sim.damageEvents.filter((e) => e.source === "mailbox"),
    ).toHaveLength(2);
  } finally {
    sim.dispose();
  }
});

it("mailbox leaves trucks alone outside its pit zone", () => {
  const sim = fixture("Mailbox Calm", [{ id: "mb", kind: "mailbox", x: 0, z: 0 }]);
  try {
    // High above (deck crossing) and far away: never triggers.
    sim.body.setTranslation({ x: 0, y: 6, z: 0 }, true);
    for (let i = 0; i < 120; i++) sim.step({ brake: 1 });
    expect(sim.dungeon.mailboxHolding).toBe(false);
    sim.body.setTranslation({ x: 30, y: 2, z: 0 }, true);
    for (let i = 0; i < 120; i++) sim.step({ brake: 1 });
    expect(sim.dungeon.mailboxHolding).toBe(false);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("giant snowball shatters harmlessly like a snowman", () => {
  const sim = fixture("Snowball Smash", [{ id: "sb", kind: "snowball", x: 0, z: 40 }]);
  try {
    const prop = () => sim.props.props.find((p) => p.definition.id === "sb")!;
    expect(prop().definition.kind).toBe("snowball");
    sim.body.setTranslation({ x: 0, y: 2, z: 40 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: -20 }, true);
    for (let i = 0; i < 120 && !prop().broken; i++) sim.step({ throttle: 1 });
    expect(prop().broken).toBe(true);
    expect(prop().pieces).toHaveLength(12);
    // Soft packed snow: no part stripping, unlike the cursed snowman.
    for (const part of sim.parts.values()) expect(part.health).toBeGreaterThan(0);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});
