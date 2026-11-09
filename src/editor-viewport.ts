import * as T from "three";
import {
  PROP_PREFAB_KINDS,
  CHECKPOINT_WIDTHS,
  isDinosaur,
  isGauntletMachine,
  type CustomLevel,
  type CustomSolid,
} from "./custom-level";
import type { EditorSelection, EditorStore } from "./editor-state";
import { magneticTileMaterial, pbr, slimeMaterial } from "./materials";
import { buildDungeonModel } from "./dungeon-view";
import { buildToyCheckpoint } from "./toy-track-view";
import { scaleSolidUVs } from "./solid-uv";
import { validRect, type ClipRect } from "./editor-clip";
type ViewportHit = { object: unknown; distance?: number; point?: T.Vector3 };
const pickKey = (pick: EditorSelection) => !pick ? "" :
  `${pick.kind}:${"id" in pick ? pick.id : "index" in pick ? pick.index : ""}`;
/** One candidate per logical object, ordered from the camera into the scene.
 * Fill, wireframe, children and exit faces must not add duplicate stops. */
export function resolveViewportStack(hits: ViewportHit[]) {
  const stack: { selection: NonNullable<EditorSelection>; hit: ViewportHit }[] = [];
  const seen = new Set<string>();
  for (const hit of [...hits].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))) {
    let node: unknown = hit.object;
    while (node !== null && node !== undefined) {
      const record = node as {
        userData?: { pick?: EditorSelection; locked?: boolean };
        parent?: unknown;
      };
      if (record.userData?.locked) break;
      if (record.userData?.pick != null) {
        const selection = record.userData.pick, key = pickKey(selection);
        if (!seen.has(key)) { stack.push({ selection, hit }); seen.add(key); }
        break;
      }
      node = record.parent;
    }
  }
  return stack;
}
export function resolveViewportPick(hits: ViewportHit[]): EditorSelection {
  return resolveViewportStack(hits)[0]?.selection ?? null;
}
/** Selection highlights rebuild meshes, so retain logical ids rather than
 * object instances. Camera/content changes or a different click area restart. */
export class ViewportPickCycle {
  private anchor = { x: Infinity, y: Infinity };
  private context = "";
  private order: NonNullable<EditorSelection>[] = [];
  private index = -1;
  reset() { this.index = -1; this.order = []; }
  private matches(x: number, y: number, picks: EditorSelection[], context: string) {
    return this.index >= 0 && Math.hypot(x - this.anchor.x, y - this.anchor.y) < 4 && context === this.context &&
      picks.map(pickKey).sort().join("|") === this.order.map(pickKey).sort().join("|");
  }
  current(x: number, y: number, picks: EditorSelection[], context: string): EditorSelection {
    return this.matches(x, y, picks, context) ? this.order[this.index] : null;
  }
  next(x: number, y: number, picks: NonNullable<EditorSelection>[], context: string): EditorSelection {
    if (!picks.length) { this.reset(); return null; }
    if (this.matches(x, y, picks, context)) this.index = (this.index + 1) % this.order.length;
    else { this.anchor = { x, y }; this.context = context; this.order = [...picks]; this.index = 0; }
    return this.order[this.index];
  }
}
export type PanPlane = "xz" | "xy";
/** Pan tool: left drags stay on the ground plane, right/middle go vertical. */
export function panPlaneForButton(button: number): PanPlane {
  return button === 0 ? "xz" : "xy";
}
export type RotatorAxis = "yaw" | "pitch" | "roll";
/** Rotator tool: exactly one euler axis per mouse button. */
export function rotatorAxisForButton(button: number): RotatorAxis {
  return button === 0 ? "yaw" : button === 2 ? "pitch" : "roll";
}
/** Advance one euler axis by horizontal drag pixels; others untouched. */
export function applyRotator(
  current: { yaw: number; pitch: number; roll: number },
  axis: RotatorAxis,
  dx: number,
) {
  return {
    yaw: current.yaw + (axis === "yaw" ? dx * 0.01 : 0),
    pitch: current.pitch + (axis === "pitch" ? dx * 0.01 : 0),
    roll: current.roll + (axis === "roll" ? dx * 0.01 : 0),
  };
}
/** Grab-style world-axis pan of the orbit target. */
export function applyPan(
  target: { x: number; y: number; z: number },
  dx: number,
  dy: number,
  scale: number,
  plane: PanPlane,
) {
  target.x -= dx * scale;
  if (plane === "xz") target.z -= dy * scale;
  else target.y += dy * scale;
}
/** Intersect a ray with a horizontal plane; null when parallel/upward. */
export function planeHit(
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  planeY: number,
): { x: number; z: number } | null {
  if (Math.abs(dir.y) < 1e-9) return null;
  const t = (planeY - origin.y) / dir.y;
  if (!(t > 0)) return null;
  return { x: origin.x + dir.x * t, z: origin.z + dir.z * t };
}
const PREFAB_COLORS: Record<string, number> = {
  book: 0xc86ae0,
  teeth: 0xffffff,
  computer: 0x6ae0c8,
  flippers: 0xe0a46a,
  donut: 0xff9ecb,
  hydrant: 0xe06a6a,
  burner: 0xff7a1f,
  water: 0x4fb8ff,
  potion: 0x9ae06a,
  sign: 0xe6c16a,
  trash: 0x8a8f96,
  barrel: 0xc25a3a,
  gravestone: 0x9aa2a8,
  snowman: 0xdfe8ff,
  hammer: 0xb08d57,
  axe: 0x9aa2a8,
  carousel: 0xff6bcb,
  "bumper-arena": 0x63e8fc,
  "hot-air-balloon": 0xffc23b,
  trampoline: 0x7af2ff,
  ghost: 0xc9b8ff,
  loop: 0x9bddf4,
  dragon: 0xff5a0a,
  lamp: 0xfaf8e8,
  grandstand: 0x50626b,
  checkpoint: 0x6ae08a,
  skull: 0xe8e0cc,
  hands: 0xff5a3c,
  scissors: 0xc7ccd2,
  clippers: 0x9fb8cc,
  cup: 0x6b4226,
  "loose-blocks": 0xe0a458,
  "burning-coals": 0xff5a1f,
  cage: 0x5a636b,
  "jail-cell": 0x7a8494,
  candle: 0xffb347,
  "boost-pad": 0x35f0d0,
};
/** Minimal orbit: drag rotates, wheel zooms, shift-drag pans. */
function attachOrbit(
  camera: T.PerspectiveCamera,
  dom: HTMLElement,
  target: T.Vector3,
  draw: () => void,
  canStart?: (e: PointerEvent) => boolean,
) {
  const spherical = new T.Spherical(60, 1.1, 0);
  const apply = () => {
    camera.position
      .setFromSpherical(spherical)
      .add(target);
    camera.lookAt(target);
    draw();
  };
  let dragging = false;
  let panning = false;
  let px = 0;
  let py = 0;
  const panPixels = (dx: number, dy: number, plane?: PanPlane) => {
    const scale = spherical.radius / 400;
    if (plane) {
      applyPan(target, dx, dy, scale, plane);
      return;
    }
    const right = new T.Vector3().setFromMatrixColumn(camera.matrix, 0);
    const up = new T.Vector3().setFromMatrixColumn(camera.matrix, 1);
    target.addScaledVector(right, -dx * scale);
    target.addScaledVector(up, dy * scale);
  };
  dom.addEventListener("pointerdown", (e) => {
    if (canStart && !canStart(e)) return;
    dragging = true;
    panning = e.shiftKey || e.button === 2;
    px = e.clientX;
    py = e.clientY;
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - px;
    const dy = e.clientY - py;
    px = e.clientX;
    py = e.clientY;
    if (panning) {
      panPixels(dx, dy);
    } else {
      spherical.theta -= dx * 0.008;
      spherical.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, spherical.phi - dy * 0.008),
      );
    }
    apply();
  });
  const stop = () => {
    dragging = false;
  };
  dom.addEventListener("pointerup", stop);
  dom.addEventListener("pointercancel", stop);
  dom.addEventListener("contextmenu", (e) => e.preventDefault());
  dom.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      spherical.radius = Math.max(
        5,
        Math.min(400, spherical.radius * (e.deltaY > 0 ? 1.12 : 1 / 1.12)),
      );
      apply();
    },
    { passive: false },
  );
  apply();
  return {
    frameSpawn({ x, y, z, yaw }: CustomLevel["spawn"]) {
      target.set(x, y, z);
      spherical.radius = 90;
      spherical.theta = yaw + Math.PI;
      apply();
    },
    panBy(dx: number, dy: number, plane?: PanPlane) {
      panPixels(dx, dy, plane);
      apply();
    },
  };
}
/** Wireframe level preview. Rebuilds on demand; never touches the game view. */
export function createEditorViewport(host: HTMLElement, store: EditorStore) {
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setClearColor(0x111c22);
  host.append(renderer.domElement);
  const scene = new T.Scene();
  const grid = new T.GridHelper(400, 40, 0x3a5a5a, 0x22393e);
  const axes = new T.AxesHelper(10);
  scene.add(grid, axes);
  // Preview-only lighting; the wireframe pass uses unlit materials.
  scene.add(new T.HemisphereLight(0xffffff, 0x334455, 0.9));
  const sun = new T.DirectionalLight(0xffffff, 1.6);
  sun.position.set(40, 80, 20);
  scene.add(sun);
  const camera = new T.PerspectiveCamera(55, 1, 0.1, 2000);
  const target = new T.Vector3(0, 0, 0);
  const draw = () => renderer.render(scene, camera);
  let group: T.Group | null = null;
  const raycaster = new T.Raycaster();
  const ndcAt = (clientX: number, clientY: number) => {
    const rect = renderer.domElement.getBoundingClientRect();
    return new T.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
  };
  const pickAt = (clientX: number, clientY: number) => {
    raycaster.setFromCamera(ndcAt(clientX, clientY), camera);
    const hits = group
      ? raycaster.intersectObjects(group.children, true)
      : [];
    const stack = resolveViewportStack(hits);
    return {
      stack,
    };
  };
  let drag: { planeY: number; offX: number; offZ: number } | null = null;
  let rotateAxis: RotatorAxis | null = null;
  let pan = false;
  let panButton = 0;
  let downEmpty = false;
  let downX = 0;
  let downY = 0;
  let moved = false;
  const cycle = new ViewportPickCycle();
  let pendingClick: { x: number; y: number; picks: NonNullable<EditorSelection>[]; context: string } | null = null;
  let clipDrag: { x: number; z: number; y: number; before: ClipRect[] } | null = null;
  const canStart = (e: PointerEvent) => {
    pendingClick = null;
    if (store.tool === "clip" && (e.button !== 0 || e.altKey)) return true;
    if (store.tool === "clip" && e.button === 0 && !e.altKey) {
      const s = store.level.solids.find((s) => store.clip?.targets.includes(s.id));
      const y = s ? s.y + s.h / 2 : 0;
      raycaster.setFromCamera(ndcAt(e.clientX, e.clientY), camera);
      const hit = planeHit(raycaster.ray.origin, raycaster.ray.direction, y);
      if (hit) {
        clipDrag = { ...hit, y, before: e.shiftKey ? [...store.clip?.cutters ?? []] : [] };
        renderer.domElement.setPointerCapture(e.pointerId);
      }
      return false;
    }
    if (store.tool !== "select" || e.button !== 0) cycle.reset();
    if (store.tool === "pan") {
      downX = e.clientX;
      downY = e.clientY;
      moved = false;
      downEmpty = false;
      pan = true;
      panButton = e.button;
      renderer.domElement.setPointerCapture(e.pointerId);
      return false;
    }
    if (e.button === 2 && store.tool !== "rotator") return true;
    downX = e.clientX;
    downY = e.clientY;
    moved = false;
    downEmpty = false;
    const { stack } = pickAt(e.clientX, e.clientY);
    let selection: EditorSelection = stack[0]?.selection ?? null;
    if (store.tool === "select" && e.button === 0) {
      const picks = stack.map((entry) => entry.selection);
      const context = `${camera.matrixWorld.elements.join(",")}|${camera.projectionMatrix.elements.join(",")}|${store.preview}|${JSON.stringify(store.level)}`;
      const current = cycle.current(e.clientX, e.clientY, picks, context);
      if (current && pickKey(current) === pickKey(store.selection)) selection = current;
      else if (current) cycle.reset();
      pendingClick = { x: e.clientX, y: e.clientY, picks, context };
    }
    const point = stack.find((entry) => pickKey(entry.selection) === pickKey(selection))?.hit.point;
    if (store.tool === "select" && (e.shiftKey || e.ctrlKey || e.metaKey) && selection?.kind === "solid") {
      pendingClick = null; store.select(selection, true); return false;
    }
    if (!selection || !point) {
      cycle.reset(); pendingClick = null;
      downEmpty = true;
      return true;
    }
    if (store.tool === "eyedropper") {
      const current = store.selectedItem();
      if (
        selection.kind === "solid" &&
        current?.kind === "solid" &&
        current.item.id !== selection.id
      ) {
        const source = store.level.solids.find((s) => s.id === selection.id);
        store.updateSelected({ texture: source?.texture });
      } else {
        store.select(selection);
      }
      return false;
    }
    store.select(selection);
    if (store.tool === "rotator") {
      rotateAxis = rotatorAxisForButton(e.button);
      store.beginGesture();
      renderer.domElement.setPointerCapture(e.pointerId);
      return false;
    }
    const item = store.selectedItem()?.item;
    drag = {
      planeY: point.y,
      offX: item ? point.x - item.x : 0,
      offZ: item ? point.z - item.z : 0,
    };
    store.beginGesture();
    renderer.domElement.setPointerCapture(e.pointerId);
    return false;
  };
  const orbit = attachOrbit(
    camera,
    renderer.domElement,
    target,
    draw,
    canStart,
  );
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (clipDrag && store.clip) {
      raycaster.setFromCamera(ndcAt(e.clientX, e.clientY), camera);
      const hit = planeHit(raycaster.ray.origin, raycaster.ray.direction, clipDrag.y);
      if (hit) {
        const r = { minX: Math.min(hit.x, clipDrag.x), maxX: Math.max(hit.x, clipDrag.x), minZ: Math.min(hit.z, clipDrag.z), maxZ: Math.max(hit.z, clipDrag.z) };
        if (validRect(r)) store.setClipCutters([...clipDrag.before, r]);
      }
      return;
    }
    if (!store.clip) clipDrag = null;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) >= 4) moved = true;
    if (pan) {
      orbit.panBy(
        e.clientX - downX,
        e.clientY - downY,
        panPlaneForButton(panButton),
      );
      downX = e.clientX;
      downY = e.clientY;
      return;
    }
    if (rotateAxis) {
      const dx = e.clientX - downX;
      downX = e.clientX;
      downY = e.clientY;
      const current = store.selectedItem();
      if (current?.kind === "solid") {
        const out = applyRotator(
          {
            yaw: current.item.yaw ?? 0,
            pitch: current.item.angle ?? 0,
            roll: current.item.roll ?? 0,
          },
          rotateAxis,
          dx,
        );
        store.updateSelected({
          yaw: out.yaw,
          angle: out.pitch,
          roll: out.roll,
        });
      } else if (current?.kind === "prefab") {
        const isProp = (PROP_PREFAB_KINDS as readonly string[]).includes(
          current.item.kind,
        );
        const isDragon = current.item.kind === "dragon";
        const canYaw = isProp || isDragon || isDinosaur(current.item.kind) ||
          isGauntletMachine(current.item.kind) || current.item.kind === "lime-chomper" || current.item.kind === "guided-pipe";
        if (rotateAxis === "yaw" && canYaw)
          store.updateSelected({ yaw: (current.item.yaw ?? 0) + dx * 0.01 });
        else if (rotateAxis === "pitch" && isProp)
          store.updateSelected({ angle: (current.item.angle ?? 0) + dx * 0.01 });
        else if (rotateAxis === "roll" && isProp)
          store.updateSelected({ roll: (current.item.roll ?? 0) + dx * 0.01 });
      }
      return;
    }
    if (!drag || !moved) return;
    raycaster.setFromCamera(ndcAt(e.clientX, e.clientY), camera);
    const hit = planeHit(
      raycaster.ray.origin,
      raycaster.ray.direction,
      drag.planeY,
    );
    if (hit)
      store.updateSelected({ x: hit.x - drag.offX, z: hit.z - drag.offZ });
  });
  const endGesture = (e: PointerEvent) => {
    if (clipDrag) {
      if (e.type === "pointercancel") store.setClipCutters(clipDrag.before);
      clipDrag = null; return;
    }
    if (drag || rotateAxis || pan) {
      drag = null;
      rotateAxis = null;
      pan = false;
      panButton = 0;
      store.endGesture();
    }
    if (pendingClick && !moved && e.type === "pointerup" && e.button === 0) {
      const { x, y, picks, context } = pendingClick;
      const next = cycle.next(x, y, picks, context);
      if (pickKey(next) !== pickKey(store.selection)) store.select(next);
    } else if (moved || e.type === "pointercancel") cycle.reset();
    pendingClick = null;
    if (downEmpty && !moved && e.button !== 2) store.select(null);
    downEmpty = false;
  };
  renderer.domElement.addEventListener("pointerup", endGesture);
  renderer.domElement.addEventListener("pointercancel", endGesture);
  const resize = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    draw();
  };
  /** Textured preview solid: opaque, depth-tested, course-view UVs. */
  const previewSolid = (parent: T.Group, s: CustomSolid, selected: boolean) => {
    const geometry = new T.BoxGeometry(s.w, s.h, s.d);
    scaleSolidUVs(geometry, s);
    const surface = { color: s.color, roughness: 0.9 };
    let material: T.MeshStandardMaterial;
    if (s.kind === "slime") material = slimeMaterial(s.color);
    else if (s.texture) material = pbr(s.texture, 1, surface);
    else if (s.kind === "tile") material = magneticTileMaterial(s.color);
    else material = new T.MeshStandardMaterial(surface);
    if (selected) material.emissive.add(new T.Color(0x4a3a00));
    parent.add(new T.Mesh(geometry, material));
  };
  const wireBox = (
    parent: T.Group,
    w: number,
    h: number,
    d: number,
    color: number,
    selected: boolean,
  ) => {
    const geometry = new T.BoxGeometry(w, h, d);
    const fill = new T.Mesh(
      geometry,
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      }),
    );
    const wire = new T.Mesh(
      geometry,
      new T.MeshBasicMaterial({
        color: selected ? 0xffe08a : 0x9adfe8,
        wireframe: true,
      }),
    );
    parent.add(fill, wire);
  };
  let previewOn = false;
  let generation = 0;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;
  return {
    dom: renderer.domElement,
    render(level: CustomLevel, selection: EditorSelection, preview = false) {
      const clip = store.clipPreview();
      if (clip) { level = { ...level, solids: clip.solids }; preview = true; }
      previewOn = preview;
      grid.visible = !preview;
      axes.visible = !preview;
      generation++;
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
      if (group) {
        group.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.geometry.dispose();
            (o.material as T.Material).dispose();
          }
        });
        scene.remove(group);
      }
      group = new T.Group();
      for (const s of level.solids) {
        const holder = new T.Group();
        holder.userData.pick = { kind: "solid", id: s.id };
        holder.userData.locked = !!s.locked;
        holder.position.set(s.x, s.y, s.z);
        holder.rotation.set(
          s.angle ?? 0,
          s.yaw ?? 0,
          s.roll ?? 0,
          "YXZ",
        );
        const selected = store.solidSelection.includes(s.id) ||
          (selection != null && "id" in selection && selection.id === s.id);
        if (preview) previewSolid(holder, s, selected);
        else wireBox(holder, s.w, s.h, s.d, s.color, selected);
        group.add(holder);
      }
      for (const s of clip?.removed ?? []) {
        const removed = new T.Mesh(new T.BoxGeometry(s.w, s.h, s.d), new T.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.4, depthWrite: false }));
        removed.position.set(s.x, s.y, s.z);
        // Preview volumes are not selectable and are disposed with the scene.
        group.add(removed);
      }
      for (const [i, cp] of level.checkpoints.entries()) {
        const previous = level.checkpoints[i - 1] ?? level.spawn;
        const yaw = cp.yaw ?? Math.atan2(cp.x - previous.x, cp.z - previous.z);
        if (preview && cp.appearance) {
          const frame = buildToyCheckpoint(cp.appearance);
          frame.position.set(cp.x, Math.max(0, (cp.y ?? 2) - 2.6), cp.z);
          frame.rotation.y = yaw;
          frame.userData.pick = { kind: "checkpoint", index: i };
          frame.userData.locked = !!cp.locked;
          group.add(frame);
        }
        const gate = new T.Mesh(
          new T.PlaneGeometry(cp.appearance ? CHECKPOINT_WIDTHS[cp.appearance] : 24, 8),
          new T.MeshBasicMaterial({
            color:
              selection != null &&
              "index" in selection &&
              selection.kind === "checkpoint" &&
              selection.index === i
                ? 0xffe08a
                : 0x6ae08a,
            wireframe: true,
            side: T.DoubleSide,
          }),
        );
        gate.position.set(cp.x, cp.y ?? 2, cp.z);
        gate.rotation.y = yaw;
        gate.userData.pick = { kind: "checkpoint", index: i };
        gate.userData.locked = !!cp.locked;
        group.add(gate);
      }
      for (const p of level.prefabs) {
        if (preview && (isDinosaur(p.kind) || isGauntletMachine(p.kind) || p.kind === "lime-chomper" || p.kind === "guided-pipe")) {
          const { root } = buildDungeonModel({ ...p, kind: p.kind, phase: 0 });
          root.userData.pick = { kind: "prefab", id: p.id };
          root.userData.locked = !!p.locked;
          group.add(root);
        }
        const marker = new T.Mesh(
          new T.OctahedronGeometry(1.2),
          new T.MeshBasicMaterial({
            color: PREFAB_COLORS[p.kind] ?? 0xffffff,
            wireframe: true,
          }),
        );
        marker.position.set(p.x, (p.y ?? 0) + 1.5, p.z);
        marker.rotation.set(p.angle ?? 0, p.yaw ?? 0, p.roll ?? 0, "YXZ");
        marker.userData.pick = { kind: "prefab", id: p.id };
        marker.userData.locked = !!p.locked;
        if (selection != null && "id" in selection && selection.id === p.id)
          marker.scale.setScalar(1.6);
        group.add(marker);
      }
      for (const [i, t] of [
        ...(level.collectibles ?? []),
        ...(level.demolish ?? []),
      ].entries()) {
        const collectible = level.mode !== "demolition";
        const marker = new T.Mesh(
          !collectible
            ? new T.OctahedronGeometry(1.6)
            : t.kind === "chest"
              ? new T.BoxGeometry(2.2, 1.6, 1.4)
              : new T.TorusGeometry(0.85, 0.17, 12, 32),
          new T.MeshBasicMaterial({ color: 0xffd24a, wireframe: true }),
        );
        marker.position.set(t.x, t.y ?? (collectible ? 1.7 : 1.5), t.z);
        marker.userData.pick = { kind: "target", index: i };
        marker.userData.locked = !!t.locked;
        if (
          selection != null &&
          "index" in selection &&
          selection.kind === "target" &&
          selection.index === i
        )
          marker.scale.setScalar(1.6);
        group.add(marker);
      }
      for (const [i, r] of (level.rings ?? []).entries()) {
        const marker = new T.Mesh(
          new T.TorusGeometry(r.radius, 0.4, 8, 32),
          new T.MeshBasicMaterial({
            color: r.goal ? 0xffd34d : 0x4fb8ff,
            wireframe: true,
          }),
        );
        marker.position.set(r.x, r.y, r.z);
        marker.userData.pick = { kind: "ring", index: i };
        marker.userData.locked = !!r.locked;
        if (
          selection != null &&
          "index" in selection &&
          selection.kind === "ring" &&
          selection.index === i
        )
          marker.scale.setScalar(1.6);
        group.add(marker);
      }
      const spawn = new T.Mesh(
        new T.ConeGeometry(1, 2.5, 4),
        new T.MeshBasicMaterial({ color: 0xffa762, wireframe: true }),
      );
      spawn.position.set(level.spawn.x, level.spawn.y + 1.5, level.spawn.z);
      spawn.rotation.y = level.spawn.yaw;
      spawn.userData.pick = { kind: "spawn" };
      spawn.userData.locked = !!level.spawn.locked;
      group.add(spawn);
      scene.add(group);
      draw();
      // Textures pop in asynchronously; redraw until they arrive.
      if (preview) {
        const seen = generation;
        let tries = 0;
        const maps: (T.Texture | null)[] = [];
        group.traverse((o) => {
          if (o instanceof T.Mesh) {
            const mat = o.material as T.MeshStandardMaterial;
            if ("map" in mat) maps.push(mat.map ?? null);
          }
        });
        const settle = () => {
          if (seen !== generation) return;
          draw();
          tries++;
          const pending = maps.some((m) => m && !m.image);
          if (pending && tries < 40) {
            settleTimer = setTimeout(settle, 150);
          } else {
            settleTimer = null;
          }
        };
        if (maps.some((m) => m && !m.image))
          settleTimer = setTimeout(settle, 150);
      }
    },
    /** Render-state probe for tests: materials, occlusion, center pick. */
    inspectPreview() {
      const solids: {
        id: string;
        textured: boolean;
        opaque: boolean;
        depthTest: boolean;
        depthWrite: boolean;
      }[] = [];
      group?.traverse((o) => {
        const pick = (o as T.Group).userData?.pick as
          | EditorSelection
          | undefined;
        if (pick?.kind !== "solid") return;
        const mesh = (o as T.Group).children.find(
          (c): c is T.Mesh => c instanceof T.Mesh,
        );
        const mat = mesh?.material as T.Material & { map?: unknown };
        solids.push({
          id: pick.id,
          textured: !!mat?.map,
          opaque: mat ? !mat.transparent : false,
          depthTest: mat ? mat.depthTest : false,
          depthWrite: mat ? mat.depthWrite : false,
        });
      });
      raycaster.setFromCamera(new T.Vector2(0, 0), camera);
      const hits = group
        ? raycaster.intersectObjects(group.children, true)
        : [];
      return {
        preview: previewOn,
        gridVisible: grid.visible,
        solids,
        centerPick: resolveViewportPick(hits),
      };
    },
    project(point: { x: number; y: number; z: number }) {
      const v = new T.Vector3(point.x, point.y, point.z).project(camera);
      const rect = renderer.domElement.getBoundingClientRect();
      return {
        x: rect.left + ((v.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - v.y) / 2) * rect.height,
      };
    },
    frameSpawn(level: CustomLevel) {
      orbit.frameSpawn(level.spawn);
    },
    cameraTarget() {
      return { x: target.x, y: target.y, z: target.z };
    },
    resize,
    dispose() {
      if (settleTimer) clearTimeout(settleTimer);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
