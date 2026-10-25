import type * as T from "three";
import { PARTS } from "./damage";
import { createTruck, type TruckMaterials } from "./truck";
import {
  createSportsCar,
  SPORTS_PARTS,
  SPORTS_SUSPENSION,
  SPORTS_SUSPENSION_REST,
  SPORTS_WHEEL_RADIUS,
} from "./sports-car";
export type VehicleId = "monster-truck" | "sports-car";
export interface VehiclePart {
  id: string;
  pos: readonly [number, number, number];
  size: readonly [number, number, number];
  mass: number;
  hp: number;
  parent?: string;
}
export interface VehicleDef {
  id: VehicleId;
  name: string;
  blurb: string;
  /** Same 13 part ids in PARTS order; geometry may differ per vehicle. */
  parts: readonly VehiclePart[];
  /** Suspension hardpoints for wheel-fl/fr/rl/rr in body space. */
  suspension: [number, number, number][];
  /** Raycast wheel radius and rest length for the vehicle controller. */
  wheelRadius: number;
  suspensionRest: number;
  build: (options?: TruckMaterials) => T.Group;
  lights?: "police" | "ems";
}
export const VEHICLES: VehicleDef[] = [
  {
    id: "monster-truck",
    name: "Monster Truck",
    blurb: "The original. Huge tires, huge air, huge damage.",
    parts: PARTS,
    suspension: [
      [1.65, -0.35, 1.65],
      [-1.65, -0.35, 1.65],
      [1.65, -0.35, -1.65],
      [-1.65, -0.35, -1.65],
    ],
    wheelRadius: 1.05,
    suspensionRest: 0.6,
    build: (options) => createTruck(options),
  },
  {
    id: "sports-car",
    name: "Sports Car",
    blurb: "Low, light and quick. A GT wing for the long jumps.",
    parts: SPORTS_PARTS,
    suspension: SPORTS_SUSPENSION,
    wheelRadius: SPORTS_WHEEL_RADIUS,
    suspensionRest: SPORTS_SUSPENSION_REST,
    build: (options) => createSportsCar(options),
  },
];
export function getVehicle(id: string): VehicleDef {
  const vehicle = VEHICLES.find((v) => v.id === id);
  if (!vehicle) throw new RangeError(`Unknown vehicle: ${id}`);
  return vehicle;
}
export function validateVehicles() {
  const ids = PARTS.map((p) => p.id);
  for (const v of VEHICLES) {
    if (v.parts.map((p) => p.id).join() !== ids.join())
      throw new Error(`${v.id}: parts must match PARTS ids in order`);
    if (v.suspension.length !== 4)
      throw new Error(`${v.id}: needs four suspension hardpoints`);
    if (!(v.wheelRadius > 0) || !(v.suspensionRest > 0))
      throw new Error(`${v.id}: needs positive wheel radius and rest length`);
    const group = v.build();
    for (const id of ids)
      if (!group.getObjectByName(id))
        throw new Error(`${v.id}: mesh misses part ${id}`);
  }
}
