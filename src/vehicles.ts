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
import {
  createCopCar,
  COP_PARTS,
  COP_SUSPENSION,
  COP_SUSPENSION_REST,
  COP_WHEEL_RADIUS,
} from "./cop-car";
import {
  createAmbulance,
  AMBULANCE_PARTS,
  AMBULANCE_SUSPENSION,
  AMBULANCE_SUSPENSION_REST,
  AMBULANCE_WHEEL_RADIUS,
} from "./ambulance";
import {
  createSchoolBus,
  BUS_PARTS,
  BUS_SUSPENSION,
  BUS_SUSPENSION_REST,
  BUS_WHEEL_RADIUS,
} from "./school-bus";
import {
  createHovercraft,
  HOVERCRAFT_PARTS,
  HOVERCRAFT_SUSPENSION,
  HOVERCRAFT_SUSPENSION_REST,
  HOVERCRAFT_WHEEL_RADIUS,
} from "./hovercraft";
import {
  createSnowGroomer,
  GROOMER_PARTS,
  GROOMER_SUSPENSION,
  GROOMER_SUSPENSION_REST,
  GROOMER_WHEEL_RADIUS,
} from "./snow-groomer";
import {
  createHotRod,
  HOTROD_PARTS,
  HOTROD_SUSPENSION,
  HOTROD_SUSPENSION_REST,
  HOTROD_WHEEL_RADIUS,
} from "./hot-rod";
import {
  createTowTruck,
  WRECKER_PARTS,
  WRECKER_SUSPENSION,
  WRECKER_SUSPENSION_REST,
  WRECKER_WHEEL_RADIUS,
} from "./tow-truck";
import { CONCEPT_VEHICLES } from "./concept-vehicles";
export type VehicleId =
  | "monster-truck"
  | "sports-car"
  | "cop-car"
  | "ambulance"
  | "school-bus"
  | "hovercraft"
  | "snow-groomer"
  | "hot-rod"
  | "tow-truck"
  | (typeof CONCEPT_VEHICLES)[number]["id"];
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
  seriesDecal?: false;
}
const standardChassis = {
  parts: PARTS,
  suspension: [
    [1.65, -0.35, 1.65],
    [-1.65, -0.35, 1.65],
    [1.65, -0.35, -1.65],
    [-1.65, -0.35, -1.65],
  ] as VehicleDef["suspension"],
  wheelRadius: 1.05,
  suspensionRest: 0.6,
};
export const VEHICLES: VehicleDef[] = [
  {
    id: "monster-truck",
    name: "Monster Truck",
    blurb: "The original. Huge tires, huge air, huge damage.",
    ...standardChassis,
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
  {
    id: "cop-car",
    name: "Cop Car",
    blurb: "Black-and-white interceptor. Light bar wakes up past 90 mph.",
    parts: COP_PARTS,
    suspension: COP_SUSPENSION,
    wheelRadius: COP_WHEEL_RADIUS,
    suspensionRest: COP_SUSPENSION_REST,
    build: (options) => createCopCar(options),
    lights: "police",
  },
  {
    id: "ambulance",
    name: "Ambulance",
    blurb: "Box rig with a red stripe. Light bar wakes up past 90 mph.",
    parts: AMBULANCE_PARTS,
    suspension: AMBULANCE_SUSPENSION,
    wheelRadius: AMBULANCE_WHEEL_RADIUS,
    suspensionRest: AMBULANCE_SUSPENSION_REST,
    build: (options) => createAmbulance(options),
    lights: "ems",
  },
  {
    id: "school-bus",
    name: "School Bus",
    blurb: "Tall transit bus with bench rows and a stop sign.",
    parts: BUS_PARTS,
    suspension: BUS_SUSPENSION,
    wheelRadius: BUS_WHEEL_RADIUS,
    suspensionRest: BUS_SUSPENSION_REST,
    build: (options) => createSchoolBus(options),
  },
  {
    id: "hovercraft",
    name: "Hovercraft",
    blurb: "HOVERCRAFT — heavy. Skirt barge with a lift fan and a roof gun.",
    parts: HOVERCRAFT_PARTS,
    suspension: HOVERCRAFT_SUSPENSION,
    wheelRadius: HOVERCRAFT_WHEEL_RADIUS,
    suspensionRest: HOVERCRAFT_SUSPENSION_REST,
    build: (options) => createHovercraft(options),
    seriesDecal: false,
  },
  {
    id: "snow-groomer",
    name: "Snow Groomer",
    blurb: "GROOMER — tracked. Twin tracks, mesh plow, and a tall lime cab.",
    parts: GROOMER_PARTS,
    suspension: GROOMER_SUSPENSION,
    wheelRadius: GROOMER_WHEEL_RADIUS,
    suspensionRest: GROOMER_SUSPENSION_REST,
    build: (options) => createSnowGroomer(options),
    seriesDecal: false,
  },
  {
    id: "hot-rod",
    name: "Hot Rod",
    blurb: "HOT ROD — fast. Blown V8, white headers, huge rear tires.",
    parts: HOTROD_PARTS,
    suspension: HOTROD_SUSPENSION,
    wheelRadius: HOTROD_WHEEL_RADIUS,
    suspensionRest: HOTROD_SUSPENSION_REST,
    build: (options) => createHotRod(options),
    seriesDecal: false,
  },
  {
    id: "tow-truck",
    name: "Tow Truck",
    blurb: "WRECKER — heavy. Cab-over crane with a loaded flatbed.",
    parts: WRECKER_PARTS,
    suspension: WRECKER_SUSPENSION,
    wheelRadius: WRECKER_WHEEL_RADIUS,
    suspensionRest: WRECKER_SUSPENSION_REST,
    build: (options) => createTowTruck(options),
    seriesDecal: false,
  },
  ...CONCEPT_VEHICLES.map((vehicle) => ({
    ...vehicle,
    ...standardChassis,
    seriesDecal: false as const,
  })),
];
/** Game mph everywhere: the HUD and comic hazards use m/s x 3.6. */
export const MS_TO_GAME_MPH = 3.6;
export const LIGHT_BAR_MPH = 90;
/** Alternating dome intensities; steady dim at or below the threshold. */
export function lightBarState(speedMs: number, time: number) {
  if (speedMs * MS_TO_GAME_MPH <= LIGHT_BAR_MPH) return { a: 0.15, b: 0.15 };
  return Math.floor(time * 6) % 2 === 0
    ? { a: 3, b: 0.15 }
    : { a: 0.15, b: 3 };
}
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
    if (v.lights)
      for (const dome of ["lightbar-a", "lightbar-b"])
        if (!group.getObjectByName(dome))
          throw new Error(`${v.id}: mesh misses ${dome}`);
  }
}
