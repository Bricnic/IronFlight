import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { chooseResizeHandle, resizeBox, type ResizeHandle, type ResizeBox } from "./editor-resize";
import {
  PROP_PREFAB_KINDS,
  CHECKPOINT_WIDTHS,
  prefabY,
  type CustomLevel,
  type CustomSolid,
} from "./custom-level";
import type { EditorSelection, EditorStore } from "./editor-state";
import { magneticTileMaterial, pbr, slimeMaterial } from "./materials";
import { buildEditorPrefab, buildEditorIceBatch } from "./editor-prefabs";
import { buildToyCheckpoint } from "./toy-track-view";
import { buildCheckpointFrame, applyNightGlow } from "./course-view";
import { createTruck } from "./truck";
import { getBackgroundTemplate, resolveMood } from "./backgrounds";
import { buildSkyEnvScene } from "./sky-env";
import { loadSettings, QUALITY } from "./settings";
import { levelWeather, isPermanentNight } from "./weather";
import { buildWorldGrid, snapCoordinate } from "./editor-grid";
import { buildEditorLocalLights } from "./editor-lighting";
import { buildHeadlightRig, setHeadlightRig, setHeadlightDim, MYSTIC_HEADLIGHT_DIM } from "./headlights";
import { DEFAULT_TUNING } from "./tuning";
import { PrefabLights } from "./prefab-lights";
import { configureShadowSurfaces } from "./shadow-surfaces";
import { scaleSolidUVs } from "./solid-uv";
import { validRect, type ClipRect } from "./editor-clip";
type ViewportHit = { object: unknown; distance?: number; point?: T.Vector3; instanceId?: number };
export function editorSolidGeometry(s: CustomSolid) {
  return s.footprint
    ? new T.ExtrudeGeometry(new T.Shape(s.footprint.map(({ x, z }) => new T.Vector2(x, -z))), { depth: s.h, bevelEnabled: false })
      .rotateX(-Math.PI / 2).translate(0, -s.h / 2, 0)
    : new T.BoxGeometry(s.w, s.h, s.d);
}
const pickKey = (pick: EditorSelection) => !pick ? "" :
  `${pick.kind}:${"id" in pick ? pick.id : "index" in pick ? pick.index : ""}`;
/** One candidate per logical object, ordered from the camera into the scene.
 * Fill, wireframe, children and exit faces must not add duplicate stops. */
export function resolveViewportStack(hits: ViewportHit[], includeLocked = false) {
  const stack: { selection: NonNullable<EditorSelection>; hit: ViewportHit }[] = [];
  const seen = new Set<string>();
  for (const hit of [...hits].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))) {
    let node: unknown = hit.object;
    while (node !== null && node !== undefined) {
      const record = node as {
        userData?: { pick?: EditorSelection; locked?: boolean; instancePicks?: { pick: EditorSelection; locked: boolean }[] };
        parent?: unknown;
      };
      const instance = hit.instanceId === undefined ? undefined : record.userData?.instancePicks?.[hit.instanceId];
      if (!includeLocked && (record.userData?.locked || instance?.locked)) break;
      const pick = instance?.pick ?? record.userData?.pick;
      if (pick != null) {
        const selection = pick, key = pickKey(selection);
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
 * object instances. Camera/content changes or a different click area restart.
 * Coordinates are canvas-space NDC so page layout shifts never break a cycle. */
export class ViewportPickCycle {
  private anchor = { x: Infinity, y: Infinity };
  private context = "";
  private order: NonNullable<EditorSelection>[] = [];
  private index = -1;
  reset() { this.index = -1; this.order = []; }
  private matches(x: number, y: number, picks: EditorSelection[], context: string) {
    return this.index >= 0 && Math.hypot(x - this.anchor.x, y - this.anchor.y) < 0.02 && context === this.context &&
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
/** Pan tool: left drags stay on the ground plane, right goes vertical. */
export function panPlaneForButton(button: number): PanPlane {
  return button === 0 ? "xz" : "xy";
}
export type RotatorAxis = "yaw" | "pitch" | "roll";
/** Middle mouse is reserved for camera orbit, including in the Rotator tool. */
export function rotatorAxisForButton(button: number): RotatorAxis | null {
  return button === 0 ? "yaw" : button === 2 ? "pitch" : null;
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
/** Grab-style pan of the orbit target, relative to the camera yaw `theta`.
 * Dragging right moves the world right on screen and dragging down moves it
 * down, whatever the orbit angle: horizontal drags run along screen-right
 * projected on the ground, vertical drags along screen-forward (xz) or
 * world-up (xy). */
export function applyPan(
  target: { x: number; y: number; z: number },
  dx: number,
  dy: number,
  scale: number,
  plane: PanPlane,
  theta = 0,
) {
  const rightX = Math.cos(theta), rightZ = -Math.sin(theta);
  const fwdX = -Math.sin(theta), fwdZ = -Math.cos(theta);
  target.x += (-rightX * dx + (plane === "xz" ? fwdX * dy : 0)) * scale;
  target.z += (-rightZ * dx + (plane === "xz" ? fwdZ * dy : 0)) * scale;
  if (plane === "xy") target.y += dy * scale;
}
/** Yaw that faces `from` toward `to` under the engine forward convention. */
export function lookYaw(
  from: { x: number; z: number },
  to: { x: number; z: number },
) {
  return Math.atan2(to.x - from.x, to.z - from.z);
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
/** Minimal orbit: drag rotates, wheel dollies, shift-drag pans. */
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
  let middleHeld = false;
  let panning = false;
  let px = 0;
  let py = 0;
  const panPixels = (dx: number, dy: number, plane?: PanPlane) => {
    const scale = spherical.radius / 400;
    if (plane) {
      applyPan(target, dx, dy, scale, plane, spherical.theta);
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
    middleHeld = !!(e.buttons & 4);
    panning = e.button !== 1 && (e.shiftKey || e.button === 2);
    px = e.clientX;
    py = e.clientY;
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener("pointermove", (e) => {
    // Mouse chords produce pointermove (not another pointerdown).
    if (!middleHeld && (e.buttons & 4)) {
      if (canStart && !canStart(e)) return;
      if (!dragging) { px = e.clientX; py = e.clientY; }
      dragging = true;
    }
    middleHeld = !!(e.buttons & 4);
    if (!dragging) return;
    const dx = e.clientX - px;
    const dy = e.clientY - py;
    px = e.clientX;
    py = e.clientY;
    if ((e.buttons & 4) && (e.buttons & 3)) {
      panPixels(dx, dy, panPlaneForButton(e.buttons & 1 ? 0 : 2));
    } else if (panning && !middleHeld) {
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
    middleHeld = false;
  };
  dom.addEventListener("pointerup", stop);
  dom.addEventListener("pointercancel", stop);
  dom.addEventListener("contextmenu", (e) => e.preventDefault());
  dom.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const pixels = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? dom.clientHeight : 1);
      // Move both camera and pivot instead of shrinking the orbit distance.
      // This preserves pan sensitivity and allows travel through/past objects.
      target.addScaledVector(camera.getWorldDirection(new T.Vector3()), -pixels * spherical.radius / 800);
      apply();
    },
    { passive: false },
  );
  apply();
  return {
    frameBounds(bounds: T.Box3) {
      bounds.getCenter(target);
      const size = bounds.getSize(new T.Vector3());
      const halfFov = T.MathUtils.degToRad(camera.fov) / 2;
      spherical.radius = Math.max(4, size.length() / (2 * Math.sin(Math.min(halfFov, Math.atan(Math.tan(halfFov) * camera.aspect))))) * 1.15;
      spherical.phi = 1.05;
      spherical.theta = Math.PI + 0.6;
      apply();
    },
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
  const environmentGenerator = new T.PMREMGenerator(renderer);
  const environmentScene = new RoomEnvironment();
  const environment = environmentGenerator.fromScene(environmentScene, 0.04);
  scene.environment = environment.texture;
  environmentScene.dispose(); environmentGenerator.dispose();
  let grid = buildWorldGrid(store.grid);
  let gridKey = JSON.stringify(store.grid);
  const axes = new T.AxesHelper(10);
  scene.add(grid, axes);
  // Preview-only lighting; the wireframe pass uses unlit materials.
  const hemi = new T.HemisphereLight(0xffffff, 0x334455, 0.9);
  scene.add(hemi);
  const sun = new T.DirectionalLight(0xffffff, 1.6);
  sun.position.set(40, 80, 20);
  scene.add(sun);
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, far: 250 });
  sun.shadow.bias = -0.0005;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  let skyEnvironment: { key: string; texture: T.Texture } | null = null;
  let lighting: { game: boolean; night: boolean; rain: boolean; sun: number; hemi: number; env: number } | null = null;
  const applyLighting = (level: CustomLevel, preview: boolean) => {
    const game = preview && !!level.previewGameLighting;
    const settings = loadSettings();
    const weather = levelWeather(settings, false, settings, level.backgroundTemplate, level.forceNight);
    const mood = resolveMood(getBackgroundTemplate(level.backgroundTemplate), weather);
    const quality = QUALITY[settings.video];
    renderer.toneMapping = game ? T.ACESFilmicToneMapping : T.NoToneMapping;
    renderer.toneMappingExposure = game ? 1.25 : 1;
    renderer.shadowMap.enabled = game && quality.shadows;
    sun.castShadow = game;
    sun.position.set(...(game ? [-45, 80, -25] : [40, 80, 20]) as [number, number, number]);
    sun.color.setHex(game ? mood.sun.color : 0xffffff);
    sun.intensity = game ? mood.sun.intensity : 1.6;
    hemi.color.setHex(game ? mood.hemi.sky : 0xffffff);
    hemi.groundColor.setHex(game ? mood.hemi.ground : 0x334455);
    hemi.intensity = game ? mood.hemi.intensity : 0.9;
    scene.environmentIntensity = game ? mood.env : 1;
    scene.background = game ? new T.Color(mood.fog.color) : null;
    scene.fog = game ? new T.Fog(mood.fog.color, mood.fog.near * quality.fogScale, mood.fog.far * quality.fogScale) : null;
    const baked = game && (weather.night || weather.rain);
    const key = baked ? `${mood.sky.top}:${mood.sky.horizon}` : "room";
    if (skyEnvironment?.key !== key) {
      skyEnvironment?.texture.dispose(); skyEnvironment = null;
      if (baked) {
        const generator = new T.PMREMGenerator(renderer);
        const sky = buildSkyEnvScene(mood.sky.top, mood.sky.horizon);
        skyEnvironment = { key, texture: generator.fromScene(sky, 0.04).texture };
        sky.traverse(o => { if (o instanceof T.Mesh) { o.geometry.dispose(); (o.material as T.Material).dispose(); } });
        generator.dispose();
      }
    }
    scene.environment = skyEnvironment?.texture ?? environment.texture;
    lighting = { game, night: weather.night, rain: weather.rain, sun: sun.intensity, hemi: hemi.intensity, env: scene.environmentIntensity };
  };
  const camera = new T.PerspectiveCamera(55, 1, 0.1, 2000);
  const target = new T.Vector3(0, 0, 0);
  const draw = () => {
    grid.position.set(snapCoordinate(target.x, store.grid.spacing), store.grid.y ? snapCoordinate(target.y, store.grid.spacing) : 0, snapCoordinate(target.z, store.grid.spacing));
    renderer.render(scene, camera);
  };
  let group: T.Group | null = null;
  // Incremental sync caches: pick key -> live node + build signature.
  let modelCache = new Map<string, T.Object3D>();
  let modelSig = new Map<string, string>();
  let lastPreview = false;
  let lastClipKey = "";
  let iceSig = "";
  let icePos = new Map<string, number[]>();
  const iceTransform = (p: { x: number; z: number; y?: number; yaw?: number; angle?: number; roll?: number; resizeScale?: number }) =>
    [p.x, prefabY(p as Parameters<typeof prefabY>[0]), p.z, p.yaw ?? 0, p.angle ?? 0, p.roll ?? 0, p.resizeScale ?? 1];
  const disposeSubtree = (root: T.Object3D) => {
    root.traverse((o) => {
      if (o instanceof T.Light) o.dispose();
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        for (const material of Array.isArray(o.material) ? o.material : [o.material]) material.dispose();
      }
    });
  };
  const dropKey = (key: string) => {
    const node = modelCache.get(key);
    if (!node) return;
    group?.remove(node);
    disposeSubtree(node);
    modelCache.delete(key);
    modelSig.delete(key);
  };
  const raycaster = new T.Raycaster();
  const ndcAt = (clientX: number, clientY: number) => {
    const rect = renderer.domElement.getBoundingClientRect();
    return new T.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
  };
  const pickAt = (clientX: number, clientY: number, includeLocked = false) => {
    const ndc = ndcAt(clientX, clientY);
    raycaster.setFromCamera(ndc, camera);
    const hits = group
      ? raycaster.intersectObjects(group.children, true)
      : [];
    const stack = resolveViewportStack(hits, includeLocked);
    return {
      stack,
      ndc,
    };
  };
  let drag: { planeY: number; offX: number; offZ: number; x: number; z: number; grabY: number; vertical: boolean; start: T.Vector3; verticalPlane: T.Plane; origins: ReturnType<EditorStore["selectionPositions"]> } | null = null;
  // Drag coalescing: pointermove can fire several times per frame, but each
  // move runs a full refresh, so apply at most one per animation frame.
  // Moves are absolute (origins + delta), so dropping intermediate ones is
  // lossless. The pending move always flushes on pointerup.
  let dragFrame: number | null = null;
  let dragPending: { origins: ReturnType<EditorStore["selectionPositions"]>; delta: { x: number; y?: number; z: number }; snap: boolean; axes: ("x" | "y" | "z")[] } | null = null;
  const flushObjectMove = () => {
    dragFrame = null;
    if (!dragPending) return;
    const p = dragPending;
    dragPending = null;
    store.moveSelectedFrom(p.origins, p.delta, p.snap, p.axes);
  };
  const scheduleObjectMove = (
    origins: ReturnType<EditorStore["selectionPositions"]>,
    delta: { x: number; y?: number; z: number },
    snap: boolean,
    axes: ("x" | "y" | "z")[] = ["x", "y", "z"],
  ) => {
    dragPending = { origins, delta, snap, axes };
    if (dragFrame === null) dragFrame = requestAnimationFrame(flushObjectMove);
  };
  const discardObjectMove = () => {
    if (dragFrame !== null) cancelAnimationFrame(dragFrame);
    dragFrame = null;
    dragPending = null;
  };
  let shiftClick: { selection: NonNullable<EditorSelection>; point: T.Vector3 } | null = null;
  const startObjectDrag = (point: T.Vector3, vertical: boolean) => {
    const item = store.selectedItem()!.item;
    const origins = store.selectionPositions();
    const primary = origins.find(p => pickKey(p.selection) === pickKey(store.selection))!;
    const normal = camera.getWorldDirection(new T.Vector3()); normal.y = 0; normal.normalize();
    drag = { planeY: point.y, offX: point.x - item.x, offZ: point.z - item.z,
      x: item.x, z: item.z, grabY: point.y - primary.y, vertical, start: point.clone(),
      verticalPlane: new T.Plane().setFromNormalAndCoplanarPoint(normal, point), origins };
    store.beginGesture();
  };
  let rotateAxis: RotatorAxis | null = null;
  let pan = false;
  let panButton = 0;
  let downEmpty = false;
  let downX = 0;
  let downY = 0;
  let moved = false;
  let middleOrbit = false;
  const cycle = new ViewportPickCycle();
  let pendingClick: { x: number; y: number; picks: NonNullable<EditorSelection>[]; context: string } | null = null;
  let clipDrag: { x: number; z: number; y: number; before: ClipRect[] } | null = null;
  let resizing: { solid: CustomSolid; box: ResizeBox; handle: ResizeHandle; q: T.Quaternion; plane: T.Plane; start: T.Vector3; changed: boolean; lastFactor: number } | null = null;
  let prefabResize: { original: import("./custom-level").CustomPrefab; matrix: T.Matrix4; inverse: T.Matrix4; box: ResizeBox; handle: ResizeHandle; plane: T.Plane; start: T.Vector3; changed: boolean; lastFactor: number } | null = null;
  const canStart = (e: PointerEvent) => {
    shiftClick = null;
    pendingClick = null;
    discardObjectMove();
    if (e.button === 1 || (e.buttons & 4)) {
      if (!middleOrbit) store.endGesture();
      drag = null; rotateAxis = null; pan = false; resizing = null; prefabResize = null; clipDrag = null;
      middleOrbit = true;
      downEmpty = false;
      cycle.reset();
      return true;
    }
    if (e.button === 0 && e.shiftKey && (e.ctrlKey || e.metaKey)) {
      const selection = pickAt(e.clientX, e.clientY, true).stack[0]?.selection;
      if (selection) store.select(selection, true, true);
      cycle.reset(); return false;
    }
    // A non-middle click ends a look session without selecting anything.
    if (store.tool === "look") {
      store.endGesture();
      store.setTool("select");
      return false;
    }
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
    const { stack, ndc } = pickAt(e.clientX, e.clientY);
    let selection: EditorSelection = stack[0]?.selection ?? null;
    if (store.tool === "select" && e.button === 0) {
      const picks = stack.map((entry) => entry.selection);
      const context = `${camera.matrixWorld.elements.join(",")}|${camera.projectionMatrix.elements.join(",")}|${store.preview}|${JSON.stringify(store.level)}`;
      const current = cycle.current(ndc.x, ndc.y, picks, context);
      if (current && pickKey(current) === pickKey(store.selection)) selection = current;
      else if (current) cycle.reset();
      pendingClick = { x: ndc.x, y: ndc.y, picks, context };
    }
    const point = stack.find((entry) => pickKey(entry.selection) === pickKey(selection))?.hit.point;
    if (store.tool === "resize" && selection?.kind === "prefab" && point && e.button === 0) {
      // A first click selects a batched tile and gives it an individual model.
      if (!store.isSelected(selection)) { store.select(selection); return false; }
      const prefab = store.level.prefabs.find(p => p.id === (selection as { id: string }).id)!;
      const root = group!.children.find(o => o.userData.pick?.kind === "prefab" && o.userData.pick.id === prefab.id)!;
      const hit = stack.find(entry => pickKey(entry.selection) === pickKey(selection))!.hit as T.Intersection;
      if (!hit.face) return false;
      if (!store.isSelected(selection)) store.select(selection); else store.selection = selection; root.updateWorldMatrix(true, true);
      const inverse = root.matrixWorld.clone().invert(), bounds = new T.Box3();
      root.traverse(o => {
        if (!(o instanceof T.Mesh) || o.parent?.userData.arrowOf) return;
        o.geometry.computeBoundingBox();
        bounds.union(o.geometry.boundingBox!.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)));
      });
      const center = bounds.getCenter(new T.Vector3()), size = bounds.getSize(new T.Vector3());
      const box = { x: center.x, y: center.y, z: center.z, w: size.x, h: size.y, d: size.z };
      const normal = hit.face.normal.clone().applyMatrix3(new T.Matrix3().getNormalMatrix((hit.object as T.Object3D).matrixWorld)).normalize();
      const localNormal = normal.clone().transformDirection(inverse), start = point.clone().applyMatrix4(inverse);
      prefabResize = { original: structuredClone(prefab), matrix: root.matrixWorld.clone(), inverse, box, handle: chooseResizeHandle(box, start, localNormal), plane: new T.Plane().setFromNormalAndCoplanarPoint(normal, point), start, changed: false, lastFactor: 1 };
      store.beginGesture(); renderer.domElement.setPointerCapture(e.pointerId); return false;
    }
    if (store.tool === "resize" && selection?.kind === "solid" && point && e.button === 0) {
      const solid = store.level.solids.find(s => s.id === (selection as { id: string }).id)!;
      const hit = stack.find(entry => pickKey(entry.selection) === pickKey(selection))!.hit as T.Intersection;
      if (!hit.face) return false;
      if (!store.isSelected(selection)) store.select(selection); else store.selection = selection;
      const q = new T.Quaternion().setFromEuler(new T.Euler(solid.angle ?? 0, solid.yaw ?? 0, solid.roll ?? 0, "YXZ"));
      const normal = hit.face.normal.clone().applyMatrix3(new T.Matrix3().getNormalMatrix((hit.object as T.Object3D).matrixWorld)).normalize();
      const start = point.clone().sub(new T.Vector3(solid.x, solid.y, solid.z)).applyQuaternion(q.clone().invert());
      const box = { x: 0, y: 0, z: 0, w: solid.w, h: solid.h, d: solid.d };
      resizing = { solid: structuredClone(solid), box, q, start, handle: chooseResizeHandle(box, start, normal.clone().applyQuaternion(q.clone().invert())), plane: new T.Plane().setFromNormalAndCoplanarPoint(normal, point), changed: false, lastFactor: 1 };
      store.beginGesture(); renderer.domElement.setPointerCapture(e.pointerId);
      return false;
    }
    if (store.tool === "select" && (e.ctrlKey || e.metaKey) && selection) {
      pendingClick = null; store.select(selection, true); return false;
    }
    if (store.tool === "select" && e.shiftKey && selection && point) {
      pendingClick = null; shiftClick = { selection, point: point.clone() };
      renderer.domElement.setPointerCapture(e.pointerId); return false;
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
    if (!store.isSelected(selection)) store.select(selection);
    else store.selection = selection;
    if (store.tool === "rotator") {
      rotateAxis = rotatorAxisForButton(e.button);
      store.beginGesture();
      renderer.domElement.setPointerCapture(e.pointerId);
      return false;
    }
    startObjectDrag(point, false);
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
    if (middleOrbit) return;
    if (shiftClick) {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 4) return;
      const { selection, point } = shiftClick; shiftClick = null; moved = true;
      if (!store.isSelected(selection)) store.select(selection); else store.selection = selection;
      startObjectDrag(point, true);
    }
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
    if (prefabResize) {
      raycaster.setFromCamera(ndcAt(e.clientX, e.clientY), camera);
      const hit = raycaster.ray.intersectPlane(prefabResize.plane, new T.Vector3()); if (!hit) return;
      const r = prefabResize, delta = hit.applyMatrix4(r.inverse).sub(r.start);
      const point = new T.Vector3(r.box.x + r.handle.x * r.box.w / 2, r.box.y + r.handle.y * r.box.h / 2, r.box.z + r.handle.z * r.box.d / 2).add(delta);
      const out = resizeBox(r.box, r.handle, point);
      const ratios = (["x", "y", "z"] as const).filter(a => r.handle[a]).map(a => a === "x" ? out.w / r.box.w : a === "y" ? out.h / r.box.h : out.d / r.box.d);
      const originalScale = r.original.resizeScale ?? 1;
      const factor = Math.max(0.01 / originalScale, Math.min(100 / originalScale, Math.max(...ratios)));
      const pivot = new T.Vector3(r.box.x - r.handle.x * r.box.w / 2, r.box.y - (r.handle.y || 1) * r.box.h / 2, r.box.z - r.handle.z * r.box.d / 2);
      if (store.selectedEntries().length > 1) {
        store.scaleSelected(factor / r.lastFactor, pivot.clone().applyMatrix4(r.matrix));
        r.lastFactor = factor;
      } else {
        const position = pivot.multiplyScalar(1 - factor).applyMatrix4(r.matrix);
        store.updateSelected({ x: position.x, y: position.y, z: position.z, resizeScale: originalScale * factor });
      }
      r.changed = true; return;
    }
    if (resizing) {
      raycaster.setFromCamera(ndcAt(e.clientX, e.clientY), camera);
      const hit = raycaster.ray.intersectPlane(resizing.plane, new T.Vector3());
      if (!hit) return;
      const { solid, q, box, handle, start } = resizing;
      const delta = hit.sub(new T.Vector3(solid.x, solid.y, solid.z)).applyQuaternion(q.clone().invert()).sub(start);
      const edge = new T.Vector3(handle.x * solid.w / 2, handle.y * solid.h / 2, handle.z * solid.d / 2).add(delta);
      const out = resizeBox(box, handle, edge);
      if (store.selectedEntries().length > 1) {
        const ratios = (["x", "y", "z"] as const).filter(a => handle[a]).map(a => a === "x" ? out.w / box.w : a === "y" ? out.h / box.h : out.d / box.d);
        const factor = Math.max(...ratios);
        const pivot = new T.Vector3(-handle.x * solid.w / 2, -handle.y * solid.h / 2, -handle.z * solid.d / 2).applyQuaternion(q).add(new T.Vector3(solid.x, solid.y, solid.z));
        store.scaleSelected(factor / resizing.lastFactor, pivot);
        resizing.lastFactor = factor; resizing.changed = true; return;
      }
      const position = new T.Vector3(out.x, out.y, out.z).applyQuaternion(q).add(new T.Vector3(solid.x, solid.y, solid.z));
      store.updateSelected({ x: position.x, y: position.y, z: position.z, w: out.w, h: out.h, d: out.d,
        ...(solid.footprint ? { footprint: solid.footprint.map(p => ({ x: p.x * out.w / solid.w, z: p.z * out.d / solid.d })) } : {}) });
      resizing.changed = true;
      return;
    }
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
    if (store.tool === "look") {
      const current = store.selectedItem();
      if (current?.kind === "prefab") {
        raycaster.setFromCamera(ndcAt(e.clientX, e.clientY), camera);
        const hit = planeHit(
          raycaster.ray.origin,
          raycaster.ray.direction,
          current.item.y ?? 0,
        );
        if (hit) {
          // One undo step for the whole look session.
          store.beginGesture();
          store.updateSelected({ yaw: lookYaw(current.item, hit) });
        }
      }
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
        if (rotateAxis === "yaw")
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
    if (drag.vertical !== e.shiftKey) {
      const primary = store.selectionPositions().find(p => pickKey(p.selection) === pickKey(store.selection))!;
      const y = primary.y + drag.grabY;
      const plane = e.shiftKey ? new T.Plane().setFromNormalAndCoplanarPoint(drag.verticalPlane.normal, new T.Vector3(primary.x, y, primary.z)) : new T.Plane(new T.Vector3(0, 1, 0), -y);
      const point = raycaster.ray.intersectPlane(plane, new T.Vector3());
      discardObjectMove();
      if (point) startObjectDrag(point, e.shiftKey);
      return;
    }
    if (drag.vertical) {
      const hit = raycaster.ray.intersectPlane(drag.verticalPlane, new T.Vector3());
      if (hit) scheduleObjectMove(drag.origins, { x: 0, y: hit.y - drag.start.y, z: 0 }, store.grid.snap && !e.ctrlKey, ["y"]);
      return;
    }
    const hit = planeHit(
      raycaster.ray.origin,
      raycaster.ray.direction,
      drag.planeY,
    );
    if (hit)
      scheduleObjectMove(drag.origins, { x: hit.x - drag.offX - drag.x, z: hit.z - drag.offZ - drag.z }, store.grid.snap && !e.ctrlKey);
  });
  const endGesture = (e: PointerEvent) => {
    flushObjectMove();
    if (middleOrbit) { middleOrbit = false; return; }
    if (shiftClick) {
      if (e.type === "pointerup" && e.button === 0) store.select(shiftClick.selection, true);
      shiftClick = null; return;
    }
    if (prefabResize) {
      const cancel = e.type === "pointercancel" && prefabResize.changed;
      prefabResize = null; store.endGesture(); if (cancel) store.undo(); return;
    }
    if (resizing) {
      const cancel = e.type === "pointercancel" && resizing.changed;
      resizing = null; store.endGesture();
      if (cancel) store.undo();
      return;
    }
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
    const geometry = editorSolidGeometry(s);
    scaleSolidUVs(geometry, s, s.kind === "ground" || !!s.footprint);
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
    s: CustomSolid,
    selected: boolean,
  ) => {
    const geometry = editorSolidGeometry(s);
    const fill = new T.Mesh(
      geometry,
      new T.MeshBasicMaterial({
        color: s.color,
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
  type TintSave = { mat: T.Material; color?: number; emissive?: number };
  const syncPrefabArrow = (model: T.Group, id: string, selected: boolean) => {
    const has = model.children.find((c) => c.userData.arrowOf === id);
    if (selected && !has) {
      const arrow = new T.Group(); arrow.userData.arrowOf = id;
      const arrowMat = new T.MeshBasicMaterial({ color: 0xffe08a });
      const shaft = new T.Mesh(new T.BoxGeometry(0.14, 0.14, 3), arrowMat); shaft.position.z = 2.7;
      const head = new T.Mesh(new T.ConeGeometry(0.42, 1, 10), arrowMat); head.rotation.x = Math.PI / 2; head.position.z = 4.7;
      arrow.add(shaft, head); arrow.layers.set(1); arrow.traverse(o => o.layers.set(1)); model.add(arrow);
    } else if (!selected && has) {
      model.remove(has);
      disposeSubtree(has);
    }
  };
  const syncPrefabTint = (model: T.Group, id: string, selected: boolean, preview: boolean) => {
    if (!selected && !model.userData.tinted) return;
    if (model.userData.tinted === selected) {
      syncPrefabArrow(model, id, selected);
      return;
    }
    model.userData.tinted = selected;
    const saved = (model.userData.tintSaved ??= []) as TintSave[];
    model.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
        let s = saved.find((s) => s.mat === mat);
        if (selected) {
          if (!s) {
            s = { mat };
            if ("color" in mat) s.color = (mat as T.MeshBasicMaterial).color.getHex();
            if ("emissive" in mat) s.emissive = (mat as T.MeshStandardMaterial).emissive.getHex();
            saved.push(s);
          }
          if (!preview && mat instanceof T.MeshBasicMaterial) mat.color.set(0xffe08a);
          else if (mat instanceof T.MeshStandardMaterial) mat.emissive.add(new T.Color(0x342900));
        } else if (s) {
          if (s.color !== undefined && "color" in mat) (mat as T.MeshBasicMaterial).color.setHex(s.color);
          if (s.emissive !== undefined && "emissive" in mat) (mat as T.MeshStandardMaterial).emissive.setHex(s.emissive);
        }
      }
    });
    syncPrefabArrow(model, id, selected);
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
      applyLighting(level, preview);
      const nextGridKey = JSON.stringify(store.grid);
      if (nextGridKey !== gridKey) {
        grid.traverse(o => { if (o instanceof T.LineSegments) { o.geometry.dispose(); (o.material as T.Material).dispose(); } });
        scene.remove(grid); grid = buildWorldGrid(store.grid); scene.add(grid); gridKey = nextGridKey;
      }
      grid.visible = !preview && store.grid.show;
      axes.visible = !preview;
      generation++;
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
      // Incremental sync: full rebuild only when the scene root, preview
      // mode, or clip state changes; otherwise add/remove/update in place.
      const clipKey = store.clip ? JSON.stringify([store.clip.targets, store.clip.cutters, store.clip.cutterId ?? ""]) : "";
      if (!group || preview !== lastPreview || clipKey !== lastClipKey) {
        if (group) {
          disposeSubtree(group);
          scene.remove(group);
        }
        group = new T.Group();
        modelCache = new Map();
        modelSig = new Map();
        iceSig = "";
      }
      lastPreview = preview;
      lastClipKey = clipKey;
      const want = new Set<string>();
      const selKeys = new Set<string>();
      for (const s of store.selectedEntries()) selKeys.add(pickKey(s));
      for (const id of store.solidSelection) selKeys.add(`solid:${id}`);
      for (const s of level.solids) {
        const key = `solid:${s.id}`;
        want.add(key);
        const sig = [s.kind, s.w, s.h, s.d, s.angle ?? 0, s.yaw ?? 0, s.roll ?? 0, s.color, s.texture ?? "", preview ? 1 : 0, s.footprint ? JSON.stringify(s.footprint) : ""].join("|");
        let holder = modelCache.get(key) as T.Group | undefined;
        if (!holder || modelSig.get(key) !== sig) {
          if (holder) dropKey(key);
          holder = new T.Group();
          holder.userData.pick = { kind: "solid", id: s.id };
          if (preview) previewSolid(holder, s, false);
          else wireBox(holder, s, false);
          holder.userData.tintMesh = preview ? holder.children[0] : holder.children[1];
          modelCache.set(key, holder);
          modelSig.set(key, sig);
          group.add(holder);
        }
        holder.position.set(s.x, s.y, s.z);
        holder.rotation.set(s.angle ?? 0, s.yaw ?? 0, s.roll ?? 0, "YXZ");
        holder.userData.locked = !!s.locked;
        const selected = selKeys.has(key) ||
          (selection != null && "id" in selection && selection.id === s.id);
        const tintMesh = holder.userData.tintMesh as T.Mesh;
        if (preview) (tintMesh.material as T.MeshStandardMaterial).emissive.setHex(selected ? 0x4a3a00 : 0x000000);
        else (tintMesh.material as T.MeshBasicMaterial).color.setHex(selected ? 0xffe08a : 0x9adfe8);
      }
      for (const key of [...modelCache.keys()]) if (key.startsWith("clipremoved:")) dropKey(key);
      for (const [ri, s] of (clip?.removed ?? []).entries()) {
        const removed = new T.Mesh(editorSolidGeometry(s), new T.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.4, depthWrite: false }));
        removed.position.set(s.x, s.y, s.z);
        removed.rotation.set(s.angle ?? 0, s.yaw ?? 0, s.roll ?? 0, "YXZ");
        // Preview volumes are not selectable and are disposed with the scene.
        const rkey = `clipremoved:${ri}`;
        modelCache.set(rkey, removed);
        want.add(rkey);
        group.add(removed);
      }
      level.checkpoints.forEach((cp, i) => {
        const key = `checkpoint:${i}`, fkey = `checkpointframe:${i}`;
        want.add(key);
        const previous = level.checkpoints[i - 1] ?? level.spawn;
        const yaw = cp.yaw ?? Math.atan2(cp.x - previous.x, cp.z - previous.z);
        const sig = [cp.appearance ?? "", preview ? 1 : 0].join("|");
        if (!modelCache.get(key) || modelSig.get(key) !== sig) {
          dropKey(key);
          dropKey(fkey);
          if (preview) {
            const frame = cp.appearance ? buildToyCheckpoint(cp.appearance) : buildCheckpointFrame();
            frame.userData.pick = { kind: "checkpoint", index: i };
            modelCache.set(fkey, frame);
            group!.add(frame);
          }
          const gate = new T.Mesh(
            new T.PlaneGeometry(cp.appearance ? CHECKPOINT_WIDTHS[cp.appearance] : 24, 8),
            new T.MeshBasicMaterial({ color: 0x6ae08a, wireframe: true, side: T.DoubleSide }),
          );
          gate.userData.pick = { kind: "checkpoint", index: i };
          if (preview) gate.layers.set(1); // gizmos hide in preview
          modelCache.set(key, gate);
          modelSig.set(key, sig);
          group!.add(gate);
        }
        if (preview) want.add(fkey);
        const gate = modelCache.get(key) as T.Mesh;
        gate.position.set(cp.x, cp.y ?? 2, cp.z);
        gate.rotation.y = yaw;
        gate.userData.locked = !!cp.locked;
        const frame = modelCache.get(fkey);
        if (frame) {
          frame.position.set(cp.x, Math.max(0, (cp.y ?? 2) - 2.6), cp.z);
          frame.rotation.y = yaw;
          frame.userData.locked = !!cp.locked;
        }
        const selected = selection != null && "index" in selection && selection.kind === "checkpoint" && selection.index === i;
        (gate.material as T.MeshBasicMaterial).color.setHex(selected ? 0xffe08a : 0x6ae08a);
      });
      const iceList = level.prefabs.filter(p => p.kind === "fragile-ice" && !selKeys.has(`prefab:${p.id}`));
      const batchedIds = new Set(iceList.length > 1 ? iceList.map(p => p.id) : []);
      if (iceList.length > 1) {
        want.add("__ice");
        const ids = iceList.map(p => p.id).join(",");
        const batch = modelCache.get("__ice");
        const wantSig = `${preview ? "p" : "w"}|${ids}`;
        if (!batch || iceSig !== wantSig) {
          dropKey("__ice");
          const built = buildEditorIceBatch(iceList, preview);
          modelCache.set("__ice", built);
          group!.add(built);
          iceSig = wantSig;
          icePos = new Map(iceList.map(p => [p.id, iceTransform(p)]));
        } else {
          // Membership matches: update moved instances (and lock flags) in place.
          const moves: { p: (typeof iceList)[number]; i: number }[] = [];
          iceList.forEach((p, i) => {
            const t = iceTransform(p);
            const prev = icePos.get(p.id);
            if (!prev || prev.some((v, k) => v !== t[k])) {
              icePos.set(p.id, t);
              moves.push({ p, i });
            }
          });
          const firstMesh = batch.children.find((o): o is T.InstancedMesh => o instanceof T.InstancedMesh);
          const picks = firstMesh?.userData.instancePicks as { locked: boolean }[] | undefined;
          if (picks) iceList.forEach((p, i) => {
            if (picks[i]) picks[i].locked = !!p.locked;
          });
          if (moves.length) {
            const matrix = new T.Matrix4(), rotation = new T.Quaternion(), position = new T.Vector3(), size = new T.Vector3();
            batch.traverse(o => {
              if (!(o instanceof T.InstancedMesh)) return;
              const base = o.userData.baseMatrix as T.Matrix4;
              for (const { p, i } of moves) {
                position.set(p.x, prefabY(p), p.z);
                rotation.setFromEuler(new T.Euler(p.angle ?? 0, p.yaw ?? 0, p.roll ?? 0, "YXZ"));
                size.setScalar(p.resizeScale ?? 1);
                matrix.compose(position, rotation, size).multiply(base);
                o.setMatrixAt(i, matrix);
              }
              o.instanceMatrix.needsUpdate = true;
              o.computeBoundingBox();
              o.computeBoundingSphere();
            });
          }
        }
      } else if (modelCache.has("__ice")) {
        dropKey("__ice");
        iceSig = "";
        icePos = new Map();
      }
      for (const p of level.prefabs) {
        const key = `prefab:${p.id}`;
        if (batchedIds.has(p.id)) {
          dropKey(key);
          continue;
        }
        want.add(key);
        const sig = [p.kind, p.scale ?? 1, preview ? 1 : 0].join("|");
        let model = modelCache.get(key) as T.Group | undefined;
        if (!model || modelSig.get(key) !== sig) {
          if (model) dropKey(key);
          model = buildEditorPrefab(p, preview);
          modelCache.set(key, model);
          modelSig.set(key, sig);
          group!.add(model);
        }
        model.position.set(p.x, prefabY(p), p.z);
        model.rotation.set(p.angle ?? 0, p.yaw ?? 0, p.roll ?? 0, "YXZ");
        model.scale.setScalar(p.resizeScale ?? 1);
        model.userData.locked = !!p.locked;
        syncPrefabTint(model, p.id, selKeys.has(key), preview);
      }
      for (const [i, t] of [
        ...(level.collectibles ?? []),
        ...(level.demolish ?? []),
      ].entries()) {
        const key = `target:${i}`;
        want.add(key);
        const collectible = level.mode !== "demolition";
        const sig = [level.mode, t.kind ?? ""].join("|");
        if (!modelCache.get(key) || modelSig.get(key) !== sig) {
          dropKey(key);
          const marker = new T.Mesh(
            !collectible
              ? new T.OctahedronGeometry(1.6)
              : t.kind === "chest"
                ? new T.BoxGeometry(2.2, 1.6, 1.4)
                : new T.TorusGeometry(0.85, 0.17, 12, 32),
            new T.MeshBasicMaterial({ color: 0xffd24a, wireframe: true }),
          );
          marker.userData.pick = { kind: "target", index: i };
          if (preview) marker.layers.set(1); // gizmos hide in preview
          modelCache.set(key, marker);
          modelSig.set(key, sig);
          group!.add(marker);
        }
        const marker = modelCache.get(key) as T.Mesh;
        marker.position.set(t.x, t.y ?? (collectible ? 1.7 : 1.5), t.z);
        marker.userData.locked = !!t.locked;
        marker.scale.setScalar(
          selection != null && "index" in selection && selection.kind === "target" && selection.index === i ? 1.6 : 1,
        );
      }
      for (const [i, r] of (level.rings ?? []).entries()) {
        const key = `ring:${i}`;
        want.add(key);
        const sig = [r.radius, r.goal ? 1 : 0].join("|");
        if (!modelCache.get(key) || modelSig.get(key) !== sig) {
          dropKey(key);
          const marker = new T.Mesh(
            new T.TorusGeometry(r.radius, 0.4, 8, 32),
            new T.MeshBasicMaterial({
              color: r.goal ? 0xffd34d : 0x4fb8ff,
              wireframe: true,
            }),
          );
          marker.userData.pick = { kind: "ring", index: i };
          if (preview) marker.layers.set(1); // gizmos hide in preview
          modelCache.set(key, marker);
          modelSig.set(key, sig);
          group!.add(marker);
        }
        const marker = modelCache.get(key) as T.Mesh;
        marker.position.set(r.x, r.y, r.z);
        marker.userData.locked = !!r.locked;
        marker.scale.setScalar(
          selection != null && "index" in selection && selection.kind === "ring" && selection.index === i ? 1.6 : 1,
        );
      }
      want.add("spawn");
      const gameLight = preview && !!level.previewGameLighting;
      const spawnSig = [preview ? 1 : 0, gameLight ? 1 : 0, lighting?.night ? 1 : 0].join("|");
      if (!modelCache.get("spawn") || modelSig.get("spawn") !== spawnSig) {
        dropKey("spawn");
        const spawn = preview ? createTruck() : new T.Mesh(
          new T.ConeGeometry(1, 2.5, 4),
          new T.MeshBasicMaterial({ color: 0xffa762, wireframe: true }),
        );
        spawn.userData.pick = { kind: "spawn" };
        if (preview && level.previewGameLighting) {
          const headlights = buildHeadlightRig();
          headlights.userData.ignoreBounds = true;
          setHeadlightRig(headlights, lighting!.night);
          setHeadlightDim(headlights, DEFAULT_TUNING.headlightDim * (isPermanentNight(level.backgroundTemplate, level.forceNight) ? MYSTIC_HEADLIGHT_DIM : 1));
          spawn.getObjectByName("hood")?.add(headlights);
        }
        modelCache.set("spawn", spawn);
        modelSig.set("spawn", spawnSig);
        group!.add(spawn);
      }
      const spawnNode = modelCache.get("spawn")!;
      spawnNode.position.set(level.spawn.x, level.spawn.y + (preview ? 0 : 1.5), level.spawn.z);
      spawnNode.rotation.y = level.spawn.yaw;
      spawnNode.userData.locked = !!level.spawn.locked;
      for (const key of [...modelCache.keys()]) if (!want.has(key)) dropKey(key);
      if (preview && level.previewGameLighting) {
        configureShadowSurfaces(group!);
        applyNightGlow(group!, lighting!.night);
      }
      if (preview) {
        dropKey("__lights");
        const node = buildEditorLocalLights(level, target, group!);
        modelCache.set("__lights", node);
        want.add("__lights");
        group!.add(node);
      } else dropKey("__lights");
      scene.add(group!);
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
      const prefabArrows: { id: string; dir: { x: number; z: number } }[] = [];
      group?.traverse((o) => {
        const arrowOf = (o as T.Group).userData?.arrowOf as string | undefined;
        if (!arrowOf || !(o instanceof T.Group)) return;
        const dir = new T.Vector3(0, 0, 1).applyQuaternion(
          o.getWorldQuaternion(new T.Quaternion()),
        );
        prefabArrows.push({ id: arrowOf, dir: { x: dir.x, z: dir.z } });
      });
      return {
        preview: previewOn,
        camera: { position: camera.position.toArray(), target: target.toArray(), distance: camera.position.distanceTo(target), fov: camera.fov },
        lighting,
        prefabLights: (group?.children.find(o => o instanceof PrefabLights) as PrefabLights | undefined)?.inspect() ?? [],
        checkpoints: (group?.children ?? []).filter(o => o.userData.pick?.kind === "checkpoint" && o.layers.test(camera.layers)).map(o => {
          let meshes = 0; o.traverse(child => { if (child instanceof T.Mesh) meshes++; });
          return { index: o.userData.pick.index as number, meshes };
        }),
        spawn: (() => {
          const root = group?.children.find(o => o.userData.pick?.kind === "spawn");
          let meshes = 0; root?.traverse(o => { if (o instanceof T.Mesh) meshes++; });
          return { name: root?.name, meshes, visible: !!root?.layers.test(camera.layers) };
        })(),
        selectedPrefab: store.selection?.kind === "prefab" ? store.selection.id : undefined,
        prefabs: (group?.children ?? []).filter(o => o.userData.pick?.kind === "prefab").map(root => {
          let meshes = 0, vertices = 0;
          root.traverse(o => { if (o instanceof T.Mesh) { meshes++; vertices += o.geometry.attributes.position.count; } });
          const bounds = new T.Box3().setFromObject(root);
          return { id: root.userData.pick.id as string, meshes, vertices, min: bounds.min.toArray(), max: bounds.max.toArray() };
        }),
        gridVisible: grid.visible,
        grid: { ...store.grid, axes: grid.children.map(o => o.name) },
        solids,
        prefabArrows,
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
    frameSelection() {
      if (!store.selection || !group) return;
      const bounds = new T.Box3();
      for (const model of group.children) {
        const pick = model.userData.pick as EditorSelection;
        if (pick && store.isSelected(pick)) model.traverse(o => {
          if (!(o instanceof T.Mesh) || !o.visible || o.parent?.userData.arrowOf || o.parent?.userData.ignoreBounds || !o.layers.isEnabled(0)) return;
          o.geometry.computeBoundingBox();
          bounds.union(o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld));
        });
      }
      if (!bounds.isEmpty()) orbit.frameBounds(bounds);
    },
    cameraTarget() {
      return { x: target.x, y: target.y, z: target.z };
    },
    groupCenter(name: string) {
      const keys = new Set(store.allEntries().filter(s => store.selectedItem(s)?.item.group === name).map(pickKey));
      const bounds = new T.Box3(); group?.updateWorldMatrix(true, true);
      group?.traverse(o => {
        if (!(o instanceof T.Mesh) || o.parent?.userData.arrowOf || o.parent?.userData.ignoreBounds) return;
        o.geometry.computeBoundingBox(); if (!o.geometry.boundingBox) return;
        if (o instanceof T.InstancedMesh && o.userData.instancePicks) {
          for (const [i, item] of o.userData.instancePicks.entries()) if (keys.has(pickKey(item.pick))) {
            const matrix = new T.Matrix4(); o.getMatrixAt(i, matrix);
            bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld.clone().multiply(matrix)));
          }
          return;
        }
        let node: T.Object3D | null = o;
        while (node && !node.userData.pick) node = node.parent;
        if (node && keys.has(pickKey(node.userData.pick))) bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
      });
      if (bounds.isEmpty()) return null;
      const center = bounds.getCenter(new T.Vector3()); return { x: center.x, y: center.y, z: center.z };
    },
    resize,
    dispose() {
      skyEnvironment?.texture.dispose();
      environment.dispose();
      if (settleTimer) clearTimeout(settleTimer);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
