import R from "@dimforge/rapier3d-compat";
import { Quaternion, Vector3 } from "three";
import { DT } from "./clock";
import { isGauntletMachine } from "./custom-level";
import { WINDOW_GATE, type DungeonHazard } from "./dungeon-hazards";
import { hammerStrike } from "./hammer-impact";
import type { Simulation } from "./simulation";
import {
  CLAW_CLOSE, CLAW_HOLD, SCREW_POSITIONS, SPIKE_FALL, SPIKE_SIDE_X, TANK,
  VOLCANO_PLUME_RADIUS, VOLCANO_RIM, WINDOW_GATE_COOLDOWN,
  screwLift, screwWave, volcanoPhase, windowGateBlocked,
} from "./gauntlet-timing";

/** A mistimed gate crossing hits with exactly a quarter of a hammer strike. */
export function windowGateDeltaVelocity(radius: Vector3, normal: Vector3, incoming: Vector3) {
  return hammerStrike(radius, normal, incoming).deltaVelocity.multiplyScalar(0.25);
}

type TankState = {
  kind: "drill-tank";
  body: R.RigidBody;
  yaw: number;
  contactTicks: number;
  pulses: number;
};
type ClawState = {
  kind: "crusher-claw";
  started: number;
  caught: boolean;
  release: number;
  anchor?: R.Vector;
};
type MachineState = TankState | ClawState
  | { kind: "screw-field"; wave: number; hits: Set<number> }
  | { kind: "spike-gates"; started: [number, number] }
  | { kind: "window-gate"; lastHit: number }
  | { kind: "start-gate" | "volcano" };

export function localPosition(h: DungeonHazard, p: R.Vector) {
  const yaw = h.yaw ?? 0, dx = p.x - h.x, dz = p.z - h.z;
  return {
    x: dx * Math.cos(yaw) - dz * Math.sin(yaw),
    y: p.y - (h.y ?? 0),
    z: dx * Math.sin(yaw) + dz * Math.cos(yaw),
  };
}
const up = new Vector3(0, 1, 0);
const orientation = (yaw: number) => new Quaternion().setFromAxisAngle(up, yaw);
const clawReach = ({ x, y, z }: R.Vector) => Math.abs(x) < 4.7 && y > -0.4 && y < 5.2 && z > 0.5 && z < 8.5;

export class GauntletPhysics {
  readonly machines = new Map<string, { h: DungeonHazard; state: MachineState; contacts: number }>();
  constructor(private sim: Simulation) {}
  add(h: DungeonHazard) {
    if (!isGauntletMachine(h.kind)) return;
    let state: MachineState;
    switch (h.kind) {
      case "drill-tank": {
        const yaw = h.yaw ?? 0;
        const body = this.sim.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased()
          .setTranslation(h.x, h.y ?? 0, h.z).setRotation(orientation(yaw)));
        const points = [-3.9, 0.3, -3.3, 3.9, 0.3, -3.3, 0, 0.3, 4.4,
          -3.9, 2.7, -3.3, 3.9, 2.7, -3.3, 0, 2.7, 4.4];
        this.sim.world.createCollider(R.ColliderDesc.convexHull(new Float32Array(points))!, body);
        state = { kind: h.kind, body, yaw, contactTicks: 0, pulses: 0 };
        break;
      }
      case "crusher-claw": state = { kind: h.kind, started: -Infinity, release: -Infinity, caught: false }; break;
      case "screw-field": state = { kind: h.kind, wave: -1, hits: new Set() }; break;
      case "spike-gates": state = { kind: h.kind, started: [-Infinity, -Infinity] }; break;
      case "window-gate": state = { kind: h.kind, lastHit: -Infinity }; break;
      default: state = { kind: h.kind };
    }
    this.machines.set(h.id, { h, state, contacts: 0 });
  }
  move(id: string, dx: number, dy: number, dz: number) {
    const state = this.machines.get(id)?.state;
    if (state?.kind !== "drill-tank") return;
    const p = state.body.translation();
    const next = { x: p.x + dx, y: p.y + dy, z: p.z + dz };
    state.body.setTranslation(next, true);
    state.body.setNextKinematicTranslation(next);
  }
  remove(id: string) {
    const state = this.machines.get(id)?.state;
    if (state?.kind === "drill-tank") this.sim.world.removeRigidBody(state.body);
    this.machines.delete(id);
  }
  inspect(id: string) {
    const machine = this.machines.get(id);
    if (!machine) return undefined;
    const { h, state, contacts } = machine;
    const time = this.sim.time;
    const pose = state.kind === "drill-tank" ? state.body.translation() : h;
    let striking = false;
    switch (state.kind) {
      case "screw-field": striking = screwWave(time, h.phase).shots.some(({ age }) => screwLift(age) > 0.35); break;
      case "volcano": striking = volcanoPhase(time + h.phase).erupting; break;
      case "spike-gates": striking = state.started.some((start) => time - start >= SPIKE_FALL && time - start <= 0.52); break;
      case "window-gate": striking = windowGateBlocked(time + h.phase); break;
      case "drill-tank": striking = state.contactTicks > 0; break;
      case "crusher-claw": striking = time - state.started < CLAW_CLOSE || time < state.release; break;
    }
    return { x: pose.x, z: pose.z, contacts, striking,
      colliders: state.kind === "drill-tank" ? state.body.numColliders() : 0 };
  }
  get holding() {
    for (const { state } of this.machines.values())
      if (state.kind === "crusher-claw" && this.sim.time < state.release) return true;
    return false;
  }
  private steerTank(h: DungeonHazard, state: TankState, player: R.Vector) {
    const p = state.body.translation();
    const dx = player.x - p.x, dz = player.z - p.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 1e-4) return;
    const error = Math.atan2(dx, dz) - state.yaw;
    const turn = Math.atan2(Math.sin(error), Math.cos(error));
    state.yaw += Math.max(-TANK.turn * DT, Math.min(TANK.turn * DT, turn));
    state.body.setNextKinematicRotation(orientation(state.yaw));
    if (distance > TANK.aggro || distance < 5.2 || Math.abs(turn) > 0.7 || Math.abs(player.y - p.y - 2) > 5) return;
    const x = p.x + Math.sin(state.yaw) * TANK.speed * DT - h.x;
    const z = p.z + Math.cos(state.yaw) * TANK.speed * DT - h.z;
    const leash = Math.min(1, TANK.leash / (Math.hypot(x, z) || 1));
    state.body.setNextKinematicTranslation({ x: h.x + x * leash, y: p.y, z: h.z + z * leash });
  }
  before() {
    const s = this.sim;
    if (s.status !== "driving") return;
    const player = s.body.translation();
    for (const { h, state } of this.machines.values()) {
      if (state.kind === "drill-tank") this.steerTank(h, state, player);
      if (state.kind === "crusher-claw" && state.anchor && s.time < state.release) {
        const still = { x: 0, y: 0, z: 0 };
        s.body.setTranslation(state.anchor, true);
        s.body.setLinvel(still, true);
        s.body.setAngvel(still, true);
      }
    }
  }
  private screwHit(h: DungeonHazard, state: Extract<MachineState, { kind: "screw-field" }>, p: R.Vector) {
    if (Math.abs(p.x) > 29 || Math.abs(p.z) > 29 || p.y < 0 || p.y > 8.5) return false;
    const s = this.sim;
    const { wave, shots } = screwWave(s.time, h.phase);
    if (wave !== state.wave) {
      state.wave = wave;
      state.hits.clear();
    }
    for (const { index, age } of shots) {
      const lift = screwLift(age);
      if (lift <= 0.35 || state.hits.has(index)) continue;
      const { x, z } = SCREW_POSITIONS[index];
      if (Math.hypot(p.x - x, p.z - z) > 2.35 || p.y > lift + 2.2) continue;
      state.hits.add(index);
      const velocity = s.body.linvel();
      const backwards = new Vector3(-velocity.x, 0, -velocity.z);
      if (backwards.lengthSq() < 1) {
        backwards.set(0, 0, -1).applyQuaternion(new Quaternion().copy(s.body.rotation()));
        backwards.y = 0;
      }
      backwards.normalize().multiplyScalar(27);
      backwards.y = 17;
      s.body.applyImpulse(backwards.multiplyScalar(s.body.mass()), true);
      s.applyHazardDamage(h.kind, 0.1);
      return true;
    }
    return false;
  }
  private spikeHit(state: Extract<MachineState, { kind: "spike-gates" }>, p: R.Vector) {
    if (p.y < -0.5 || p.y > 7 || Math.abs(p.z) > 8) return false;
    const t = this.sim.time;
    return SPIKE_SIDE_X.some((x, i) => {
      if (Math.abs(p.x - x) > 8.4) return false;
      if (t - state.started[i] > 1.05 && Math.abs(p.z) <= 6.2) state.started[i] = t;
      const age = t - state.started[i];
      return age >= SPIKE_FALL - DT && age <= 0.52;
    });
  }
  private drillHit(h: DungeonHazard, state: TankState, p: R.Vector) {
    const tank = state.body.translation();
    const local = localPosition({ ...h, ...tank, yaw: state.yaw }, p);
    if (Math.abs(local.x) > 2.65 || local.z < 3.8 || local.z > 11.5 || local.y < 0 || local.y > 4.8) {
      state.contactTicks = 0;
      return false;
    }
    if (++state.contactTicks % Math.round(0.1 / DT)) return false;
    state.pulses++;
    this.sim.applyHazardDamage(h.kind, 0.05, state.pulses % 2 === 0 ? 1 : "prepare");
    return true;
  }
  private windowHit(h: DungeonHazard, state: Extract<MachineState, { kind: "window-gate" }>, p: R.Vector, local: { x: number; y: number; z: number }) {
    const s = this.sim;
    if (Math.abs(local.z) > WINDOW_GATE.depth || Math.abs(local.x) > WINDOW_GATE.lane ||
      local.y < -1 || local.y > WINDOW_GATE.top) return false;
    if (!windowGateBlocked(s.time + h.phase)) return false;
    if (s.time - state.lastHit < WINDOW_GATE_COOLDOWN) return false;
    state.lastHit = s.time;
    const yaw = h.yaw ?? 0, cos = Math.cos(yaw), sin = Math.sin(yaw);
    const v = s.body.linvel();
    const incoming = new Vector3(v.x * cos - v.z * sin, v.y, v.x * sin + v.z * cos);
    let normal = new Vector3(-incoming.x, 0, -incoming.z);
    if (normal.lengthSq() < 1e-6) normal.set(0, 0, local.z >= 0 ? 1 : -1);
    else normal.normalize();
    // Radius from the axle midpoint: the hammer tangent throws the car outward.
    const radius = new Vector3(local.x, local.y - WINDOW_GATE.height / 2, 0);
    const delta = windowGateDeltaVelocity(radius, normal, incoming);
    const world = new Vector3(delta.x * cos + delta.z * sin, delta.y, -delta.x * sin + delta.z * cos);
    s.body.applyImpulseAtPoint(world.multiplyScalar(s.body.mass()), new Vector3(p.x, p.y + 1, p.z), true);
    s.applyHazardDamage(h.kind, 0.15, 1);
    return true;
  }
  private clawHit(h: DungeonHazard, state: ClawState, p: R.Vector, local: R.Vector) {
    const s = this.sim;
    if (s.time - state.started >= 2.7 && clawReach(local) && !this.holding) {
      state.started = s.time;
      state.caught = false;
    }
    const age = s.time - state.started;
    if (state.caught || age < CLAW_CLOSE || age >= CLAW_CLOSE + 2 * DT || !clawReach(local)) return false;
    state.caught = true;
    state.anchor = { ...p };
    state.release = s.time + CLAW_HOLD;
    s.applyHazardDamage(h.kind, 0.9, 5);
    if (s.status === "wrecked") state.release = s.time;
    return true;
  }
  after() {
    const s = this.sim;
    let launched = false;
    for (const machine of this.machines.values()) {
      if (s.status !== "driving") break;
      const { h, state } = machine;
      if (state.kind === "start-gate") continue;
      const p = s.body.translation();
      const local = localPosition(h, p);
      let hit = false;
      switch (state.kind) {
        case "screw-field":
          hit = this.screwHit(h, state, local);
          launched ||= hit;
          break;
        case "volcano":
          hit = volcanoPhase(s.time + h.phase).erupting && Math.hypot(local.x, local.z) <= VOLCANO_PLUME_RADIUS &&
            local.y >= VOLCANO_RIM - 1 && local.y <= 49;
          if (hit) s.applyHazardDamage(h.kind, 1);
          break;
        case "spike-gates":
          hit = this.spikeHit(state, local);
          if (hit) s.applyHazardDamage(h.kind, 1);
          break;
        case "window-gate":
          hit = this.windowHit(h, state, p, local);
          launched ||= hit;
          break;
        case "drill-tank": hit = this.drillHit(h, state, p); break;
        case "crusher-claw": hit = this.clawHit(h, state, p, local); break;
      }
      if (hit) machine.contacts++;
    }
    return launched;
  }
}
