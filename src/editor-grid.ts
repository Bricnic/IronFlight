import * as T from "three";

export type GridAxis = "x" | "y" | "z";
export interface EditorGridSettings {
  spacing: number;
  snap: boolean;
  show: boolean;
  x: boolean;
  y: boolean;
  z: boolean;
}
export const DEFAULT_EDITOR_GRID: EditorGridSettings = { spacing: 5, snap: false, show: true, x: true, y: false, z: true };
export const GRID_COLORS = { x: 0xf06c65, y: 0x72d785, z: 0x6baeff };
export function snapCoordinate(value: number, spacing: number) {
  return Number((Math.round(value / spacing) * spacing).toPrecision(12));
}
/** Three intersecting world-aligned planes keep the grid readable in perspective. */
export function buildWorldGrid(settings: EditorGridSettings) {
  const root = new T.Group();
  const count = Math.min(20, Math.max(1, Math.ceil(100 / settings.spacing)));
  const extent = count * settings.spacing;
  for (const axis of ["x", "y", "z"] as const) {
    if (!settings[axis]) continue;
    const coordinates: number[] = [];
    const others = (["x", "y", "z"] as const).filter(a => a !== axis);
    for (const offsetAxis of others) for (let i = -count; i <= count; i++) {
      if (!settings.y && offsetAxis === "y") continue;
      if (settings.y && i === 0 && offsetAxis === others[1]) continue;
      const a = new T.Vector3(), b = new T.Vector3();
      a[offsetAxis] = b[offsetAxis] = i * settings.spacing;
      a[axis] = -extent; b[axis] = extent;
      coordinates.push(...a.toArray(), ...b.toArray());
    }
    const geometry = new T.BufferGeometry(); geometry.setAttribute("position", new T.Float32BufferAttribute(coordinates, 3));
    const lines = new T.LineSegments(geometry, new T.LineBasicMaterial({ color: GRID_COLORS[axis], transparent: true, opacity: 0.32, depthWrite: false }));
    lines.name = `world-grid-${axis}`; root.add(lines);
  }
  return root;
}
