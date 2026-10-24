import { resultOpacity } from "./result-reveal";
import { createLevelSelect } from "./level-select";
import { BestTimes } from "./best-times";
import { getTrack, type TrackId } from "./tracks";
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
import {
  objectiveCopy,
  progressCopy,
  progressFraction,
} from "./run-copy";
import { createDebugMenu } from "./debug-menu";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<div id="viewport"></div><header><a class="brand" href="/">IRON<span>FLIGHT</span><i>STUNT MOTORSPORT</i></a><div class="series">MONSTER TRUCK STUNT SERIES <b>VOL. 01</b></div><span class="online">● SINGLE PLAYER</span></header>
<aside><div class="eyebrow">THE ARENA IS YOURS</div><h1>BIG TRUCK.<br>BAD IDEAS.</h1><p class="intro">Three ways across. One way to find out.</p><div id="routes">${ROUTES.map((r) => `<button class="route" data-stage="${r.id}" style="--route:#${r.color.toString(16)}"><small>${r.difficulty}</small><strong>${r.name}<span>↗</span></strong><em>${r.gapEnd - 12}m gap <span>·</span> ${r.hazards} hazard${r.hazards > 1 ? "s" : ""}</em></button>`).join("")}</div><button id="lab-toggle" class="lab-toggle">Destruction lab <span>⚒</span></button>
<section id="lab" hidden><div class="eyebrow">SURGICAL DAMAGE TOOLS</div><label for="target">Target part</label><select id="target">${PARTS.map((p) => `<option value="${p.id}">${p.id}</option>`).join("")}</select><div class="tool-grid"><button id="dent">Dent panel</button><button id="destroy">Destroy part</button><button id="sever">Sever chassis</button><button id="restore">Restore truck</button></div><p>Each tool applies real damage. Detached pieces keep their momentum.</p></section></aside>
<div id="status"><span id="state-label">READY TO SEND IT</span><strong id="state-copy">Build speed. Hold your line.</strong><div id="run-progress" hidden></div><div class="progress"><i id="progress"></i></div></div>
<section id="telemetry"><div class="speed"><strong id="speed">000</strong><span>MPH</span></div><div class="stats"><span>INTEGRITY <b id="integrity">100%</b></span><span>RUN TIME <b id="time">0.00</b></span></div></section>
<footer><div class="controls"><span><kbd>W / UP</kbd> GAS</span><span><kbd>S / DOWN</kbd> BRAKE / REV</span><span><kbd>A/D / LEFT/RIGHT</kbd> <span id="steer-label">STEER</span></span><span><kbd>R</kbd> RESTART</span><span><kbd>SPACE</kbd> HANDBRAKE</span><span class="camera-hint">DRAG TO ORBIT CAMERA</span></div><label class="playback">SIMULATION <select id="rate" aria-label="Playback speed"><option value="1">1× REAL TIME</option><option value="4">4× FAST</option><option value="16">16× TEST SPEED</option></select></label></footer><div id="loading">Preparing the arena…</div>`;
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
  const toggleDebug = await createDebugMenu(sim);
  document.querySelector(".camera-hint")!.textContent =
    "DRAG TO ORBIT · WHEEL TO ZOOM · ` TUNING";
  let rate = 1,
    paused = false;
  let surface: "menu" | "play" | "result" = "menu";
  let screens: ReturnType<typeof createLevelSelect>;
  let recordedRun: Simulation["trackRun"];
  let resultStartedAt = 0;
  const scores = new BestTimes({
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  });
  header.insertAdjacentHTML(
    "beforeend",
    '<button id="level-select-button">Level select</button>',
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
    screens?.hide();
    recordedRun = undefined;
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
    id: TrackId,
    lane: "easy" | "medium" | "hard" = "easy",
    unpause = true,
  ) {
    sim.startTrack(id, lane);
    view.resetTruck();
    clock.reset();
    keys.clear();
    surface = "play";
    recordedRun = undefined;
    if (unpause) paused = false;
    screens?.hide();
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
    keys.clear();
    clock.reset();
    screens.show();
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
  function hud() {
    const s = sim.snapshot(false),
      r = ROUTES.find((r) => r.id === s.stage);
    $("speed").textContent = Math.round(s.speed * 3.6)
      .toString()
      .padStart(3, "0");
    $("time").textContent = (s.run?.elapsed ?? s.time).toFixed(2);
    $("integrity").textContent =
      `${Math.round(([...sim.parts.values()].reduce((a, p) => a + p.health, 0) / PARTS.reduce((a, p) => a + p.hp, 0)) * 100)}%`;
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
        track.controls === "strafe" ? "STRAFE" : "STEER";
      if (s.comic.effect)
        $("state-copy").textContent =
          `${s.comic.effect.toUpperCase()} POTION · ${s.comic.remaining.toFixed(1)}s · Mixing active potions is lethal`;
      $("run-progress").textContent = progressCopy(track, s.run);
      $("progress").style.width =
        `${progressFraction(track, s.run) * 100}%`;
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
    if (
      e.target instanceof HTMLSelectElement ||
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    const k = e.key.toLowerCase();
    if (k === "r" && surface !== "menu") {
      e.preventDefault();
      if (!e.repeat) retryTrack();
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
      startTrack: (id, lane) => startOfficial(id, lane, false),
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
