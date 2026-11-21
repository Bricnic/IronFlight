import { Vector3 } from "three";
export type ResizeHandle = { x: -1 | 0 | 1; y: -1 | 0 | 1; z: -1 | 0 | 1 };
export type ResizeBox = { x: number; y: number; z: number; w: number; h: number; d: number };
export const MIN_SIZE = 0.05;
/** A face's four edges, with corners chosen in their overlapping end regions. */
export function chooseResizeHandle(box: ResizeBox, point: Vector3, normal: Vector3): ResizeHandle {
  const axes = ["x", "y", "z"] as const;
  const size = { x: box.w, y: box.h, z: box.d };
  const face = axes.reduce((a, b) => Math.abs(normal[a]) > Math.abs(normal[b]) ? a : b);
  const plane = axes.filter(a => a !== face);
  const distances = plane.map(a => ({ axis: a, distance: Math.max(0, size[a] / 2 - Math.abs(point[a] - box[a])) }));
  const closest = Math.min(...distances.map(a => a.distance));
  const cornerRegion = Math.min(...plane.map(a => size[a])) * 0.15;
  const handle: ResizeHandle = { x: 0, y: 0, z: 0 };
  if (closest >= cornerRegion) {
    const axis = distances.find(d => d.distance === closest)!.axis;
    handle[axis] = point[axis] >= box[axis] ? 1 : -1;
  } else for (const { axis, distance } of distances) if (distance <= cornerRegion) handle[axis] = point[axis] >= box[axis] ? 1 : -1;
  return handle;
}
export function resizeBox(box: ResizeBox, handle: ResizeHandle, point: Vector3): ResizeBox {
  const out = { ...box };
  for (const [axis, dimension] of [["x", "w"], ["y", "h"], ["z", "d"]] as const) {
    const side = handle[axis];
    if (!side) continue;
    const fixed = box[axis] - side * box[dimension] / 2;
    out[dimension] = Math.max(MIN_SIZE, side * (point[axis] - fixed));
    out[axis] = fixed + side * out[dimension] / 2;
  }
  return out;
}
