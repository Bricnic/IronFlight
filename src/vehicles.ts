import type * as T from "three";
import { PARTS } from "./damage";
import { createTruck, type TruckMaterials } from "./truck";
export type VehicleId = "monster-truck";
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
    build: (options) => createTruck(options),
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
    const group = v.build();
    for (const id of ids)
      if (!group.getObjectByName(id))
        throw new Error(`${v.id}: mesh misses part ${id}`);
  }
}
