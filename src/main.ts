import { confettiDelta } from "./confetti";
import { resultOpacity } from "./result-reveal";
import { createLevelSelect } from "./level-select";
import { createVehicleSelect } from "./vehicle-select";
import { createPaintShop } from "./paint-shop";
import { createLevelEditor } from "./level-editor";
import { shouldSyncFromSession } from "./editor-state";
import { createSettings } from "./settings-screen";
import { loadSettings, type InputDevice } from "./settings";
import { isPermanentNight, levelWeather, randomWeather } from "./weather";
import { loadedTextureIds, textureLoadErrors } from "./materials";
import * as T from "three";
import { getVehicle } from "./vehicles";
import { BestTimes } from "./best-times";
import { GoldStars } from "./gold-stars";
import {
  getTrack,
  type CustomTrackId,
  type TrackId,
} from "./tracks";
import { stepUnlockedTrackId } from "./official-levels";
import { LEVEL_COLLECTIONS, collectionForTrack } from "./level-collections";
import { UnlockSeen, isDreamUnlocked, unlockedIds } from "./level-unlocks";
import { dreamCarForCollection, isDreamCarUnlocked } from "./dream-cars";
import {
  isXRSupported,
  mergePadStates,
  startVRSession,
  xrControllers,
  xrDrivingInput,
  xrMenuPad,
} from "./xr";
import {
  listLevels,
  saveLevel,
  loadLevel,
  removeLevel,
  registerStoredTracks,
} from "./level-store";
import type { CustomLevel } from "./custom-level";
import "./style.css";
import { Simulation, initPhysics, type Stage, type Input } from "./simulation";
import { FixedClock } from "./clock";
import { ROUTES } from "./routes";
import { PARTS } from "./damage";
import { DestructionLab } from "./lab";
import { GameView } from "./view";
import "./harness";
import type { CameraSample } from "./harness";
import { combineDrivingInput, drivingInput } from "./controls";
import {
  PAD_LOOK_PX_PER_SEC,
  padDriving,
  padLook,
  padStartPressed,
  pollPad,
} from "./gamepad";
import { createPauseMenu } from "./pause-menu";
import { proController } from "./switch-pro";
import { ControllerMenuInput, activeControllerMenu, moveMenuFocus, activateMenuFocus } from "./controller-menu";
import { formatDelta, hudBestCopy, objectiveCopy, progressCopy, progressFraction } from "./run-copy";
import { isStarRelocated } from "./gold-star-migrations";

import { createDebugMenu } from "./debug-menu";
import { allowLockedContent } from "./debug-access";
import { createLevelHUD } from "./level-hud";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<div id="viewport"></div><header><a class="brand" href="/">IRON<span>FLIGHT</span><i>STUNT MOTORSPORT</i></a><div class="series">MONSTER TRUCK STUNT SERIES <b>VOL. 01</b></div><span class="online">● SINGLE PLAYER</span></header>
<aside><div class="eyebrow">THE ARENA IS YOURS</div><h1>BIG TRUCK.<br>BAD IDEAS.</h1><p class="intro">Three ways across. One way to find out.</p><div id="routes">${ROUTES.map((r) => `<button class="route" data-stage="${r.id}" style="--route:#${r.color.toString(16)}"><small>${r.difficulty}</small><strong>${r.name}<span>↗</span></strong><em>${r.gapEnd - 12}m gap <span>·</span> ${r.hazards} hazard${r.hazards > 1 ? "s" : ""}</em></button>`).join("")}</div>
<section id="lab" hidden><div class="eyebrow">SURGICAL DAMAGE TOOLS</div><label for="target">Target part</label><select id="target">${PARTS.map((p) => `<option value="${p.id}">${p.id}</option>`).join("")}</select><div class="tool-grid"><button id="dent">Dent panel</button><button id="destroy">Destroy part</button><button id="sever">Sever chassis</button><button id="restore">Restore truck</button></div><p>Each tool applies real damage. Detached pieces keep their momentum.</p></section></aside>
<div id="status"><span id="state-label">READY TO SEND IT</span><strong id="state-copy">Build speed. Hold your line.</strong><div id="run-progress" hidden></div><span id="wings-badge" class="weather-badge" hidden>WINGS</span><div class="progress"><i id="progress"></i></div></div>
<section id="telemetry"><div class="speed"><strong id="speed">000</strong><span>MPH</span></div><div class="stats"><span>INTEGRITY <b id="integrity">100%</b></span><span>RUN TIME <b id="time">0.00</b></span><span id="hud-best-row" hidden>BEST <b id="hud-best-time">—</b></span><span id="hud-medal-row" hidden>MEDAL <b id="hud-best-medal">UNRANKED</b></span><span id="hud-star-row" hidden>STAR <span class="star-row" id="hud-stars"></span></span><span id="hud-lives-row" hidden>LIVES <b id="hud-lives">1</b></span></div></section>
<div id="checkpoint-banner" hidden><strong>CHECKPOINT!</strong><span id="checkpoint-delta" hidden></span></div><canvas id="confetti" hidden></canvas>
<footer><div class="controls"><span><kbd>W / UP</kbd> GAS</span><span><kbd>S / DOWN</kbd> BRAKE / REV</span><span><kbd>A/D / LEFT/RIGHT</kbd> <span id="steer-label">STEER</span></span><span><kbd>R</kbd> RESTART</span><span><kbd>L</kbd> LEVEL SELECT</span><span><kbd>SPACE</kbd> <span id="handbrake-label">HANDBRAKE</span></span><span class="camera-hint">DRAG TO ORBIT CAMERA</span></div><label class="playback">SIMULATION <select id="rate" aria-label="Playback speed"><option value="1">1× REAL TIME</option><option value="4">4× FAST</option><option value="16">16× TEST SPEED</option></select></label></footer><div id="loading">Preparing the arena…</div>`;
async function boot() {
  // Navigation occupies the header, not the 3D viewport. Only lab tools use a drawer.
  const header = document.querySelector("header")!,
    panel = document.querySelector("aside")!;
  header.append(document.getElementById("routes")!);
  panel.querySelectorAll(":scope > :not(#lab)").forEach((e) => e.remove());
  panel.id = "lab-panel";
  await initPhysics();
  const sim = new Simulation("easy"),
    lab = new DestructionLab(sim),
    view = new GameView(document.querySelector("#viewport")!, sim),
    clock = new FixedClock();
  view.applyQuality(loadSettings().video);
  {
    const stored = loadSettings();
    sim.weather = { night: stored.night, rain: stored.rain };
  }
  const { toggleDebug, toggleGhosts } = await createDebugMenu(sim);
  document.querySelector(".camera-hint")!.textContent =
    "DRAG TO ORBIT · WHEEL TO ZOOM · ` TUNING";
  let rate = 1,
    paused = false;
  let surface: "menu" | "play" | "result" = "menu";
  let screens: ReturnType<typeof createLevelSelect>;
  let vehicleScreens: ReturnType<typeof createVehicleSelect>;
  let paintScreens: ReturnType<typeof createPaintShop>;
  let editorScreens: ReturnType<typeof createLevelEditor>;
  let settingsScreens: ReturnType<typeof createSettings>;
  let pauseScreens: ReturnType<typeof createPauseMenu>;
  let inputMode: InputDevice = "keyboard";
  let controllerForeground: boolean | undefined;
  function syncControllerForeground() {
    inputMode = loadSettings().input;
    const active = inputMode === "controller" && document.hasFocus() && document.visibilityState !== "hidden";
    controllerForeground = active;
    void proController.setForeground(active);
  }
  window.addEventListener("focus", syncControllerForeground);
  window.addEventListener("blur", syncControllerForeground);
  document.addEventListener("visibilitychange", syncControllerForeground);
  window.addEventListener("pagehide", () => { void proController.disconnect(); });
  let pauseResumePaused = false;
  let padStartWas = false;
  const controllerMenuInput = new ControllerMenuInput();
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
  let bannerRun: Simulation["trackRun"];
  let bannerCheckpoint = 0;
  let bannerLives = 0;
  let bannerFiredAt = 0;
  let bannerUntil = 0;
  let starRun: Simulation["trackRun"];
  let starSeen = 0;
  let dreamLockedThisRun = false;
  let dreamCarLockedThisRun: string | null = null;
  let xrSupported = false;
  let xrPauseWas = false;
  let xrExitAt: number | null = null;
  let hudStarSig = "";
  const scores = new BestTimes({
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  });
  const starBank = new GoldStars({
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  });
  const levelHUD = createLevelHUD(app, scores, starBank);
  const unlockSeen = new UnlockSeen({
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  });
  const unlockedSet = () =>
    new Set(
      LEVEL_COLLECTIONS.flatMap((c) =>
        allowLockedContent() ? c.trackIds : unlockedIds(c, scores, starBank),
      ),
    );
  header.insertAdjacentHTML(
    "beforeend",
    `<span id="weather-night" class="weather-badge" hidden>NIGHT</span><span id="weather-rain" class="weather-badge" hidden>RAIN</span>
    <button id="level-select-button" class="header-action"><img src="/icons/level-select.png" width="24" height="24" alt=""><span>Select level</span></button>
    <button id="vehicle-select-button" class="header-action"><img src="/icons/select-vehicle.png" width="24" height="24" alt=""><span>Select vehicle</span></button>
    <button id="level-editor-button" class="header-action"><img src="/icons/level-editor.png" width="24" height="24" alt=""><span>Level editor</span></button>
    <button id="settings-button" class="header-action"><img src="/icons/settings.png" width="24" height="24" alt=""><span>Settings</span></button>`,
  );
  // Immersive-vr entry: hidden unless the browser reports support, and only
  // offered on the play surface (menus stay 2D; the headset is for driving).
  app.insertAdjacentHTML(
    "beforeend",
    `<button id="vr-button" hidden>ENTER VR</button>`,
  );
  const vrButton = document.getElementById(
    "vr-button",
  ) as HTMLButtonElement;
  vrButton.onclick = async () => {
    try {
      const session = view.renderer.xr.getSession() as unknown as {
        end(): unknown;
      } | null;
      if (session) await session.end();
      else {
        view.xrChase.reset();
        await startVRSession(view.renderer);
      }
    } catch (e) {
      console.warn("VR session failed to start", e);
    }
  };
  view.renderer.xr.addEventListener("sessionstart", () => {
    view.enterXR();
    view.xrHud.group.visible = true;
    vrButton.textContent = "EXIT VR";
  });
  view.renderer.xr.addEventListener("sessionend", () => {
    view.exitXR();
    view.xrHud.group.visible = false;
    vrButton.textContent = "ENTER VR";
    xrExitAt = null;
  });
  void isXRSupported().then((supported) => {
    xrSupported = supported;
  });
  const keys = new Set<string>();
  let cameraTrace: CameraSample[] = [],
    captureCamera = false;
  const cameraSample = (): CameraSample => ({
    ...view.inspectCamera(),
    state: sim.snapshot(),
  });
  const $ = (id: string) => document.getElementById(id)!;
  ($("target") as HTMLSelectElement).value = lab.selected;
  function paintWeatherBadges() {
    document.getElementById("weather-night")!.hidden = !sim.weather.night;
    document.getElementById("weather-rain")!.hidden = !sim.weather.rain;
  }
  /** Stored flags (or a fresh roll when randomized) for the incoming track. */
  function applyLevelWeather(backgroundTemplate?: string, forceNight?: boolean) {
    const stored = loadSettings();
    sim.weather = levelWeather(stored, stored.randomizeAtmosphere, randomWeather(), backgroundTemplate, forceNight);
    paintWeatherBadges();
  }
  function openPause() {
    if (pauseScreens.isVisible()) return;
    pauseResumePaused = paused;
    paused = true;
    keys.clear();
    pauseScreens.show();
  }
  function closePause() {
    if (!pauseScreens?.isVisible()) return;
    pauseScreens.hide();
    paused = pauseResumePaused;
  }
  function select(stage: Stage) {
    surface = "play";
    closePause();
    screens?.hide();
    vehicleScreens?.hide();
    paintScreens?.hide();
    editorScreens?.hide();
    settingsScreens?.hide();
    recordedRun = undefined;
    applyStoredVehicle();
    applyLevelWeather(
      ["lab", "easy", "medium", "hard"].includes(stage)
        ? undefined
        : getTrack(stage as CustomTrackId).backgroundTemplate,
      ["lab", "easy", "medium", "hard"].includes(stage) ? undefined : getTrack(stage as CustomTrackId).custom?.forceNight,
    );
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
    closePause();
    applyLevelWeather(getTrack(id).backgroundTemplate, getTrack(id).custom?.forceNight);
    sim.startTrack(id, lane);
    view.resetTruck();
    clock.reset();
    keys.clear();
    surface = "play";
    recordedRun = undefined;
    if (unpause) paused = false;
    screens?.hide();
    vehicleScreens?.hide();
    paintScreens?.hide();
    editorScreens?.hide();
    settingsScreens?.hide();
    $("lab").hidden = true;
    panel.hidden = true;
    $("routes").hidden = !getTrack(id).legacy;
    document
      .querySelectorAll<HTMLElement>("[data-stage]")
      .forEach((b) =>
        b.classList.toggle("selected", b.dataset.stage === sim.stage),
      );
    view.render(true);
    hud();
  }
  /** Menus show stored Settings weather: forced track atmospheres (mystic night) end at the menu. */
  function restoreMenuWeather() {
    const stored = loadSettings();
    sim.weather = { night: stored.night, rain: stored.rain };
    paintWeatherBadges();
  }
  function showLevelSelect() {
    surface = "menu";
    closePause();
    restoreMenuWeather();
    clearConfetti();
    keys.clear();
    clock.reset();
    vehicleScreens?.hide();
    paintScreens?.hide();
    editorScreens?.hide();
    settingsScreens?.hide();
    screens.show(sim.trackRun?.track.id);
    panel.hidden = true;
  }
  function showLevelEditor() {
    surface = "menu";
    closePause();
    // Note: no weather restore here; the editor keeps the live track's
    // atmosphere for WYSIWYG playtests (startOfficial re-resolves anyway).
    clearConfetti();
    keys.clear();
    clock.reset();
    screens.hide();
    vehicleScreens?.hide();
    paintScreens?.hide();
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
    closePause();
    restoreMenuWeather();
    clearConfetti();
    keys.clear();
    clock.reset();
    screens.hide();
    editorScreens?.hide();
    settingsScreens?.hide();
    paintScreens?.hide();
    vehicleScreens.show();
    panel.hidden = true;
  }
  function showPaintShop(vehicleId: string) {
    surface = "menu";
    closePause();
    clearConfetti();
    keys.clear();
    clock.reset();
    screens.hide();
    editorScreens?.hide();
    settingsScreens?.hide();
    vehicleScreens?.hide();
    paintScreens.show(vehicleId);
    panel.hidden = true;
  }
  function showSettings(backToPause = false) {
    surface = "menu";
    closePause();
    restoreMenuWeather();
    clearConfetti();
    keys.clear();
    clock.reset();
    screens.hide();
    editorScreens?.hide();
    vehicleScreens?.hide();
    paintScreens?.hide();
    settingsScreens.show(backToPause ? backToPauseMenu : undefined);
    panel.hidden = true;
  }
  function backToPauseMenu() {
    settingsScreens.hide();
    surface = "play";
    openPause();
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
  function resetCurrentLevel() {
    closePause();
    paused = false;
    retryTrack();
  }
  function stepLevel(dir: 1 | -1) {
    const run = sim.trackRun;
    startOfficial(
      stepUnlockedTrackId(run?.track.id, dir, unlockedSet()),
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
    () => stepLevel(1),
    starBank,
    unlockSeen,
  );
  $("level-select-button").onclick = showLevelSelect;
  vehicleScreens = createVehicleSelect(
    app,
    (id) => {
      localStorage.setItem("vehicle", id);
      showLevelSelect();
    },
    showLevelSelect,
    scores,
    starBank,
    undefined,
    (id) => showPaintShop(id),
  );
  paintScreens = createPaintShop(app, showVehicleSelect);
  $("vehicle-select-button").onclick = showVehicleSelect;
  editorScreens = createLevelEditor(app, showLevelSelect, (id) =>
    startOfficial(id),
  );
  $("level-editor-button").onclick = showLevelEditor;
  settingsScreens = createSettings(
    app,
    (tier) => view.applyQuality(tier),
    showLevelSelect,
    (weather) => {
      sim.weather = { ...weather };
      if (isPermanentNight(sim.courseTrack?.backgroundTemplate, sim.courseTrack?.custom?.forceNight))
        sim.weather.night = true;
      paintWeatherBadges();
    },
    (show) => view.setObjectHelpVisible(show),
  );
  paintWeatherBadges();
  $("settings-button").onclick = () => showSettings();
  syncControllerForeground();
  if (loadSettings().input === "controller") void proController.reconnect();
  pauseScreens = createPauseMenu(app, {
    onResume: closePause,
    onReset: resetCurrentLevel,
    onLevelSelect: showLevelSelect,
    onVehicleSelect: showVehicleSelect,
    onNext: () => stepLevel(1),
    onPrev: () => stepLevel(-1),
    onSettings: () => showSettings(true),
  });
  type ConfettiPiece = {
    x: number; y: number; vx: number; vy: number;
    w: number; h: number; rot: number; vr: number;
    color: string; life: number;
  };
  let confettiPieces: ConfettiPiece[] = [];
  let confettiLast = 0;
  let confettiRun: Simulation["trackRun"];
  const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function drawConfetti() {
    const canvas = $("confetti") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of confettiPieces) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 0.6));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  }
  function clearConfetti() {
    confettiPieces = [];
    confettiRun = sim.trackRun;
    confettiLast = sim.time;
    const canvas = $("confetti") as HTMLCanvasElement;
    canvas.hidden = true;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  }
  // In-game pauses freeze the burst; completed runs use the frame clock.
  function stepConfetti(frameDelta?: number) {
    // A retry swaps in a fresh run object and rewinds sim time: drop the
    // previous run's burst like the checkpoint banner does, instead of
    // freezing it on a stale clock until the next checkpoint fires.
    if (sim.trackRun !== confettiRun) {
      clearConfetti();
      return;
    }
    if (!confettiPieces.length) return;
    const dt = confettiDelta(sim.time - confettiLast, frameDelta, surface === "result" && sim.trackRun?.status === "completed");
    if (dt <= 0) return;
    confettiLast = sim.time;
    confettiPieces = confettiPieces.filter((p) => p.life > 0);
    for (const p of confettiPieces) {
      p.vy += 900 * dt;
      p.vx *= 1 - 1.6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life -= dt;
    }
    if (confettiPieces.length) drawConfetti();
    else clearConfetti();
  }
  const CONFETTI_COLORS = ["#ffa762", "#f6edde", "#f0ca69", "#ff8a7a", "#8be28b", "#7ec8e3"];
  const CONFETTI_COUNT = 140;
  const GOLD_CONFETTI = ["#ffd700", "#ffdf40", "#f5c542", "#fff3c4", "#e8b53a", "#ffb700"];
  function fireConfetti(opts: { colors?: string[]; count?: number } = {}) {
    if (REDUCED_MOTION) return;
    const canvas = $("confetti") as HTMLCanvasElement;
    canvas.hidden = false;
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    canvas.dataset.bursts = String(Number(canvas.dataset.bursts ?? 0) + 1);
    const colors = opts.colors ?? CONFETTI_COLORS;
    const count = opts.count ?? CONFETTI_COUNT;
    canvas.dataset.lastCount = String(count);
    canvas.dataset.lastColor = colors[0];
    const cx = canvas.width / 2;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 180 + Math.random() * 420;
      confettiPieces.push({
        x: cx + (Math.random() - 0.5) * 120,
        y: canvas.height * 0.2,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 260,
        w: 5 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 18,
        color: colors[(Math.random() * colors.length) | 0],
        life: 1.6 + Math.random() * 0.9,
      });
    }
    confettiLast = sim.time;
    drawConfetti();
  }
  function showDreamCarBanner(carName: string) {
    const banner = $("checkpoint-banner");
    const delta = $("checkpoint-delta");
    banner.querySelector("strong")!.textContent = "DREAM CAR UNLOCKED!";
    banner.classList.add("gold");
    banner.hidden = false;
    bannerFiredAt = sim.time;
    bannerUntil = sim.time + 2.5;
    banner.style.transform = "";
    banner.style.opacity = "";
    delta.hidden = false;
    delta.textContent = carName;
    delta.className = "dream";
    fireConfetti({ colors: GOLD_CONFETTI, count: CONFETTI_COUNT * 6 });
    if (view.renderer.xr.isPresenting)
      view.xrHud.flash("DREAM CAR UNLOCKED!", carName, sim.time + 2.5);
  }
  function showStarBanner(dreamName?: string) {
    const banner = $("checkpoint-banner");
    const delta = $("checkpoint-delta");
    banner.querySelector("strong")!.textContent = dreamName
      ? "DREAM LEVEL UNLOCKED!"
      : "GOLD STAR!";
    banner.classList.add("gold");
    banner.hidden = false;
    bannerFiredAt = sim.time;
    bannerUntil = sim.time + 2.5;
    banner.style.transform = "";
    banner.style.opacity = "";
    if (dreamName) {
      delta.hidden = false;
      delta.textContent = dreamName;
      delta.className = "dream";
    } else {
      delta.hidden = true;
    }
    fireConfetti({
      colors: GOLD_CONFETTI,
      count: CONFETTI_COUNT * (dreamName ? 6 : 3),
    });
    if (view.renderer.xr.isPresenting)
      view.xrHud.flash(
        dreamName ? "DREAM UNLOCKED!" : "GOLD STAR!",
        dreamName ?? "",
        sim.time + 2.5,
      );
  }
  function showCheckpointBanner(
    run: NonNullable<ReturnType<Simulation["snapshot"]>["run"]>,
  ) {
    const banner = $("checkpoint-banner");
    const delta = $("checkpoint-delta");
    banner.querySelector("strong")!.textContent = "CHECKPOINT!";
    banner.classList.remove("gold");
    banner.hidden = false;
    bannerFiredAt = sim.time;
    bannerUntil = sim.time + 2.5;
    banner.style.transform = "";
    banner.style.opacity = "";
    if (view.renderer.xr.isPresenting)
      view.xrHud.flash(
        "CHECKPOINT",
        progressCopy(getTrack(run.trackId), run),
        sim.time + 2.5,
      );
    const best = scores.best(run.trackId, sim.trackRun?.variant ?? "default");
    const split = best?.splits[run.checkpoint - 1];
    if (split === undefined) {
      delta.hidden = true;
    } else {
      const d = run.elapsed - split;
      delta.hidden = false;
      delta.textContent = formatDelta(d);
      delta.className = d <= 0 ? "ahead" : "behind";
    }
    fireConfetti();
  }
  function showLifeLostBanner(livesLeft: number) {
    const banner = $("checkpoint-banner");
    const delta = $("checkpoint-delta");
    banner.querySelector("strong")!.textContent = "LIFE LOST!";
    banner.classList.remove("gold");
    banner.hidden = false;
    bannerFiredAt = sim.time;
    bannerUntil = sim.time + 2.5;
    banner.style.transform = "";
    banner.style.opacity = "";
    delta.hidden = false;
    delta.textContent = livesLeft === 1 ? "Last life!" : `${livesLeft} lives left`;
    delta.className = "";
    if (view.renderer.xr.isPresenting)
      view.xrHud.flash("LIFE LOST!", delta.textContent, sim.time + 2.5);
  }
  /** Start/look/menu sticks; runs every frame, even while paused. */
  function pollController(frameDelta?: number) {
    const pad = controllerForeground ? pollPad() : null;
    const startNow = padStartPressed(pad);
    if (startNow && !padStartWas) {
      if (pauseScreens.isVisible()) closePause();
      else if (surface === "play" && !editorScreens?.isVisible())
        openPause();
    }
    padStartWas = startNow;
    // Thumbstick click on either Touch controller toggles pause in-headset,
    // where the DOM pause menu is invisible (the XR HUD shows PAUSED).
    const xr = view.renderer.xr.isPresenting
      ? xrControllers(view.renderer)
      : { left: null, right: null };
    const xrPauseNow =
      xrDrivingInput(xr.left, xr.right).pausePressed;
    if (xrPauseNow && !xrPauseWas) {
      if (pauseScreens.isVisible()) closePause();
      else if (surface === "play") openPause();
    }
    xrPauseWas = xrPauseNow;
    const menu = activeControllerMenu();
    // Touch input joins physical pads for menu navigation (A confirms, B
    // goes back); without controllers the merge is the physical pad alone.
    const menuPad = mergePadStates(pad, xrMenuPad(xr.left, xr.right));
    const menuInput = controllerMenuInput.sample(menuPad, menu, performance.now());
    if (menuInput.reset && (surface === "play" || surface === "result" || pauseScreens.isVisible()) && !editorScreens?.isVisible()) {
      resetCurrentLevel();
      return;
    }
    if (menu) {
      if (menuInput.direction) moveMenuFocus(menu, menuInput.direction);
      if (menuInput.back) {
        if (menu.id === "pause-menu") closePause();
        else if (menu.id === "settings-screen") $("settings-back").click();
        else if (menu.id === "level-select") {
          const back = $("collection-back"); if (back.getClientRects().length) back.click();
        } else showLevelSelect();
      } else if (menuInput.confirm) activateMenuFocus(menu);
    }
    // The right stick steers flight while airborne; otherwise it looks.
    // In-headset the head does the looking, so controller look stays desktop.
    if (pad && surface === "play" && !paused && !sim.flying && frameDelta && !view.renderer.xr.isPresenting) {
      const look = padLook(pad);
      if (look.dx || look.dy)
        view.chase.drag(
          look.dx * PAD_LOOK_PX_PER_SEC * frameDelta,
          look.dy * PAD_LOOK_PX_PER_SEC * frameDelta,
        );
    }
  }
  function hud(frameDelta?: number) {
    syncControllerForeground();
    pollController(frameDelta);
    stepConfetti(frameDelta);
    vrButton.hidden = !(xrSupported && surface === "play");
    const s = sim.snapshot(false),
      r = ROUTES.find((r) => r.id === s.stage);
    if (view.renderer.xr.isPresenting) {
      const run = s.run;
      const track = run ? getTrack(run.trackId) : null;
      view.xrHud.update(
        {
          speedMph: Math.round(s.speed * 3.6),
          timeText: (run?.elapsed ?? s.time).toFixed(2),
          progressText: run && track ? progressCopy(track, run) : "",
          starsText: run ? `${run.stars.length} ★` : "",
          badgeText: paused
            ? "PAUSED"
            : s.flying
              ? "FLYING"
              : run?.wings
                ? "WINGS"
                : "",
        },
        sim.time,
      );
      if (xrExitAt !== null && performance.now() >= xrExitAt) {
        xrExitAt = null;
        const session = view.renderer.xr.getSession() as unknown as {
          end(): unknown;
        } | null;
        if (session) void session.end();
      }
    }
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
    const wingsBadge = $("wings-badge");
    wingsBadge.hidden = !s.run?.wings;
    wingsBadge.textContent = s.flying ? "FLYING" : "WINGS";
    $("handbrake-label").textContent = s.run?.wings && s.run.status === "running" ? "FLAP WINGS" : "HANDBRAKE";
    if (!s.run) {
      $("hud-best-row").hidden = true;
      $("hud-medal-row").hidden = true;
      $("hud-star-row").hidden = true;
      $("hud-lives-row").hidden = true;
    }
    if (s.run) {
      const track = getTrack(s.run.trackId);
      // Bank pickups before completion/unlock checks, including a star at the finish.
      for (const id of s.run.stars) {
        const def = track.goldStars?.find(g => g.id === id);
        starBank.collect(s.run.trackId, id, def ? { x: def.x, y: def.y, z: def.z } : undefined);
      }
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
        const before = unlockedSet();
        const pb = scores.record(s.run);
        const unlockedNames: string[] = [];
        if (s.run.status === "completed") {
          for (const id of unlockedSet())
            if (!before.has(id)) unlockedNames.push(getTrack(id).name);
        }
        let unlockedCarName: string | undefined;
        if (
          s.run.status === "completed" &&
          dreamCarLockedThisRun &&
          isDreamCarUnlocked(dreamCarLockedThisRun, scores, starBank)
        ) {
          unlockedCarName = getVehicle(dreamCarLockedThisRun).name;
          dreamCarLockedThisRun = null;
          // Gold was the final condition: announce in-level like a star
          // unlock (banner + confetti) ahead of the result screen below.
          showDreamCarBanner(unlockedCarName);
        }
        surface = "result";
        resultStartedAt = sim.time;
        keys.clear();
        screens.showResult(s.run, pb, unlockedNames, unlockedCarName);
        if (unlockedNames.length)
          fireConfetti({ colors: GOLD_CONFETTI, count: CONFETTI_COUNT * 3 });
        if (s.run.status === "failed") screens.reveal(0);
        // In-headset the result screen is invisible DOM: celebrate in 3D,
        // then drop back to 2D after a beat so results are reachable.
        if (view.renderer.xr.isPresenting) {
          view.xrHud.flash(
            s.run.status === "completed" ? "FINISH!" : "WRECKED!",
            "",
            sim.time + 3,
          );
          xrExitAt = performance.now() + 3000;
        }
      }
      // Celebrate intermediate gates; the final gate gets the result screen.
      const banner = $("checkpoint-banner");
      if (sim.trackRun !== bannerRun) {
        bannerRun = sim.trackRun;
        bannerCheckpoint = s.run.checkpoint;
        bannerLives = s.run.lives;
        banner.hidden = true;
      } else if (s.run.status === "running") {
        if (s.run.checkpoint > bannerCheckpoint) {
          bannerCheckpoint = s.run.checkpoint;
          showCheckpointBanner(s.run);
        }
        if (s.run.lives < bannerLives) {
          bannerLives = s.run.lives;
          showLifeLostBanner(s.run.lives);
        }
        // Bank each newly collected star and celebrate it like a checkpoint.
        if (sim.trackRun !== starRun) {
          starRun = sim.trackRun;
          starSeen = s.run.stars.length;
          // Golds only land at run end, so a mid-run dream flip below can
          // only come from star banking: snapshot the locked state now.
          const collection = collectionForTrack(s.run.trackId);
          dreamLockedThisRun =
            !!collection?.dream &&
            !isDreamUnlocked(collection, scores, starBank);
          dreamCarLockedThisRun =
            collection?.dream === s.run.trackId &&
            !isDreamCarUnlocked(
              dreamCarForCollection(collection.id),
              scores,
              starBank,
            )
              ? dreamCarForCollection(collection.id)
              : null;
        } else if (s.run.stars.length > starSeen) {
          starSeen = s.run.stars.length;
          const collection = collectionForTrack(s.run.trackId);
          const dreamId = collection?.dream;
          const justUnlocked =
            !!collection &&
            !!dreamId &&
            dreamLockedThisRun &&
            isDreamUnlocked(collection, scores, starBank);
          if (justUnlocked) dreamLockedThisRun = false;
          showStarBanner(
            justUnlocked && dreamId ? getTrack(dreamId).name : undefined,
          );
          if (
            dreamCarLockedThisRun &&
            isDreamCarUnlocked(dreamCarLockedThisRun, scores, starBank)
          ) {
            showDreamCarBanner(getVehicle(dreamCarLockedThisRun).name);
            dreamCarLockedThisRun = null;
          }
        }
        // Pop and fade on sim time so pausing freezes the celebration
        // mid-show (and headless captures catch it at full opacity).
        if (!banner.hidden) {
          const remaining = bannerUntil - sim.time;
          if (remaining <= 0) banner.hidden = true;
          else if (!REDUCED_MOTION) {
            const age = sim.time - bannerFiredAt;
            const scale =
              age < 0.21
                ? 0.6 + (age / 0.21) * 0.48
                : age < 0.35
                  ? 1.08 - ((age - 0.21) / 0.14) * 0.08
                  : 1;
            banner.style.transform = `translateX(-50%) scale(${scale.toFixed(3)})`;
            banner.style.opacity =
              remaining < 0.5 ? String(Math.max(0, remaining / 0.5)) : "1";
          }
        }
      } else {
        banner.hidden = true;
      }
      // In-run records for this variant; the star row re-renders only when
      // lit states change so mid-run collects light up without per-frame DOM churn.
      const run = s.run;
      const hudBest = hudBestCopy(scores.best(run.trackId, run.variant));
      $("hud-best-row").hidden = false;
      $("hud-medal-row").hidden = false;
      $("hud-lives-row").hidden = false;
      const hudLives = $("hud-lives");
      if (hudLives.textContent !== String(run.lives))
        hudLives.textContent = String(run.lives);
      const hudTime = $("hud-best-time"), hudMedal = $("hud-best-medal");
      if (hudTime.textContent !== hudBest.time)
        hudTime.textContent = hudBest.time;
      if (hudTime.className !== hudBest.medalClass)
        hudTime.className = hudBest.medalClass;
      if (hudMedal.textContent !== hudBest.medal)
        hudMedal.textContent = hudBest.medal;
      if (hudMedal.className !== hudBest.medalClass)
        hudMedal.className = hudBest.medalClass;
      const starDefs = track.goldStars ?? [];
      $("hud-star-row").hidden = starDefs.length === 0;
      if (starDefs.length) {
        const lit = starDefs.map((def) =>
          starBank.isLit(
            run.trackId,
            def,
            isStarRelocated(run.trackId, def.id),
          ),
        );
        const sig = `${run.trackId}:${lit.map(Number).join("")}`;
        if (sig !== hudStarSig) {
          hudStarSig = sig;
          $("hud-stars").innerHTML = starDefs
            .map(
              (def, i) =>
                `<span class="${lit[i] ? "star-lit" : "star-unlit"}" data-star="${def.id}" title="${lit[i] ? "Gold star collected" : "Gold star not collected yet"}">★</span>`,
            )
            .join("");
        }
      }
    }
    if (surface === "result" && s.run?.status === "failed")
      screens.reveal(resultOpacity(sim.time - resultStartedAt));
    levelHUD.update(sim.trackRun?.track, s, surface === "play" && !editorScreens?.isVisible() && !pauseScreens?.isVisible());
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
    if (editorScreens?.isVisible()) return;
    if (e.code === "Backquote") {
      e.preventDefault();
      if (!e.repeat) toggleDebug();
      return;
    }
    if (e.key === "Escape" && pauseScreens?.isVisible()) {
      e.preventDefault();
      if (!e.repeat) closePause();
      return;
    }
    // While paused, the menu owns the keyboard: no shortcuts, no driving keys.
    if (pauseScreens?.isVisible()) return;
    if (
      e.target instanceof HTMLSelectElement ||
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    const k = e.key.toLowerCase();
    if (k === "g" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (!e.repeat) toggleGhosts();
      return;
    }
    if (k === "l") {
      e.preventDefault();
      if (!e.repeat) showLevelSelect();
      return;
    }
    if (k === "c") {
      e.preventDefault();
      if (!e.repeat) showVehicleSelect();
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
  /** Mouse displacement is angular, while a held stick supplies a turn rate. */
  const FLIGHT_MOUSE_RADIANS_PER_PX = 0.003;
  const input = (): Input => {
    const signedSpeed = sim.snapshot(false).signedSpeed;
    const wings = !!sim.trackRun?.wings && sim.trackRun.status === "running";
    const keyboard = drivingInput(keys, signedSpeed, wings);
    const pad = controllerForeground ? pollPad() : null;
    const base = pad
      ? combineDrivingInput(padDriving(pad, signedSpeed, wings), keyboard, wings)
      : keyboard;
    // Touch controllers blend in like a second pad; idle when not presenting.
    const xr = view.renderer.xr.isPresenting
      ? xrControllers(view.renderer)
      : { left: null, right: null };
    const xrInput = xrDrivingInput(xr.left, xr.right, wings);
    const driving = combineDrivingInput(xrInput, base, wings);
    // Dream flight: mouse drags plus the right stick orient while airborne.
    const airYawDelta = -view.flightMouse.x * FLIGHT_MOUSE_RADIANS_PER_PX;
    const airPitchDelta = -view.flightMouse.y * FLIGHT_MOUSE_RADIANS_PER_PX;
    view.flightMouse.x = 0;
    view.flightMouse.y = 0;
    if (!sim.flying) return driving;
    let airYaw = 0, airPitch = 0;
    if (pad) {
      const look = padLook(pad);
      airYaw += -look.dx;
      airPitch += -look.dy;
    }
    airYaw += xrInput.airYaw ?? 0;
    airPitch += xrInput.airPitch ?? 0;
    return {
      ...driving,
      airYawDelta,
      airPitchDelta,
      airYaw: Math.max(-1, Math.min(1, airYaw)),
      airPitch: Math.max(-1, Math.min(1, airPitch)),
    };
  };
  if (import.meta.env.DEV)
    window.__game = {
      select,
      startTrack: (id, lane, vehicle?) =>
        startOfficial(id, lane, false, vehicle),
      track: (id) => getTrack(id),
      customLevels: {
        list: () => listLevels(),
        save: (level: CustomLevel, previousName?: string) => saveLevel(undefined, level, previousName),
        load: (name: string) => loadLevel(undefined, name),
        remove: (name: string) => removeLevel(undefined, name),
      },
      editor: () => editorScreens.probe(),
      resizedPrefabs: () => sim.resizedPrefabs.map(p => ({ id: p.prefab.id, scale: p.space.factor, colliders: p.space.colliders.size })),
      editorProject: (point: { x: number; y: number; z: number }) =>
        editorScreens.projectViewport(point),
      inspectPreview: () => editorScreens.inspectPreview(),
      prefabBounds: (id: string) => view.prefabBounds(id),
      inspectSolids: () => view.inspectSolids(),
      inspectDragons: () => view.inspectDragons(),
      textureLoadErrors: () => textureLoadErrors(),
      loadedTextureIds: () => loadedTextureIds(),
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
      damage: (id, amount) => sim.damage(id, amount),
      truckPaint: () => ({ ...view.appliedPaint }),
      driveFrames: (frames, r, driver, draw = true) => {
        for (let f = 0; f < frames; f++) {
          clock.advance(1 / 60, r, () => sim.step(driver(sim.snapshot(false))));
          view.render(false, clock.alpha, false);
        }
        if (draw) view.render(false, clock.alpha);
        hud();
      },
      vehiclePreview: (azimuth?: number) => view.vehiclePreview(azimuth),
      overhead: (x: number, z: number, height = 150) => view.overhead(x, z, height),
      frameSpot: (x: number, y: number, z: number, dist = 60, azimuth = 0.6, elevation = 0.5) =>
        view.frameSpot(x, y, z, dist, azimuth, elevation),
      camera: () => view.inspectCamera(),
      starHiddenFromSpawn: (trackId: string) => {
        const track = getTrack(trackId);
        const star = track.goldStars?.[0];
        if (!star) throw new Error(`No gold star on track: ${trackId}`);
        startOfficial(trackId as TrackId | CustomTrackId, "easy", true);
        // Settle ~1s so physics and the chase camera rest at spawn.
        for (let f = 0; f < 60; f++) {
          clock.advance(1 / 60, 1, () => sim.step({}));
          view.render(false, clock.alpha, false);
        }
        view.render(true);
        hud();
        paused = true;
        return view.starVisibility(star);
      },
      burnoutOverview: (focus) => view.burnoutOverview(focus),
      lavaOverview: () => view.lavaOverview(),
      hazardOverview: (id) => view.hazardOverview(id),
      lavaPitOverview: (id, angle) => view.lavaPitOverview(id, angle),
      dinosaurOverview: (id) => view.dinosaurOverview(id),
      dinosaurStrike: (id) => view.dinosaurStrike(id),
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
    // The opaque editor covers the game canvas (plus it has its own
    // renderer), so skip the game render while it is visible. Playtests
    // hide the editor, which resumes rendering.
    if (!editorScreens?.isVisible()) view.render(false, clock.alpha);
    if (captureCamera && cameraTrace.length < 2000)
      cameraTrace.push(cameraSample());
    hud(dt);
  }
  select("easy");
  showLevelSelect();
  $("loading").remove();
  // three.js routes this through the XR session loop while presenting (window
  // rAF has no such guarantee); on desktop it behaves like rAF.
  view.renderer.setAnimationLoop(frame);
}
boot().catch((e) => {
  document.getElementById("loading")!.textContent =
    `Unable to start: ${e.message}`;
  console.error(e);
});
