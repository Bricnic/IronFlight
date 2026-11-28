import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getVehicle } from "./vehicles";
import {
  MAX_CUSTOMS,
  MAX_DABS,
  activeCustomization,
  applyCustomization,
  deleteCustomization,
  listCustomizations,
  partOf,
  saveCustomization,
  setActiveFinish,
  type Customization,
  type PaintDab,
  type PaintFill,
} from "./customizations";

type Tool = "spray" | "bucket" | "orbit";
const SWATCHES = [
  0xff2d2d, 0xff7a1a, 0xffc93b, 0x37d67a,
  0x2f9dff, 0x7a4dff, 0xff6fe0, 0xf5f2ea,
  0x22262b, 0x8a939c, 0x5a3a1e, 0x0fb5a6,
];

export function createPaintShop(host: HTMLElement, onBack: () => void) {
  const screen = document.createElement("main");
  screen.id = "paint-shop";
  screen.hidden = true;
  screen.innerHTML = `<div class="track-select-intro"><div><div class="eyebrow">IRON FLIGHT / GARAGE</div><h1>Paint shop.</h1><p id="paint-vehicle-name"></p></div><div class="menu-actions"><button id="paint-back">Garage</button></div></div>
<div class="paint-layout"><div id="paint-stage"><canvas id="paint-canvas"></canvas></div>
<section class="paint-panel" aria-label="Paint tools">
<div class="settings-grid" role="radiogroup" aria-label="Tool">
<button class="vehicle-pick" role="radio" data-tool="spray" aria-label="Spray can"><div class="track-card-body"><div class="track-card-heading"><h2>Spray</h2></div><p>Drag on the car to spray markings.</p></div></button>
<button class="vehicle-pick" role="radio" data-tool="bucket" aria-label="Paint bucket"><div class="track-card-body"><div class="track-card-heading"><h2>Bucket</h2></div><p>Click a region to recolor it.</p></div></button>
<button class="vehicle-pick" role="radio" data-tool="orbit" aria-label="Orbit camera"><div class="track-card-body"><div class="track-card-heading"><h2>Orbit</h2></div><p>Drag to turn the car.</p></div></button>
</div>
<div class="paint-row" role="group" aria-label="Paint color"><div id="paint-swatches"></div><input id="paint-color" type="color" value="#ff2d2d" aria-label="Custom paint color"></div>
<label class="paint-slider">Spray size <input id="paint-size" type="range" min="0.06" max="0.3" step="0.01" value="0.14"><span id="paint-size-value"></span></label>
<label class="paint-slider">Bucket tolerance <input id="paint-tolerance" type="range" min="0" max="100" step="1" value="8"><span id="paint-tolerance-value"></span></label>
<div class="paint-row"><button id="paint-undo" class="header-action">Undo</button><button id="paint-reset" class="header-action">Reset to factory</button></div>
<div class="paint-row"><input id="paint-name" type="text" maxlength="24" placeholder="Custom name" aria-label="Customization name"><button id="paint-save" class="header-action">Save</button></div>
<div id="paint-status" role="status"></div>
<h2>Finishes</h2><div id="paint-finishes"></div>
<p class="selection-footnote">Starts from the active finish. Save stores a new customization; the bucket fills the clicked part within tolerance.</p>
</section></div>`;
  host.append(screen);

  const canvas = screen.querySelector<HTMLCanvasElement>("#paint-canvas")!;
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new T.Scene();
  scene.background = new T.Color(0x11181d);
  scene.add(new T.HemisphereLight(0xbfd4e6, 0x2a2620, 1.1));
  const key = new T.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 7, 3);
  scene.add(key);
  const grid = new T.GridHelper(14, 14, 0xffbc6b, 0x33404a);
  grid.position.y = -0.02;
  scene.add(grid);
  const camera = new T.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(4.5, 3, 6.5);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.8, 0);
  controls.enableDamping = true;
  controls.minDistance = 3;
  controls.maxDistance = 14;
  controls.maxPolarAngle = Math.PI * 0.55;

  const raycaster = new T.Raycaster();
  let vehicleId = "";
  let vehicle: T.Group | null = null;
  let tool: Tool = "spray";
  let color = SWATCHES[0];
  let spraySize = 0.14;
  let tolerance = 0.08;
  let fills: PaintFill[] = [];
  let dabs: PaintDab[] = [];
  let undoStack: ("fill" | "dab")[] = [];
  let raf = 0;
  let stroking = false;
  let lastDab: T.Vector3 | null = null;
  let downAt: { x: number; y: number } | null = null;

  const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
    screen.querySelector<T>(`#${id}`)!;
  const status = (text: string) => {
    $("paint-status").textContent = text;
  };

  function disposeVehicle() {
    if (!vehicle) return;
    vehicle.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m.dispose();
      }
    });
    scene.remove(vehicle);
    vehicle = null;
  }

  function rebuildPreview() {
    disposeVehicle();
    vehicle = getVehicle(vehicleId).build();
    applyCustomization(vehicle, {
      id: "working",
      name: "working",
      createdAt: 0,
      fills,
      dabs,
    });
    scene.add(vehicle);
    $("paint-undo").toggleAttribute("disabled", undoStack.length === 0);
  }

  function pick(
    event: PointerEvent,
  ): {
    part: string;
    point: T.Vector3;
    normal: T.Vector3;
    world: T.Vector3;
    color: number;
  } | null {
    if (!vehicle) return null;
    const rect = canvas.getBoundingClientRect();
    const pointer = new T.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(vehicle.children, true);
    for (const hit of hits) {
      const object = hit.object;
      if (!(object instanceof T.Mesh) || !hit.face) continue;
      const part = partOf(vehicle, object);
      if (!part) continue;
      const group = vehicle.getObjectByName(part)!;
      const normal = hit.face.normal
        .clone()
        .transformDirection(object.matrixWorld);
      const normalLocal = normal
        .clone()
        .applyQuaternion(group.getWorldQuaternion(new T.Quaternion()).invert())
        .normalize();
      const local = group
        .worldToLocal(hit.point.clone())
        .addScaledVector(normalLocal, 0.012);
      const mat = object.material as T.Material;
      const colorHex =
        "color" in mat && (mat as { color: unknown }).color instanceof T.Color
          ? (mat as unknown as { color: T.Color }).color.getHex()
          : 0;
      return { part, point: local, normal: normalLocal, world: hit.point.clone(), color: colorHex };
    }
    return null;
  }

  function sprayAt(event: PointerEvent) {
    const hit = pick(event);
    if (!hit) return;
    if (dabs.length >= MAX_DABS) {
      status(`Dab cap reached (${MAX_DABS}). Save or reset to continue.`);
      return;
    }
    if (lastDab && hit.world.distanceTo(lastDab) < spraySize * 0.5) return;
    lastDab = hit.world.clone();
    dabs.push({
      part: hit.part,
      at: [hit.point.x, hit.point.y, hit.point.z],
      normal: [hit.normal.x, hit.normal.y, hit.normal.z],
      color,
      size: spraySize,
    });
    undoStack.push("dab");
    rebuildPreview();
  }

  function fillAt(event: PointerEvent) {
    const hit = pick(event);
    if (!hit) return;
    fills.push({ part: hit.part, from: hit.color, to: color, tolerance });
    undoStack.push("fill");
    rebuildPreview();
    status(`Filled ${hit.part}.`);
  }

  canvas.addEventListener("pointerdown", (event) => {
    downAt = { x: event.clientX, y: event.clientY };
    if (tool === "spray" && event.button === 0) {
      stroking = true;
      lastDab = null;
      controls.enabled = false;
      canvas.setPointerCapture(event.pointerId);
      sprayAt(event);
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    if (stroking) sprayAt(event);
  });
  const endStroke = (event: PointerEvent) => {
    if (tool === "bucket" && downAt && event.button === 0) {
      const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
      if (moved < 6) fillAt(event);
    }
    stroking = false;
    lastDab = null;
    downAt = null;
    controls.enabled = true;
  };
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  const toolButtons = Array.from(screen.querySelectorAll<HTMLButtonElement>("[data-tool]"));
  const paintTool = (next: Tool) => {
    tool = next;
    for (const button of toolButtons) {
      const on = button.dataset.tool === next;
      button.classList.toggle("selected", on);
      button.setAttribute("aria-checked", String(on));
    }
    const buttons = controls.mouseButtons as unknown as Record<string, number>;
    buttons.LEFT = next === "orbit" ? T.MOUSE.ROTATE : -1;
    buttons.MIDDLE = T.MOUSE.DOLLY;
    buttons.RIGHT = T.MOUSE.PAN;
    canvas.style.cursor = next === "orbit" ? "grab" : "crosshair";
  };
  for (const button of toolButtons)
    button.onclick = () => paintTool(button.dataset.tool as Tool);

  const swatchWrap = $("paint-swatches");
  const paintSwatches = () => {
    for (const swatch of Array.from(swatchWrap.querySelectorAll("button"))) {
      const on = Number(swatch.dataset.color) === color;
      swatch.classList.toggle("selected", on);
      swatch.setAttribute("aria-checked", String(on));
    }
  };
  for (const hex of SWATCHES) {
    const swatch = document.createElement("button");
    swatch.dataset.color = String(hex);
    swatch.setAttribute("aria-label", `Paint #${hex.toString(16).padStart(6, "0")}`);
    swatch.style.background = `#${hex.toString(16).padStart(6, "0")}`;
    swatch.onclick = () => {
      color = hex;
      ($("paint-color") as HTMLInputElement).value = swatch.style.background;
      paintSwatches();
    };
    swatchWrap.append(swatch);
  }
  ($("paint-color") as HTMLInputElement).oninput = (event) => {
    color = parseInt((event.target as HTMLInputElement).value.slice(1), 16);
    paintSwatches();
  };
  const sizeInput = $("paint-size") as HTMLInputElement;
  const paintSize = () => {
    spraySize = Number(sizeInput.value);
    $("paint-size-value").textContent = spraySize.toFixed(2);
  };
  sizeInput.oninput = paintSize;
  const toleranceInput = $("paint-tolerance") as HTMLInputElement;
  const paintTolerance = () => {
    tolerance = Number(toleranceInput.value) / 100;
    $("paint-tolerance-value").textContent = `${toleranceInput.value}%`;
  };
  toleranceInput.oninput = paintTolerance;

  $("paint-undo").onclick = () => {
    const last = undoStack.pop();
    if (last === "fill") fills.pop();
    else if (last === "dab") dabs.pop();
    rebuildPreview();
  };
  $("paint-reset").onclick = () => {
    fills = [];
    dabs = [];
    undoStack = [];
    rebuildPreview();
    status("Factory finish restored.");
  };
  $("paint-save").onclick = () => {
    const nameInput = $("paint-name") as HTMLInputElement;
    const saved = saveCustomization(vehicleId, nameInput.value || `Custom ${listCustomizations(vehicleId).length + 1}`, fills, dabs);
    if (!saved) {
      status(`Cap reached (${MAX_CUSTOMS} finishes). Delete one to save.`);
      return;
    }
    setActiveFinish(vehicleId, saved.id);
    nameInput.value = "";
    paintFinishes();
    status(`Saved “${saved.name}”.`);
  };

  function paintFinishes() {
    const wrap = $("paint-finishes");
    wrap.innerHTML = "";
    const customs = listCustomizations(vehicleId);
    const activeId =
      customs.find((c) => c.id === activeCustomization(vehicleId)?.id)?.id ?? "default";
    const row = (
      id: string,
      label: string,
      onApply: () => void,
      onDelete?: () => void,
    ) => {
      const el = document.createElement("div");
      el.className = "paint-finish-row";
      el.dataset.custom = id;
      const apply = document.createElement("button");
      apply.className = "header-action";
      apply.textContent = `${label}${id === activeId ? " (active)" : ""}`;
      apply.onclick = onApply;
      el.append(apply);
      if (onDelete) {
        const del = document.createElement("button");
        del.className = "header-action";
        del.textContent = "Delete";
        del.setAttribute("aria-label", `Delete ${label}`);
        del.onclick = onDelete;
        el.append(del);
      }
      wrap.append(el);
    };
    row("default", "Default", () => {
      setActiveFinish(vehicleId, "default");
      paintFinishes();
    });
    for (const c of customs) {
      row(
        c.id,
        c.name,
        () => {
          setActiveFinish(vehicleId, c.id);
          paintFinishes();
        },
        () => {
          deleteCustomization(vehicleId, c.id);
          paintFinishes();
          status(`Deleted “${c.name}”.`);
        },
      );
    }
  }

  function fit() {
    const parent = canvas.parentElement!;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", () => {
    if (!screen.hidden) fit();
  });
  const loop = () => {
    if (screen.hidden) {
      raf = 0;
      return;
    }
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };

  $("paint-back").onclick = onBack;
  return {
    show(id: string) {
      vehicleId = id;
      $("paint-vehicle-name").textContent = getVehicle(id).name;
      const active = activeCustomization(id);
      fills = (active?.fills ?? []).map((f) => ({ ...f }));
      dabs = (active?.dabs ?? []).map((d) => ({
        ...d,
        at: [...d.at] as [number, number, number],
        normal: [...d.normal] as [number, number, number],
      }));
      undoStack = [];
      paintTool("spray");
      paintSwatches();
      paintSize();
      paintTolerance();
      paintFinishes();
      status("");
      ($("paint-name") as HTMLInputElement).value = "";
      screen.hidden = false;
      fit();
      rebuildPreview();
      camera.position.set(4.5, 3, 6.5);
      controls.target.set(0, 0.8, 0);
      if (!raf) raf = requestAnimationFrame(loop);
    },
    hide() {
      screen.hidden = true;
      disposeVehicle();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
