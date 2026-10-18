import { BufferGeometry, Vector3 } from "three";
import type RAPIER from "@dimforge/rapier3d-compat";
export const PARTS = [
  {
    id: "chassis-front",
    pos: [0, 0, 0.8],
    size: [2.2, 0.6, 2.7],
    mass: 2500,
    hp: 300,
  },
  {
    id: "chassis-rear",
    pos: [0, 0, -1.6],
    size: [2.2, 0.6, 1.9],
    mass: 500,
    hp: 250,
  },
  {
    id: "wheel-fl",
    pos: [-1.65, -0.85, 1.65],
    size: [1, 2.1, 2.1],
    mass: 100,
    hp: 100,
  },
  {
    id: "wheel-fr",
    pos: [1.65, -0.85, 1.65],
    size: [1, 2.1, 2.1],
    mass: 100,
    hp: 100,
  },
  {
    id: "wheel-rl",
    pos: [-1.65, -0.85, -1.65],
    size: [1, 2.1, 2.1],
    mass: 100,
    hp: 100,
    parent: "chassis-rear",
  },
  {
    id: "wheel-rr",
    pos: [1.65, -0.85, -1.65],
    size: [1, 2.1, 2.1],
    mass: 100,
    hp: 100,
    parent: "chassis-rear",
  },
  {
    id: "hood",
    pos: [0, 0.65, 1.65],
    size: [2.5, 0.45, 1.5],
    mass: 50,
    hp: 90,
  },
  {
    id: "roof",
    pos: [0, 1.8, -0.05],
    size: [2.5, 0.22, 1.8],
    mass: 50,
    hp: 90,
  },
  {
    id: "door-left",
    pos: [-1.23, 0.9, -0.1],
    size: [0.18, 1, 1.6],
    mass: 35,
    hp: 75,
  },
  {
    id: "door-right",
    pos: [1.23, 0.9, -0.1],
    size: [0.18, 1, 1.6],
    mass: 35,
    hp: 75,
  },
  {
    id: "bed",
    pos: [0, 0.65, -1.85],
    size: [2.5, 0.4, 1.6],
    mass: 70,
    hp: 110,
    parent: "chassis-rear",
  },
  {
    id: "bumper-front",
    pos: [0, 0.05, 2.75],
    size: [2.8, 0.35, 0.3],
    mass: 40,
    hp: 100,
  },
  {
    id: "bumper-rear",
    pos: [0, 0.05, -2.75],
    size: [2.8, 0.35, 0.3],
    mass: 40,
    hp: 100,
    parent: "chassis-rear",
  },
] as const;
export type PartId = (typeof PARTS)[number]["id"];
export type PartState = {
  health: number;
  body?: RAPIER.RigidBody;
  collider?: RAPIER.Collider;
  dents: { point: Vector3; strength: number }[];
};
/** Local radial displacement, limited per impact. Render geometry is never a collider. */
export function deformGeometry(
  geometry: BufferGeometry,
  point: Vector3,
  strength: number,
  radius = 1.4,
) {
  const p = geometry.attributes.position;
  const direction = point.clone().normalize().negate();
  if (direction.lengthSq() === 0) direction.set(0, -1, 0);
  for (let i = 0; i < p.count; i++) {
    const v = new Vector3().fromBufferAttribute(p, i);
    const falloff = Math.max(0, 1 - v.distanceTo(point) / radius);
    v.addScaledVector(
      direction,
      Math.min(0.5, Math.max(0, strength)) * falloff * falloff,
    );
    p.setXYZ(i, v.x, v.y, v.z);
  }
  p.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
}
