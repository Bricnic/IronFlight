import * as T from "three";
import type { CustomLevel } from "./custom-level";
import type { EditorSelection } from "./editor-state";
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
  dom.addEventListener("pointerdown", (e) => {
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
      const scale = spherical.radius / 400;
      const right = new T.Vector3().setFromMatrixColumn(camera.matrix, 0);
      const up = new T.Vector3().setFromMatrixColumn(camera.matrix, 1);
      target.addScaledVector(right, -dx * scale);
      target.addScaledVector(up, dy * scale);
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
  };
}
/** Wireframe level preview. Rebuilds on demand; never touches the game view. */
export function createEditorViewport(host: HTMLElement) {
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setClearColor(0x111c22);
  host.append(renderer.domElement);
  const scene = new T.Scene();
  scene.add(new T.GridHelper(400, 40, 0x3a5a5a, 0x22393e));
  scene.add(new T.AxesHelper(10));
  const camera = new T.PerspectiveCamera(55, 1, 0.1, 2000);
  const target = new T.Vector3(0, 0, 0);
  const draw = () => renderer.render(scene, camera);
  const orbit = attachOrbit(camera, renderer.domElement, target, draw);
  let group: T.Group | null = null;
  const resize = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    draw();
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
  return {
    dom: renderer.domElement,
    render(level: CustomLevel, selection: EditorSelection) {
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
        holder.position.set(s.x, s.y, s.z);
        holder.rotation.set(
          s.angle ?? 0,
          s.yaw ?? 0,
          0,
          "YXZ",
        );
        wireBox(
          holder,
          s.w,
          s.h,
          s.d,
          s.color,
          selection != null && "id" in selection && selection.id === s.id,
        );
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
        if (
          selection != null &&
          "index" in selection &&
          selection.kind === "target" &&
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
      group.add(spawn);
      scene.add(group);
      draw();
    },
    frameSpawn(level: CustomLevel) {
      orbit.frame(new T.Vector3(level.spawn.x, level.spawn.y, level.spawn.z));
    },
    resize,
    dispose() {
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
