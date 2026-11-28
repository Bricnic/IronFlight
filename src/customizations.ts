import * as T from "three";
import { PARTS } from "./damage";
import { VEHICLES } from "./vehicles";
import type { SettingsStorage } from "./settings";

/** One spray-can dab, stored in its part group's local frame. */
export interface PaintDab {
  part: string;
  at: [number, number, number];
  normal: [number, number, number];
  color: number;
  size: number;
}
/** Bucket fill: recolor one part's meshes matching `from` within tolerance. */
export interface PaintFill {
  part: string;
  from: number;
  to: number;
  /** Color distance 0..1 (fraction of the slider percent). */
  tolerance: number;
}
export interface Customization {
  id: string;
  name: string;
  createdAt: number;
  fills: PaintFill[];
  dabs: PaintDab[];
}
interface VehicleCustoms {
  active: string;
  customs: Customization[];
}
export const MAX_CUSTOMS = 12;
export const MAX_DABS = 600;
const KEY = "iron-flight-customizations-v1";
const PART_IDS: Set<string> = new Set(PARTS.map((p) => p.id));

const isHex = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 0xffffff;
const isVec3 = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) &&
  v.length === 3 &&
  v.every((n) => typeof n === "number" && Number.isFinite(n));
function isDab(v: unknown): v is PaintDab {
  const d = v as PaintDab;
  return (
    !!d &&
    typeof d.part === "string" &&
    isVec3(d.at) &&
    isVec3(d.normal) &&
    isHex(d.color) &&
    typeof d.size === "number" &&
    Number.isFinite(d.size) &&
    d.size > 0 &&
    d.size <= 1
  );
}
function isFill(v: unknown): v is PaintFill {
  const f = v as PaintFill;
  return (
    !!f &&
    typeof f.part === "string" &&
    isHex(f.from) &&
    isHex(f.to) &&
    typeof f.tolerance === "number" &&
    f.tolerance >= 0 &&
    f.tolerance <= 1
  );
}
function isCustom(v: unknown): v is Customization {
  const c = v as Customization;
  return (
    !!c &&
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    typeof c.createdAt === "number" &&
    Array.isArray(c.fills) &&
    c.fills.every(isFill) &&
    Array.isArray(c.dabs) &&
    c.dabs.every(isDab)
  );
}

/** Stored paint jobs, repaired: unknown vehicles and invalid entries dropped. */
export function loadCustomizations(
  storage: SettingsStorage = globalThis.localStorage,
): Record<string, VehicleCustoms> {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, VehicleCustoms> = {};
    for (const v of VEHICLES) {
      const entry = parsed?.[v.id] as { active?: unknown; customs?: unknown } | undefined;
      if (!entry || typeof entry !== "object") continue;
      const customs = Array.isArray(entry.customs)
        ? entry.customs.filter(isCustom).slice(0, MAX_CUSTOMS)
        : [];
      const active =
        typeof entry.active === "string" &&
        (entry.active === "default" || customs.some((c) => c.id === entry.active))
          ? entry.active
          : "default";
      if (customs.length) out[v.id] = { active, customs };
    }
    return out;
  } catch {
    return {};
  }
}
function persist(all: Record<string, VehicleCustoms>, storage: SettingsStorage) {
  storage.setItem(KEY, JSON.stringify(all));
}

/** Saved paint jobs for one vehicle, oldest first. */
export function listCustomizations(
  vehicleId: string,
  storage: SettingsStorage = globalThis.localStorage,
): Customization[] {
  return loadCustomizations(storage)[vehicleId]?.customs ?? [];
}

/** Active finish id ("default" when stock). */
export function activeFinishId(
  vehicleId: string,
  storage: SettingsStorage = globalThis.localStorage,
): string {
  return loadCustomizations(storage)[vehicleId]?.active ?? "default";
}

/** Active customization, or null for the factory finish. */
export function activeCustomization(
  vehicleId: string,
  storage: SettingsStorage = globalThis.localStorage,
): Customization | null {
  const entry = loadCustomizations(storage)[vehicleId];
  if (!entry || entry.active === "default") return null;
  return entry.customs.find((c) => c.id === entry.active) ?? null;
}

/** Save a paint job; duplicate names gain a suffix. Null at the per-vehicle cap. */
export function saveCustomization(
  vehicleId: string,
  name: string,
  fills: PaintFill[],
  dabs: PaintDab[],
  storage: SettingsStorage = globalThis.localStorage,
): Customization | null {
  const all = loadCustomizations(storage);
  const entry = all[vehicleId] ?? { active: "default", customs: [] };
  if (entry.customs.length >= MAX_CUSTOMS) return null;
  const clean = name.trim().slice(0, 24) || "Custom";
  let finalName = clean;
  let n = 2;
  while (entry.customs.some((c) => c.name === finalName)) finalName = `${clean} ${n++}`;
  const customization: Customization = {
    id: `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: finalName,
    createdAt: Date.now(),
    fills: fills.filter(isFill),
    dabs: dabs.filter(isDab).slice(0, MAX_DABS),
  };
  entry.customs.push(customization);
  all[vehicleId] = entry;
  persist(all, storage);
  return customization;
}

export function deleteCustomization(
  vehicleId: string,
  id: string,
  storage: SettingsStorage = globalThis.localStorage,
) {
  const all = loadCustomizations(storage);
  const entry = all[vehicleId];
  if (!entry) return;
  entry.customs = entry.customs.filter((c) => c.id !== id);
  if (entry.active === id) entry.active = "default";
  if (!entry.customs.length) delete all[vehicleId];
  else all[vehicleId] = entry;
  persist(all, storage);
}

/** Select the default finish or a saved customization. Unknown ids repair to default. */
export function setActiveFinish(
  vehicleId: string,
  id: string,
  storage: SettingsStorage = globalThis.localStorage,
): string {
  const all = loadCustomizations(storage);
  const entry = all[vehicleId] ?? { active: "default", customs: [] };
  entry.active =
    id === "default" || entry.customs.some((c) => c.id === id) ? id : "default";
  if (entry.customs.length) all[vehicleId] = entry;
  else delete all[vehicleId];
  persist(all, storage);
  return entry.active;
}

/** RGB euclidean distance normalized to 0..1. */
export function colorDistance(a: number, b: number): number {
  const dr = ((a >> 16) & 0xff) - ((b >> 16) & 0xff);
  const dg = ((a >> 8) & 0xff) - ((b >> 8) & 0xff);
  const db = (a & 0xff) - (b & 0xff);
  return Math.hypot(dr, dg, db) / Math.hypot(255, 255, 255);
}

/** Part id of the named group a mesh belongs to, or null outside the bodywork. */
export function partOf(root: T.Object3D, object: T.Object3D): string | null {
  let node: T.Object3D | null = object;
  while (node && node !== root) {
    if (node.name && PART_IDS.has(node.name)) return node.name;
    node = node.parent;
  }
  return null;
}

const colored = (m: T.Material): m is T.Material & { color: T.Color } =>
  "color" in m && (m as { color: unknown }).color instanceof T.Color;

/**
 * Apply a paint job to a freshly built vehicle: clone materials per mesh so
 * fills never leak across parts, replay fills in order, then lay dabs on top.
 */
export function applyCustomization(
  root: T.Group,
  customization: Customization,
): { fills: number; dabs: number } {
  const meshes: T.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof T.Mesh && !o.userData.paintDab) meshes.push(o);
  });
  for (const mesh of meshes) {
    const mat = mesh.material as T.Material;
    if (colored(mat)) mesh.material = mat.clone();
  }
  let fills = 0;
  for (const fill of customization.fills) {
    const group = root.getObjectByName(fill.part);
    if (!group) continue;
    for (const mesh of meshes) {
      if (partOf(root, mesh) !== fill.part) continue;
      const mat = mesh.material as T.Material;
      if (!colored(mat)) continue;
      if (colorDistance(mat.color.getHex(), fill.from) <= fill.tolerance + 1e-9) {
        mat.color.setHex(fill.to);
        fills++;
      }
    }
  }
  let dabs = 0;
  for (const dab of customization.dabs) {
    const group = root.getObjectByName(dab.part);
    if (!(group instanceof T.Group)) continue;
    const mesh = new T.Mesh(
      new T.SphereGeometry(1, 12, 8),
      new T.MeshStandardMaterial({ color: dab.color, roughness: 0.55 }),
    );
    mesh.scale.set(dab.size, dab.size * 0.35, dab.size);
    mesh.position.fromArray(dab.at);
    mesh.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      new T.Vector3(...dab.normal).normalize(),
    );
    mesh.userData.paintDab = true;
    group.add(mesh);
    dabs++;
  }
  return { fills, dabs };
}
