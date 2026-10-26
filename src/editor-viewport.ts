import * as T from "three";
import {
  PROP_PREFAB_KINDS,
  type CustomLevel,
  type CustomSolid,
} from "./custom-level";
import type { EditorSelection, EditorStore } from "./editor-state";
import { trackballEuler } from "./euler";
import { pbr } from "./materials";
import { scaleSolidUVs } from "./solid-uv";
/** Resolve a pick from raycast hits by walking to tagged ancestors. */
export function resolveViewportPick(
  hits: { object: unknown }[],
): EditorSelection {
  for (const hit of hits) {
    let node: unknown = hit.object;
    while (node !== null && node !== undefined) {
      const record = node as {
        userData?: { pick?: EditorSelection };
        parent?: unknown;
      };
      if (record.userData?.pick != null) return record.userData.pick;
      node = record.parent;
    }
  }
  return null;
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
  hydrant: 0xe06a6a,
  burner: 0xff7a1f,
  water: 0x4fb8ff,
  potion: 0x9ae06a,
  sign: 0xe6c16a,
  trash: 0x8a8f96,
  barrel: 0xc25a3a,
  gravestone: 0x9aa2a8,
  snowman: 0xdfe8ff,
  checkpoint: 0x6ae08a,
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
  const panPixels = (dx: number, dy: number) => {
    const scale = spherical.radius / 400;
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
    frame(point: T.Vector3) {
      target.copy(point);
      spherical.radius = 90;
      apply();
    },
    panBy(dx: number, dy: number) {
      panPixels(dx, dy);
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
    const first = hits[0];
    return {
      selection: resolveViewportPick(hits),
      point: first ? first.point.clone() : null,
    };
  };
  let drag: { planeY: number; offX: number; offZ: number } | null = null;
  let rotate = false;
  let pan = false;
  let downEmpty = false;
  let downX = 0;
  let downY = 0;
  let moved = false;
  const canStart = (e: PointerEvent) => {
    if (e.button === 2) return true;
    downX = e.clientX;
    downY = e.clientY;
    moved = false;
    downEmpty = false;
    if (store.tool === "pan") {
      pan = true;
      renderer.domElement.setPointerCapture(e.pointerId);
      return false;
    }
    const { selection, point } = pickAt(e.clientX, e.clientY);
    if (!selection || !point) {
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
      rotate = true;
      renderer.domElement.setPointerCapture(e.pointerId);
      return false;
    }
    const item = store.selectedItem()?.item;
    drag = {
      planeY: point.y,
      offX: item ? point.x - item.x : 0,
      offZ: item ? point.z - item.z : 0,
    };
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
    if (Math.hypot(e.clientX - downX, e.clientY - downY) >= 4) moved = true;
    if (pan) {
      orbit.panBy(e.clientX - downX, e.clientY - downY);
      downX = e.clientX;
      downY = e.clientY;
      return;
    }
    if (rotate) {
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      downX = e.clientX;
      downY = e.clientY;
      const current = store.selectedItem();
      if (current?.kind === "solid") {
        const right = new T.Vector3().setFromMatrixColumn(camera.matrix, 0);
        const up = new T.Vector3().setFromMatrixColumn(camera.matrix, 1);
        const out = trackballEuler(
          {
            yaw: current.item.yaw ?? 0,
            pitch: current.item.angle ?? 0,
            roll: current.item.roll ?? 0,
          },
          dx,
          dy,
          right,
          up,
        );
        store.updateSelected({
          yaw: out.yaw,
          angle: out.pitch,
          roll: out.roll,
        });
      } else if (
        current?.kind === "prefab" &&
        (PROP_PREFAB_KINDS as readonly string[]).includes(current.item.kind)
      ) {
        store.updateSelected({ yaw: (current.item.yaw ?? 0) + dx * 0.01 });
      }
      return;
    }
    if (!drag) return;
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
    if (drag || rotate || pan) {
      drag = null;
      rotate = false;
      pan = false;
      return;
    }
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
    const mesh = new T.Mesh(
      geometry,
      s.texture
        ? pbr(s.texture, 1, {
            color: s.color,
            roughness: 0.9,
            emissive: selected ? 0x4a3a00 : 0x000000,
          })
        : new T.MeshStandardMaterial({
            color: s.color,
            roughness: 0.9,
            emissive: selected ? 0x4a3a00 : 0x000000,
          }),
    );
    parent.add(mesh);
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
        holder.position.set(s.x, s.y, s.z);
        holder.rotation.set(
          s.angle ?? 0,
          s.yaw ?? 0,
          s.roll ?? 0,
          "YXZ",
        );
        const selected =
          selection != null && "id" in selection && selection.id === s.id;
        if (preview) previewSolid(holder, s, selected);
        else wireBox(holder, s.w, s.h, s.d, s.color, selected);
        group.add(holder);
      }
      for (const [i, cp] of level.checkpoints.entries()) {
        const gate = new T.Mesh(
          new T.PlaneGeometry(24, 8),
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
        gate.userData.pick = { kind: "checkpoint", index: i };
        group.add(gate);
      }
      for (const p of level.prefabs) {
        const marker = new T.Mesh(
          new T.OctahedronGeometry(1.2),
          new T.MeshBasicMaterial({
            color: PREFAB_COLORS[p.kind] ?? 0xffffff,
            wireframe: true,
          }),
        );
        marker.position.set(p.x, (p.y ?? 0) + 1.5, p.z);
        marker.rotation.y = p.yaw ?? 0;
        marker.userData.pick = { kind: "prefab", id: p.id };
        if (selection != null && "id" in selection && selection.id === p.id)
          marker.scale.setScalar(1.6);
        group.add(marker);
      }
      for (const [i, t] of [
        ...(level.collectibles ?? []),
        ...(level.demolish ?? []),
      ].entries()) {
        const marker = new T.Mesh(
          new T.OctahedronGeometry(1.6),
          new T.MeshBasicMaterial({ color: 0xffd24a, wireframe: true }),
        );
        marker.position.set(t.x, (t.y ?? 0) + 1.5, t.z);
        marker.userData.pick = { kind: "target", index: i };
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
      orbit.frame(new T.Vector3(level.spawn.x, level.spawn.y, level.spawn.z));
    },
    resize,
    dispose() {
      if (settleTimer) clearTimeout(settleTimer);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
