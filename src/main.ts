import { resultOpacity } from "./result-reveal";
import { createLevelSelect } from "./level-select";
import { createVehicleSelect } from "./vehicle-select";
import { createLevelEditor } from "./level-editor";
import { shouldSyncFromSession } from "./editor-state";
import { createSettings } from "./settings-screen";
import { loadSettings } from "./settings";
import * as T from "three";
import {
  placeInLevel,
  appendCheckpoint,
  editPrefabInLevel,
  deletePrefabInLevel,
  duplicatePrefabInLevel,
  editSolidInLevel,
  deleteSolidInLevel,
  duplicateSolidInLevel,
  moveCheckpointInLevel,
  deleteCheckpointInLevel,
  duplicateCheckpointInLevel,
  moveCheckpointOnTrack,
  deleteCheckpointOnTrack,
  duplicateCheckpointOnTrack,
  registerCustomTrack,
  TEXTURE_IDS,
  validateCustomLevel,
} from "./custom-level";
import { getVehicle } from "./vehicles";
import { BestTimes } from "./best-times";
import {
  getTrack,
  stepTrackId,
  type CustomTrackId,
  type TrackId,
} from "./tracks";
import {
  listLevels,
  saveLevel,
  loadLevel,
  removeLevel,
  registerStoredTracks,
} from "./level-store";
import type { CustomLevel, CustomPrefab } from "./custom-level";
import "./style.css";
import { Simulation, initPhysics, type Stage, type Input } from "./simulation";
import { FixedClock } from "./clock";
import { ROUTES } from "./routes";
import { PARTS } from "./damage";
import { DestructionLab } from "./lab";
import { GameView } from "./view";
import "./harness";
import type { CameraSample } from "./harness";
import { drivingInput } from "./controls";
import { objectiveCopy, progressCopy, progressFraction } from "./run-copy";
import { createDebugMenu } from "./debug-menu";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<div id="viewport"></div><header><a class="brand" href="/">IRON<span>FLIGHT</span><i>STUNT MOTORSPORT</i></a><div class="series">MONSTER TRUCK STUNT SERIES <b>VOL. 01</b></div><span class="online">● SINGLE PLAYER</span></header>
<aside><div class="eyebrow">THE ARENA IS YOURS</div><h1>BIG TRUCK.<br>BAD IDEAS.</h1><p class="intro">Three ways across. One way to find out.</p><div id="routes">${ROUTES.map((r) => `<button class="route" data-stage="${r.id}" style="--route:#${r.color.toString(16)}"><small>${r.difficulty}</small><strong>${r.name}<span>↗</span></strong><em>${r.gapEnd - 12}m gap <span>·</span> ${r.hazards} hazard${r.hazards > 1 ? "s" : ""}</em></button>`).join("")}</div><button id="lab-toggle" class="lab-toggle">Destruction lab <span>⚒</span></button>
<section id="lab" hidden><div class="eyebrow">SURGICAL DAMAGE TOOLS</div><label for="target">Target part</label><select id="target">${PARTS.map((p) => `<option value="${p.id}">${p.id}</option>`).join("")}</select><div class="tool-grid"><button id="dent">Dent panel</button><button id="destroy">Destroy part</button><button id="sever">Sever chassis</button><button id="restore">Restore truck</button></div><p>Each tool applies real damage. Detached pieces keep their momentum.</p></section></aside>
<div id="status"><span id="state-label">READY TO SEND IT</span><strong id="state-copy">Build speed. Hold your line.</strong><div id="run-progress" hidden></div><div class="progress"><i id="progress"></i></div></div>
<section id="telemetry"><div class="speed"><strong id="speed">000</strong><span>MPH</span></div><div class="stats"><span>INTEGRITY <b id="integrity">100%</b></span><span>RUN TIME <b id="time">0.00</b></span></div></section>
<footer><div class="controls"><span><kbd>W / UP</kbd> GAS</span><span><kbd>S / DOWN</kbd> BRAKE / REV</span><span><kbd>A/D / LEFT/RIGHT</kbd> <span id="steer-label">STEER</span></span><span><kbd>R</kbd> RESTART</span><span><kbd>L</kbd> LEVEL SELECT</span><span><kbd>SPACE</kbd> HANDBRAKE</span><span class="camera-hint">DRAG TO ORBIT CAMERA</span></div><label class="playback">SIMULATION <select id="rate" aria-label="Playback speed"><option value="1">1× REAL TIME</option><option value="4">4× FAST</option><option value="16">16× TEST SPEED</option></select></label></footer><div id="loading">Preparing the arena…</div>`;
async function boot() {
  // Navigation occupies the header, not the 3D viewport. Only lab tools use a drawer.
  const header = document.querySelector("header")!,
    panel = document.querySelector("aside")!;
  header.append(
    document.getElementById("routes")!,
    document.getElementById("lab-toggle")!,
  );
  panel.querySelectorAll(":scope > :not(#lab)").forEach((e) => e.remove());
  panel.id = "lab-panel";
  await initPhysics();
  const sim = new Simulation("easy"),
    lab = new DestructionLab(sim),
    view = new GameView(document.querySelector("#viewport")!, sim),
    clock = new FixedClock();
  view.applyQuality(loadSettings().video);
  const toggleDebug = await createDebugMenu(sim);
  document.querySelector(".camera-hint")!.textContent =
    "DRAG TO ORBIT · WHEEL TO ZOOM · ` TUNING";
  let rate = 1,
    paused = false;
  let surface: "menu" | "play" | "result" = "menu";
  let screens: ReturnType<typeof createLevelSelect>;
  let vehicleScreens: ReturnType<typeof createVehicleSelect>;
  let editorScreens: ReturnType<typeof createLevelEditor>;
  let settingsScreens: ReturnType<typeof createSettings>;
  function applyStoredVehicle() {
    try {
      sim.vehicleId = getVehicle(
        localStorage.getItem("vehicle") ?? "monster-truck",
      ).id;
    } catch {
      sim.vehicleId = "monster-truck";
    }
  }
  let recordedRun: Simulation["trackRun"];
  let resultStartedAt = 0;
  const scores = new BestTimes({
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  });
  header.insertAdjacentHTML(
    "beforeend",
    '<button id="level-select-button">Level select</button><button id="vehicle-select-button">Select vehicle</button><button id="level-editor-button">Level editor</button><button id="settings-button">Settings</button>',
  );
  const keys = new Set<string>();
  let cameraTrace: CameraSample[] = [],
    captureCamera = false;
  const cameraSample = (): CameraSample => ({
    ...view.inspectCamera(),
    state: sim.snapshot(),
  });
  const $ = (id: string) => document.getElementById(id)!;
  ($("target") as HTMLSelectElement).value = lab.selected;
  function select(stage: Stage) {
    surface = "play";
    exitEdit();
    screens?.hide();
    vehicleScreens?.hide();
    editorScreens?.hide();
    settingsScreens?.hide();
    recordedRun = undefined;
    applyStoredVehicle();
    sim.reset(stage);
    view.resetTruck();
    clock.reset();
    cameraTrace = [];
    keys.clear();
    $("lab").hidden = stage !== "lab";
    panel.hidden = stage !== "lab";
    $("routes").hidden = stage === "lab" || !!sim.courseTrack;
    document
      .querySelectorAll<HTMLButtonElement>("[data-stage]")
      .forEach((b) =>
        b.classList.toggle("selected", b.dataset.stage === stage),
      );
    $("lab-toggle").textContent =
      stage === "lab" ? "Back to stunt routes" : "Destruction lab";
    view.render();
    hud();
  }
  function startOfficial(
    id: TrackId | CustomTrackId,
    lane: "easy" | "medium" | "hard" = "easy",
    unpause = true,
    vehicle?: string,
  ) {
    if (vehicle) sim.vehicleId = getVehicle(vehicle).id;
    else applyStoredVehicle();
    sim.startTrack(id, lane);
    view.resetTruck();
    clock.reset();
    keys.clear();
    surface = "play";
    recordedRun = undefined;
    exitEdit();
    if (unpause) paused = false;
    screens?.hide();
    vehicleScreens?.hide();
    editorScreens?.hide();
    settingsScreens?.hide();
    $("lab").hidden = true;
    panel.hidden = true;
    $("routes").hidden = !getTrack(id).legacy;
    $("lab-toggle").textContent = "Destruction lab";
    document
      .querySelectorAll<HTMLElement>("[data-stage]")
      .forEach((b) =>
        b.classList.toggle("selected", b.dataset.stage === sim.stage),
      );
    view.render(true);
    hud();
  }
  function showLevelSelect() {
    surface = "menu";
    exitEdit();
    keys.clear();
    clock.reset();
    vehicleScreens?.hide();
    editorScreens?.hide();
    settingsScreens?.hide();
    screens.show();
    panel.hidden = true;
  }
  function showLevelEditor() {
    surface = "menu";
    exitEdit();
    keys.clear();
    clock.reset();
    screens.hide();
    vehicleScreens?.hide();
    settingsScreens?.hide();
    const live = sim.courseTrack?.custom;
    const probe = editorScreens.probe();
    if (live && shouldSyncFromSession(probe.dirty, probe.name, live.name))
      editorScreens.syncStore(live);
    editorScreens.show();
    panel.hidden = true;
  }
  function showVehicleSelect() {
    surface = "menu";
    exitEdit();
    keys.clear();
    clock.reset();
    screens.hide();
    editorScreens?.hide();
    settingsScreens?.hide();
    vehicleScreens.show();
    panel.hidden = true;
  }
  function showSettings() {
    surface = "menu";
    exitEdit();
    keys.clear();
    clock.reset();
    screens.hide();
    editorScreens?.hide();
    vehicleScreens?.hide();
    settingsScreens.show();
    panel.hidden = true;
  }
  function retryTrack() {
    const run = sim.trackRun;
    if (run)
      startOfficial(
        run.track.id,
        run.track.legacy ? (run.variant as "easy" | "medium" | "hard") : "easy",
        !paused,
      );
    else select(sim.stage);
  }
  function stepLevel(dir: 1 | -1) {
    const run = sim.trackRun;
    startOfficial(
      stepTrackId(run?.track.id, dir),
      run?.track.legacy ? (run.variant as "easy" | "medium" | "hard") : "easy",
      !paused,
    );
  }
  await registerStoredTracks();
  screens = createLevelSelect(
    app,
    scores,
    (id) => startOfficial(id),
    () => select("lab"),
    toggleDebug,
    retryTrack,
    showLevelSelect,
  );
  $("level-select-button").onclick = showLevelSelect;
  vehicleScreens = createVehicleSelect(
    app,
    (id) => {
      localStorage.setItem("vehicle", id);
      showLevelSelect();
    },
    showLevelSelect,
  );
  $("vehicle-select-button").onclick = showVehicleSelect;
  editorScreens = createLevelEditor(app, showLevelSelect, (id) =>
    startOfficial(id),
  );
  $("level-editor-button").onclick = showLevelEditor;
  settingsScreens = createSettings(
    app,
    (tier) => view.applyQuality(tier),
    showLevelSelect,
  );
  $("settings-button").onclick = showSettings;
  // In-game placement for custom levels: ghost brick, live commit, disk save.
  app.insertAdjacentHTML(
    "beforeend",
    `<div id="placement-bar" hidden>
      <button id="edit-toggle">Edit</button>
      <select id="place-kind" aria-label="Placement palette">
        <option value="brick">brick</option>
        <option value="wall">wall</option>
        <option value="checkpoint">checkpoint</option>
        <option value="book">book</option>
        <option value="snowman">snowman</option>
        <option value="hydrant">hydrant</option>
        <option value="select">select</option>
      </select>
      <select id="place-texture" aria-label="Brick texture"></select>
      <button id="sel-rotate" disabled>Rotate</button>
      <button id="sel-duplicate" disabled>Duplicate</button>
      <button id="sel-delete" disabled>Delete</button>
      <span id="place-status"></span>
    </div>`,
  );
  const placementBar = $("placement-bar");
  const editToggle = $("edit-toggle") as HTMLButtonElement;
  const placeKind = $("place-kind") as HTMLSelectElement;
  const placeTexture = $("place-texture") as HTMLSelectElement;
  const placeStatus = $("place-status");
  const selRotate = $("sel-rotate") as HTMLButtonElement;
  const selDuplicate = $("sel-duplicate") as HTMLButtonElement;
  const selDelete = $("sel-delete") as HTMLButtonElement;
  placeTexture.append(new Option("(brick texture)", ""));
  for (const id of TEXTURE_IDS) placeTexture.append(new Option(id, id));
  const ghost = new T.Group();
  const ghostBrick = new T.Mesh(
    new T.BoxGeometry(6, 1.6, 5),
    new T.MeshBasicMaterial({ color: 0xffe08a, wireframe: true }),
  );
  const ghostMark = new T.Mesh(
    new T.OctahedronGeometry(1.2),
    new T.MeshBasicMaterial({ color: 0xffe08a, wireframe: true }),
  );
  const ghostGate = new T.Mesh(
    new T.PlaneGeometry(24, 8),
    new T.MeshBasicMaterial({
      color: 0xffe08a,
      wireframe: true,
      side: T.DoubleSide,
    }),
  );
  ghost.add(ghostBrick, ghostMark, ghostGate);
  ghost.visible = false;
  const selBox = new T.Mesh(
    new T.BoxGeometry(1, 1, 1),
    new T.MeshBasicMaterial({ color: 0x7dffd4, wireframe: true }),
  );
  selBox.visible = false;
  let selectedId: string | null = null;
  let selectedKind: "solid" | "prefab" | "checkpoint" | null = null;
  const PREFAB_BOX: Record<string, [number, number, number]> = {
    snowman: [2.6, 3.4, 2.6],
    book: [4, 2.4, 5],
    hydrant: [1.6, 2.2, 1.6],
  };
  function selectedNode() {
    const track = sim.courseTrack;
    const level = track?.custom;
    if (!track || !level || !selectedId || !selectedKind) return null;
    if (selectedKind === "solid") {
      const solid = level.solids.find((s) => s.id === selectedId);
      return solid ? { kind: selectedKind, solid } : null;
    }
    if (selectedKind === "prefab") {
      const prefab = level.prefabs.find((p) => p.id === selectedId);
      return prefab ? { kind: selectedKind, prefab } : null;
    }
    const index = track.checkpoints.findIndex((g) => g.id === selectedId);
    if (index < 0) return null;
    return { kind: selectedKind, gate: track.checkpoints[index]!, index };
  }
  function refreshSelBox() {
    const node = selectedNode();
    if (!node) {
      selBox.visible = false;
    } else if (node.kind === "solid" && node.solid) {
      const solid = node.solid;
      selBox.visible = editing;
      selBox.position.set(solid.x, solid.y, solid.z);
      selBox.scale.set(solid.w, solid.h, solid.d);
      selBox.quaternion
        .setFromAxisAngle(new T.Vector3(1, 0, 0), solid.angle ?? 0)
        .multiply(
          new T.Quaternion().setFromAxisAngle(
            new T.Vector3(0, 1, 0),
            solid.yaw ?? 0,
          ),
        );
    } else if (node.kind === "prefab" && node.prefab) {
      const prefab = node.prefab;
      const box = PREFAB_BOX[prefab.kind] ?? [2, 2, 2];
      selBox.visible = editing;
      selBox.position.set(prefab.x, (prefab.y ?? 0) + box[1] / 2, prefab.z);
      selBox.scale.set(box[0], box[1], box[2]);
      selBox.quaternion.identity();
    } else if (node.kind === "checkpoint" && node.gate) {
      const gate = node.gate;
      selBox.visible = editing;
      selBox.position.set(gate.x, gate.y, gate.z);
      selBox.scale.set(gate.width, gate.height, 2);
      selBox.quaternion.setFromAxisAngle(
        new T.Vector3(0, 1, 0),
        Math.atan2(gate.nx, gate.nz),
      );
    }
    const on = editing && !!node;
    selRotate.disabled = !(on && node?.kind === "solid");
    selDuplicate.disabled = !on;
    selDelete.disabled = !on;
  }
  function selectSolid(
    id: string | null,
    kind: "solid" | "prefab" | "checkpoint" = "solid",
  ) {
    selectedId = id;
    selectedKind = id ? kind : null;
    refreshSelBox();
  }
  let editing = false;
  let resumePaused = false;
  const say = (message: string) => {
    placeStatus.textContent = message;
  };
  function updateGhost(point: T.Vector3 | null) {
    ghost.visible = editing && !!point && placeKind.value !== "select";
    if (!point) return;
    const wall = placeKind.value === "wall";
    ghostBrick.visible =
      placeKind.value === "brick" || wall;
    ghostMark.visible =
      placeKind.value !== "brick" &&
      !wall &&
      placeKind.value !== "checkpoint";
    ghostGate.visible = placeKind.value === "checkpoint";
    ghost.position.set(
      point.x,
      placeKind.value === "checkpoint" ? 2 : point.y,
      point.z,
    );
    ghostBrick.scale.set(wall ? 4 : 1, wall ? 1.875 : 1, wall ? 0.4 : 1);
    ghostBrick.position.y = wall ? 1.5 : 0.8;
    ghostMark.position.y = 1.5;
    ghostGate.position.y = 0;
  }
  function selectedSolid() {
    const track = sim.courseTrack;
    const level = track?.custom;
    const solid =
      selectedId && selectedKind === "solid" && level
        ? level.solids.find((s) => s.id === selectedId)
        : undefined;
    return track && level && solid ? { track, level, solid } : null;
  }
  function selectedPrefab() {
    const track = sim.courseTrack;
    const level = track?.custom;
    const prefab =
      selectedId && selectedKind === "prefab" && level
        ? level.prefabs.find((p) => p.id === selectedId)
        : undefined;
    return track && level && prefab ? { track, level, prefab } : null;
  }
  function selectedCheckpoint() {
    const track = sim.courseTrack;
    const level = track?.custom;
    const index =
      track && selectedId && selectedKind === "checkpoint"
        ? track.checkpoints.findIndex((g) => g.id === selectedId)
        : -1;
    return track && level && index >= 0 ? { track, level, index } : null;
  }
  /** Level-checkpoint gates come first; checkpoint prefabs follow. */
  function checkpointSource(level: CustomLevel, index: number) {
    if (index < level.checkpoints.length)
      return { type: "point" as const, index };
    const prefabs = level.prefabs.filter((p) => p.kind === "checkpoint");
    const prefab = prefabs[index - level.checkpoints.length];
    if (!prefab) throw new Error(`Unknown checkpoint index: ${index}`);
    return { type: "prefab" as const, prefab };
  }
  function liveAddPrefab(prefab: CustomPrefab) {
    if (prefab.kind === "snowman")
      sim.props.addProp({
        id: prefab.id,
        kind: "snowman",
        x: prefab.x,
        z: prefab.z,
        ground: prefab.y ?? 0,
      });
    else
      sim.comic.addHazard({
        id: prefab.id,
        kind: prefab.kind as "book" | "hydrant",
        x: prefab.x,
        z: prefab.z,
        phase: 0,
        ...(prefab.y === undefined ? {} : { y: prefab.y }),
      });
  }
  async function saveLiveEdit(next: CustomLevel) {
    const track = sim.courseTrack!;
    track.custom = validateCustomLevel(next);
    await saveLevel(undefined, track.custom);
    // saveLevel registers a fresh positional track; the live track keeps
    // stable ids, so re-register it as the in-session truth.
    registerCustomTrack(track);
    editorScreens.syncStore(track.custom);
  }
  async function moveSelected(point: T.Vector3) {
    const cpCtx = selectedCheckpoint();
    if (cpCtx) {
      try {
        const source = checkpointSource(cpCtx.level, cpCtx.index);
        const next =
          source.type === "point"
            ? moveCheckpointInLevel(
                cpCtx.level,
                source.index,
                point.x,
                cpCtx.level.checkpoints[source.index]?.y ?? 2,
                point.z,
              )
            : editPrefabInLevel(cpCtx.level, source.prefab.id, {
                x: point.x,
                z: point.z,
              });
        await saveLiveEdit(next);
        moveCheckpointOnTrack(cpCtx.track, cpCtx.index, point.x, point.z);
        view.moveCheckpointGate(
          cpCtx.index,
          cpCtx.track.checkpoints[cpCtx.index]!,
        );
        refreshSelBox();
        say(`Moved ${cpCtx.track.checkpoints[cpCtx.index]!.id}`);
      } catch (e) {
        say(e instanceof Error ? e.message : "Move failed");
      }
      return;
    }
    const prefabCtx = selectedPrefab();
    if (prefabCtx) {
      try {
        const y = Math.max(0, point.y);
        await saveLiveEdit(
          editPrefabInLevel(prefabCtx.level, prefabCtx.prefab.id, {
            x: point.x,
            y,
            z: point.z,
          }),
        );
        const updated = sim.courseTrack!.custom!.prefabs.find(
          (p) => p.id === prefabCtx.prefab.id,
        )!;
        if (updated.kind === "snowman")
          sim.props.moveProp(updated.id, updated.x, y, updated.z);
        else {
          const dx = updated.x - prefabCtx.prefab.x;
          const dy = y - (prefabCtx.prefab.y ?? 0);
          const dz = updated.z - prefabCtx.prefab.z;
          sim.comic.moveHazard(updated.id, updated.x, y, updated.z);
          view.moveComicModel(updated.id, dx, dy, dz);
        }
        refreshSelBox();
        say(`Moved ${prefabCtx.prefab.id}`);
      } catch (e) {
        say(e instanceof Error ? e.message : "Move failed");
      }
      return;
    }
    const ctx = selectedSolid();
    if (!ctx) return;
    try {
      await saveLiveEdit(
        editSolidInLevel(ctx.level, ctx.solid.id, {
          x: point.x,
          y: point.y + ctx.solid.h / 2,
          z: point.z,
        }),
      );
      const updated = sim.courseTrack!.custom!.solids.find(
        (s) => s.id === ctx.solid.id,
      )!;
      sim.updateSolidCollider(updated);
      view.moveCourseSolid(updated.id, updated.x, updated.y, updated.z);
      refreshSelBox();
      say(`Moved ${ctx.solid.id}`);
    } catch (e) {
      say(e instanceof Error ? e.message : "Move failed");
    }
  }
  async function rotateSelected() {
    const ctx = selectedSolid();
    if (!ctx) return;
    try {
      const yaw = (ctx.solid.yaw ?? 0) + Math.PI / 4;
      await saveLiveEdit(editSolidInLevel(ctx.level, ctx.solid.id, { yaw }));
      const updated = sim.courseTrack!.custom!.solids.find(
        (s) => s.id === ctx.solid.id,
      )!;
      sim.updateSolidCollider(updated);
      view.rotateCourseSolid(updated.id, yaw, updated.angle ?? 0);
      refreshSelBox();
      say(`Rotated ${ctx.solid.id} to ${Math.round((yaw * 180) / Math.PI)}°`);
    } catch (e) {
      say(e instanceof Error ? e.message : "Rotate failed");
    }
  }
  async function deleteSelected() {
    const cpCtx = selectedCheckpoint();
    if (cpCtx) {
      try {
        const source = checkpointSource(cpCtx.level, cpCtx.index);
        const id = cpCtx.track.checkpoints[cpCtx.index]!.id;
        const next =
          source.type === "point"
            ? deleteCheckpointInLevel(cpCtx.level, source.index)
            : deletePrefabInLevel(cpCtx.level, source.prefab.id);
        await saveLiveEdit(next);
        deleteCheckpointOnTrack(cpCtx.track, cpCtx.index);
        view.rebuildCheckpointGates();
        const run = sim.trackRun;
        if (run) {
          if (cpCtx.index < run.checkpoint) run.checkpoint--;
          run.checkpoint = Math.min(
            run.checkpoint,
            Math.max(0, cpCtx.track.checkpoints.length - 1),
          );
        }
        selectSolid(null);
        say(`Deleted ${id}`);
      } catch (e) {
        say(e instanceof Error ? e.message : "Delete failed");
      }
      return;
    }
    const prefabCtx = selectedPrefab();
    if (prefabCtx) {
      try {
        await saveLiveEdit(
          deletePrefabInLevel(prefabCtx.level, prefabCtx.prefab.id),
        );
        if (prefabCtx.prefab.kind === "snowman") {
          sim.props.removeProp(prefabCtx.prefab.id);
          view.removePropModel(prefabCtx.prefab.id);
        } else {
          sim.comic.removeHazard(prefabCtx.prefab.id);
          view.removeComicModel(prefabCtx.prefab.id);
        }
        selectSolid(null);
        say(`Deleted ${prefabCtx.prefab.id}`);
      } catch (e) {
        say(e instanceof Error ? e.message : "Delete failed");
      }
      return;
    }
    const ctx = selectedSolid();
    if (!ctx) return;
    try {
      await saveLiveEdit(deleteSolidInLevel(ctx.level, ctx.solid.id));
      sim.removeSolidCollider(ctx.solid.id);
      view.removeCourseSolid(ctx.solid.id);
      selectSolid(null);
      say(`Deleted ${ctx.solid.id}`);
    } catch (e) {
      say(e instanceof Error ? e.message : "Delete failed");
    }
  }
  async function duplicateSelected() {
    const cpCtx = selectedCheckpoint();
    if (cpCtx) {
      try {
        const source = checkpointSource(cpCtx.level, cpCtx.index);
        const id = cpCtx.track.checkpoints[cpCtx.index]!.id;
        const next =
          source.type === "point"
            ? duplicateCheckpointInLevel(cpCtx.level, source.index)
            : duplicatePrefabInLevel(cpCtx.level, source.prefab.id);
        if (source.type === "prefab") {
          const prefs = next.prefabs;
          const copy = prefs.pop()!;
          const at = prefs.findIndex((p) => p.id === source.prefab.id);
          prefs.splice(at + 1, 0, copy);
        }
        await saveLiveEdit(next);
        const gate = duplicateCheckpointOnTrack(cpCtx.track, cpCtx.index);
        view.rebuildCheckpointGates();
        selectSolid(gate.id, "checkpoint");
        say(`Duplicated ${id} → ${gate.id}`);
      } catch (e) {
        say(e instanceof Error ? e.message : "Duplicate failed");
      }
      return;
    }
    const prefabCtx = selectedPrefab();
    if (prefabCtx) {
      try {
        await saveLiveEdit(
          duplicatePrefabInLevel(prefabCtx.level, prefabCtx.prefab.id),
        );
        const copy = sim.courseTrack!.custom!.prefabs.at(-1)!;
        liveAddPrefab(copy);
        selectSolid(copy.id, "prefab");
        say(`Duplicated ${prefabCtx.prefab.id} → ${copy.id}`);
      } catch (e) {
        say(e instanceof Error ? e.message : "Duplicate failed");
      }
      return;
    }
    const ctx = selectedSolid();
    if (!ctx) return;
    try {
      await saveLiveEdit(duplicateSolidInLevel(ctx.level, ctx.solid.id));
      const copy = sim.courseTrack!.custom!.solids.at(-1)!;
      sim.addCustomSolid(copy);
      view.addCourseSolid(copy);
      selectSolid(copy.id);
      say(`Duplicated ${ctx.solid.id} → ${copy.id}`);
    } catch (e) {
      say(e instanceof Error ? e.message : "Duplicate failed");
    }
  }
  async function retextureSelected(texture: string) {
    const ctx = selectedSolid();
    if (!ctx) return;
    try {
      await saveLiveEdit(
        editSolidInLevel(ctx.level, ctx.solid.id, { texture }),
      );
      const updated = sim.courseTrack!.custom!.solids.find(
        (s) => s.id === ctx.solid.id,
      )!;
      view.retextureCourseSolid(updated);
      say(`Retextured ${ctx.solid.id} → ${texture}`);
    } catch (e) {
      say(e instanceof Error ? e.message : "Retexture failed");
    }
  }
  async function handleSelectClick(
    clientX: number,
    clientY: number,
    point: T.Vector3 | null,
  ) {
    const track = sim.courseTrack;
    const level = track?.custom;
    const picked = view.pickCourseSolid(clientX, clientY);
    const solid = picked
      ? level?.solids.find((s) => s.id === picked)
      : undefined;
    const prefab =
      !solid && picked
        ? level?.prefabs.find((p) => p.id === picked)
        : undefined;
    const gate =
      picked?.startsWith("checkpoint-") && track
        ? track.checkpoints.find(
            (g) => g.id === picked.slice("checkpoint-".length),
          )
        : undefined;
    const node = gate
      ? { kind: "checkpoint" as const, id: gate.id }
      : solid && solid.kind !== "ground" && solid.kind !== "road"
        ? { kind: "solid" as const, id: solid.id }
        : prefab
          ? { kind: "prefab" as const, id: prefab.id }
          : null;
    if (node) {
      if (node.id === selectedId) {
        selectSolid(null);
        say("Deselected");
      } else {
        selectSolid(node.id, node.kind);
        say(`Selected ${node.id}`);
      }
    } else if (selectedId && point) {
      await moveSelected(point);
    } else {
      selectSolid(null);
    }
  }
  async function commitPlacement(point: T.Vector3) {
    if (placeKind.value === "select") return;
    const track = sim.courseTrack;
    const level = track?.custom;
    if (!track || !level) return;
    try {
      if (placeKind.value === "brick" || placeKind.value === "wall") {
        const wall = placeKind.value === "wall";
        const next = placeInLevel(level, {
          type: "solid",
          kind: "barrier",
          x: point.x,
          z: point.z,
          y: point.y + (wall ? 1.5 : 0.8),
          ...(wall ? { w: 24, h: 3, d: 2 } : {}),
          texture: placeTexture.value || undefined,
        });
        track.custom = validateCustomLevel(next);
        await saveLevel(undefined, track.custom);
        editorScreens.syncStore(track.custom);
        const solid = track.custom.solids.at(-1)!;
        sim.addCustomSolid(solid);
        view.addCourseSolid(solid);
        say(`${wall ? "Wall" : "Brick"} saved (${solid.id})`);
      } else if (placeKind.value === "checkpoint") {
        const next = placeInLevel(level, {
          type: "checkpoint",
          x: point.x,
          z: point.z,
        });
        track.custom = validateCustomLevel(next);
        await saveLevel(undefined, track.custom);
        editorScreens.syncStore(track.custom);
        const gate = appendCheckpoint(track, point.x, point.z);
        view.addCheckpointGate(gate);
        say(`Checkpoint gate ${track.checkpoints.length} saved`);
      } else {
        const kind = placeKind.value;
        const next = placeInLevel(level, {
          type: "prefab",
          kind,
          x: point.x,
          z: point.z,
          y: Math.max(0, point.y),
        });
        track.custom = validateCustomLevel(next);
        await saveLevel(undefined, track.custom);
        editorScreens.syncStore(track.custom);
        const prefab = track.custom.prefabs.at(-1)!;
        liveAddPrefab(prefab);
        say(`${kind} saved (${prefab.id})`);
      }
    } catch (e) {
      say(e instanceof Error ? e.message : "Placement failed");
    }
  }
  function enterEdit() {
    if (editing || surface !== "play" || !sim.courseTrack?.custom) return;
    editing = true;
    resumePaused = paused;
    paused = true;
    keys.clear();
    view.scene.add(ghost);
    view.scene.add(selBox);
    refreshSelBox();
    editToggle.textContent = "Done";
    say("Click the course to place · Esc exits");
  }
  function exitEdit() {
    if (!editing) return;
    editing = false;
    paused = resumePaused;
    view.scene.remove(ghost);
    view.scene.remove(selBox);
    selectSolid(null);
    ghost.visible = false;
    editToggle.textContent = "Edit";
    say("");
  }
  editToggle.onclick = () => (editing ? exitEdit() : enterEdit());
  selRotate.onclick = () => void rotateSelected();
  selDuplicate.onclick = () => void duplicateSelected();
  selDelete.onclick = () => void deleteSelected();
  placeTexture.addEventListener("change", () => {
    if (editing && selectedId && placeTexture.value)
      void retextureSelected(placeTexture.value);
  });
  let downAt: [number, number] | null = null;
  view.renderer.domElement.addEventListener("pointermove", (e) => {
    if (!editing) return;
    updateGhost(view.aimPoint(e.clientX, e.clientY));
  });
  view.renderer.domElement.addEventListener("pointerdown", (e) => {
    downAt = [e.clientX, e.clientY];
  });
  view.renderer.domElement.addEventListener("pointerup", (e) => {
    if (!editing || !downAt) return;
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
    downAt = null;
    if (moved > 6) return;
    const point = view.aimPoint(e.clientX, e.clientY);
    if (placeKind.value === "select") {
      void handleSelectClick(e.clientX, e.clientY, point);
      return;
    }
    if (point) void commitPlacement(point);
  });
  function hud() {
    placementBar.hidden = !(
      surface === "play" && !!sim.courseTrack?.custom
    );
    const s = sim.snapshot(false),
      r = ROUTES.find((r) => r.id === s.stage);
    $("speed").textContent = Math.round(s.speed * 3.6)
      .toString()
      .padStart(3, "0");
    $("time").textContent = (s.run?.elapsed ?? s.time).toFixed(2);
    $("integrity").textContent =
      `${Math.round(([...sim.parts.values()].reduce((a, p) => a + p.health, 0) / sim.partDefs.reduce((a, p) => a + p.hp, 0)) * 100)}%`;
    $("state-label").textContent =
      s.stage === "lab"
        ? "DESTRUCTION LAB"
        : s.status === "finished"
          ? "CLEAN LANDING"
          : s.status === "wrecked"
            ? "TRUCK DOWN"
            : s.position.z > 10 && !s.landed
              ? "COMMIT TO THE FLIGHT"
              : "READY TO SEND IT";
    $("state-copy").textContent =
      s.stage === "lab"
        ? "Pick a part. Find its breaking point."
        : s.status === "finished"
          ? "Jump cleared. Try a harder line."
          : s.status === "wrecked"
            ? "Press R to rebuild and run again."
            : s.landed
              ? "Stay straight. Cross the finish."
              : "Build speed. Hold your line.";
    $("progress").style.width =
      `${r ? Math.max(0, Math.min(100, ((s.position.z + 65) / (r.finish + 65)) * 100)) : 0}%`;
    if (s.stage !== "lab" && s.status === "finished") {
      if (s.loopCompleted) {
        $("state-label").textContent = "LOOP CLEARED";
        $("state-copy").textContent =
          "Full circle. Keep rolling or press R to run again.";
      } else if (s.position.z > 245 || s.position.y > 10) {
        $("state-label").textContent = "DRAGON LOOP";
        $("state-copy").textContent =
          "Hold gas. Follow the track as it curves sideways.";
      } else if (s.position.z > 130) {
        $("state-label").textContent = s.dragonFiring
          ? "DRAGONS FIRING"
          : "DRAGON PASS CLEAR";
        const phase = s.time % 8;
        $("state-copy").textContent = s.dragonFiring
          ? `Jets stop in ${(3.25 - phase).toFixed(1)}s. Time your boost approach.`
          : `Jets restart in ${(8 - phase).toFixed(1)}s. Boost toward the loop.`;
      } else
        $("state-copy").textContent =
          "Jump cleared. Keep going for the dragon loop.";
    }
    $("run-progress").hidden = !s.run;
    if (s.run) {
      const track = getTrack(s.run.trackId);
      $("state-label").textContent = track.name.toUpperCase();
      $("state-copy").textContent = objectiveCopy(track);
      $("steer-label").textContent =
        track.controls === "strafe" && s.slide.flowing ? "STRAFE" : "STEER";
      if (s.comic.effect)
        $("state-copy").textContent =
          `${s.comic.effect.toUpperCase()} POTION · ${s.comic.remaining.toFixed(1)}s · Mixing active potions is lethal`;
      $("run-progress").textContent = progressCopy(track, s.run);
      $("progress").style.width = `${progressFraction(track, s.run) * 100}%`;
      if (
        surface === "play" &&
        s.run.status !== "running" &&
        recordedRun !== sim.trackRun
      ) {
        recordedRun = sim.trackRun;
        const pb = scores.record(s.run);
        surface = "result";
        resultStartedAt = sim.time;
        keys.clear();
        screens.showResult(s.run, pb);
        if (s.run.status === "failed") screens.reveal(0);
      }
    }
    if (surface === "result" && s.run?.status === "failed")
      screens.reveal(resultOpacity(sim.time - resultStartedAt));
  }
  document
    .querySelectorAll<HTMLButtonElement>("[data-stage]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          sim.trackRun?.track.legacy
            ? startOfficial(
                "triple-loop",
                b.dataset.stage as "easy" | "medium" | "hard",
              )
            : select(b.dataset.stage as Stage)),
    );
  $("lab-toggle").onclick = () =>
    sim.stage === "lab" ? showLevelSelect() : select("lab");
  ($("target") as HTMLSelectElement).onchange = (e) =>
    lab.select((e.target as HTMLSelectElement).value);
  for (const [id, tool] of [
    ["dent", "dent"],
    ["destroy", "destroy"],
    ["sever", "sever"],
  ] as const)
    $(id).onclick = () => {
      lab.use(tool);
      view.render();
      hud();
    };
  $("restore").onclick = () => select("lab");
  ($("rate") as HTMLSelectElement).onchange = (e) => {
    rate = Number((e.target as HTMLSelectElement).value);
    (e.target as HTMLSelectElement).blur();
  };
  window.addEventListener("keydown", (e) => {
    if (e.code === "Backquote") {
      e.preventDefault();
      if (!e.repeat) toggleDebug();
      return;
    }
    if (e.key === "Escape" && editing) {
      e.preventDefault();
      exitEdit();
      return;
    }
    if (
      e.target instanceof HTMLSelectElement ||
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    const k = e.key.toLowerCase();
    if (k === "l") {
      e.preventDefault();
      if (!e.repeat) showLevelSelect();
      return;
    }
    if (k === "r" && surface !== "menu") {
      e.preventDefault();
      if (!e.repeat) retryTrack();
      return;
    }
    if ((k === "n" || k === "p") && surface !== "menu") {
      e.preventDefault();
      if (!e.repeat) stepLevel(k === "n" ? 1 : -1);
      return;
    }
    // Let menu/result buttons keep native Space/Enter activation.
    if (surface !== "play") return;
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        " ",
      ].includes(k)
    )
      e.preventDefault();
    keys.add(k);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());
  const input = (): Input =>
    drivingInput(keys, sim.snapshot(false).signedSpeed);
  if (import.meta.env.DEV)
    window.__game = {
      select,
      startTrack: (id, lane, vehicle?) =>
        startOfficial(id, lane, false, vehicle),
      track: (id) => getTrack(id),
      customLevels: {
        list: () => listLevels(),
        save: (level: CustomLevel) => saveLevel(undefined, level),
        load: (name: string) => loadLevel(undefined, name),
        remove: (name: string) => removeLevel(undefined, name),
      },
      editor: () => editorScreens.probe(),
      editorProject: (point: { x: number; y: number; z: number }) =>
        editorScreens.projectViewport(point),
      placement: () => ({
        editing,
        palette: placeKind.value,
        texture: placeTexture.value,
        selected: selectedId,
        selectedKind,
        checkpoints:
          sim.courseTrack?.checkpoints.map((g) => ({
            id: g.id,
            x: g.x,
            y: g.y,
            z: g.z,
          })) ?? [],
        checkpointLabels: view.checkpointGateLabels(),
        runCheckpoint: sim.trackRun?.checkpoint ?? null,
      }),
      project: (point: { x: number; y: number; z: number }) => {
        const v = new T.Vector3(point.x, point.y, point.z).project(
          view.camera,
        );
        const rect = view.renderer.domElement.getBoundingClientRect();
        return {
          x: rect.left + ((v.x + 1) / 2) * rect.width,
          y: rect.top + ((1 - v.y) / 2) * rect.height,
        };
      },
      pause: (v) => (paused = v),
      advanceFrames: (frames, r, i) => {
        for (let f = 0; f < frames; f++) {
          clock.advance(1 / 60, r, () =>
            sim.step(surface === "result" ? {} : (i ?? input())),
          );
          hud();
        }
        view.render(true);
        hud();
      },
      snapshot: () => sim.snapshot(),
      setTuning: (values) => sim.setTuning(values),
      driveFrames: (frames, r, driver, draw = true) => {
        for (let f = 0; f < frames; f++) {
          clock.advance(1 / 60, r, () => sim.step(driver(sim.snapshot(false))));
          view.render(false, clock.alpha, false);
        }
        if (draw) view.render(false, clock.alpha);
        hud();
      },
      vehiclePreview: () => view.vehiclePreview(),
      camera: () => view.inspectCamera(),
      burnoutOverview: (focus) => view.burnoutOverview(focus),
      lavaOverview: () => view.lavaOverview(),
      hazardOverview: (id) => view.hazardOverview(id),
      setVelocity: (velocity) => sim.body.setLinvel(velocity, true),
      basinProbe: (angle) => view.basinProbe(angle),
      dropPartInLava: (id) => {
        const def = PARTS.find((p) => p.id === id);
        if (!def) throw new Error("Unknown part");
        sim.damage(id, 10000);
        const body = sim.parts.get(id)!.body!;
        // Center of the easy pool, clear of gantries and rims. Start above the
        // surface so tests exercise actual gravity/contact before viscous sinking.
        body.setTranslation(
          { x: ROUTES[0].x, y: -3, z: (ROUTES[0].gapEnd + 12) / 2 },
          true,
        );
        body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        view.render(true);
      },
      environmentProbe: () => view.environmentProbe(),
      signs: () => view.inspectSigns(),
      traceFrames: (frames, r, i) => {
        const samples: CameraSample[] = [];
        for (let f = 0; f < frames; f++) {
          clock.advance(1 / 60, r, () => sim.step(i));
          view.render(false, clock.alpha, false);
          samples.push(cameraSample());
        }
        view.render(false, clock.alpha);
        hud();
        return samples;
      },
      startCameraTrace: () => {
        cameraTrace = [];
        captureCamera = true;
      },
      stopCameraTrace: () => {
        captureCamera = false;
        return cameraTrace;
      },
      place: (position, yaw) => {
        sim.body.setTranslation(position, true);
        sim.body.setRotation(
          { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) },
          true,
        );
        sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        sim.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        sim.previousPosition.copy(sim.body.translation());
        sim.previousRotation.copy(sim.body.rotation());
        view.render(true);
      },
      stats: () => view.stats(),
      visualPart: (id) => {
        const m = view.meshes.get(id);
        return {
          detached: !!m?.userData.detached,
          lavaScorch: sim.parts.get(id)?.lava?.scorch ?? 0,
          visible: !!m?.visible,
          vertices: m
            ? Array.from(
                (m.children[0] as import("three").Mesh).geometry.attributes
                  .position.array,
              ).reduce((a, b) => a + b, 0)
            : 0,
        };
      },
    };
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.max(0, (now - last) / 1000);
    last = now;
    if (
      !paused &&
      (surface === "play" ||
        (surface === "result" && sim.trackRun?.status === "failed"))
    )
      clock.advance(dt, rate, () =>
        sim.step(surface === "result" ? {} : input()),
      );
    view.render(false, clock.alpha);
    if (captureCamera && cameraTrace.length < 2000)
      cameraTrace.push(cameraSample());
    hud();
    requestAnimationFrame(frame);
  }
  select("easy");
  showLevelSelect();
  $("loading").remove();
  requestAnimationFrame(frame);
}
boot().catch((e) => {
  document.getElementById("loading")!.textContent =
    `Unable to start: ${e.message}`;
  console.error(e);
});
