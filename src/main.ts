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
import { createDebugMenu } from "./debug-menu";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<div id="viewport"></div><header><a class="brand" href="/">IRON<span>FLIGHT</span><i>STUNT MOTORSPORT</i></a><div class="series">MONSTER TRUCK STUNT SERIES <b>VOL. 01</b></div><span class="online">● SINGLE PLAYER</span></header>
<aside><div class="eyebrow">THE ARENA IS YOURS</div><h1>BIG TRUCK.<br>BAD IDEAS.</h1><p class="intro">Three ways across. One way to find out.</p><div id="routes">${ROUTES.map((r) => `<button class="route" data-stage="${r.id}" style="--route:#${r.color.toString(16)}"><small>${r.difficulty}</small><strong>${r.name}<span>↗</span></strong><em>${r.gapEnd - 12}m gap <span>·</span> ${r.hazards} hazard${r.hazards > 1 ? "s" : ""}</em></button>`).join("")}</div><button id="lab-toggle" class="lab-toggle">Destruction lab <span>⚒</span></button>
<section id="lab" hidden><div class="eyebrow">SURGICAL DAMAGE TOOLS</div><label for="target">Target part</label><select id="target">${PARTS.map((p) => `<option value="${p.id}">${p.id}</option>`).join("")}</select><div class="tool-grid"><button id="dent">Dent panel</button><button id="destroy">Destroy part</button><button id="sever">Sever chassis</button><button id="restore">Restore truck</button></div><p>Each tool applies real damage. Detached pieces keep their momentum.</p></section></aside>
<div id="status"><span id="state-label">READY TO SEND IT</span><strong id="state-copy">Build speed. Hold your line.</strong><div class="progress"><i id="progress"></i></div></div>
<section id="telemetry"><div class="speed"><strong id="speed">000</strong><span>KM/H</span></div><div class="stats"><span>INTEGRITY <b id="integrity">100%</b></span><span>RUN TIME <b id="time">0.00</b></span></div></section>
<footer><div class="controls"><span><kbd>W</kbd> GAS</span><span><kbd>S</kbd> BRAKE / REV</span><span><kbd>A</kbd><kbd>D</kbd> STEER</span><span><kbd>R</kbd> RESTART</span><span><kbd>SPACE</kbd> BRAKE</span><span class="camera-hint">DRAG TO ORBIT CAMERA</span></div><label class="playback">SIMULATION <select id="rate" aria-label="Playback speed"><option value="1">1× REAL TIME</option><option value="4">4× FAST</option><option value="16">16× TEST SPEED</option></select></label></footer><div id="loading">Preparing the arena…</div>`;
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
  const toggleDebug = createDebugMenu(sim);
  document.querySelector(".camera-hint")!.textContent =
    "DRAG TO ORBIT · WHEEL TO ZOOM · ` TUNING";
  let rate = 1,
    paused = false;
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
    sim.reset(stage);
    view.resetTruck();
    clock.reset();
    cameraTrace = [];
    keys.clear();
    $("lab").hidden = stage !== "lab";
    panel.hidden = stage !== "lab";
    $("routes").hidden = stage === "lab";
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
  function hud() {
    const s = sim.snapshot(),
      r = ROUTES.find((r) => r.id === s.stage);
    $("speed").textContent = Math.round(s.speed * 3.6)
      .toString()
      .padStart(3, "0");
    $("time").textContent = s.time.toFixed(2);
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
          ? `Jets stop in ${(3 - phase).toFixed(1)}s. Time your boost approach.`
          : `Jets restart in ${(8 - phase).toFixed(1)}s. Boost toward the loop.`;
      } else
        $("state-copy").textContent =
          "Jump cleared. Keep going for the dragon loop.";
    }
  }
  document
    .querySelectorAll<HTMLButtonElement>("[data-stage]")
    .forEach((b) => (b.onclick = () => select(b.dataset.stage as Stage)));
  $("lab-toggle").onclick = () => select(sim.stage === "lab" ? "easy" : "lab");
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
    if (e.target instanceof HTMLSelectElement) return;
    const k = e.key.toLowerCase();
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
    if (k === "r") select(sim.stage);
    else keys.add(k);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());
  const input = (): Input => drivingInput(keys, sim.snapshot().signedSpeed);
  if (import.meta.env.DEV)
    window.__game = {
      select,
      pause: (v) => (paused = v),
      advanceFrames: (frames, r, i) => {
        for (let f = 0; f < frames; f++)
          clock.advance(1 / 60, r, () => sim.step(i ?? input()));
        view.render(true);
        hud();
      },
      snapshot: () => sim.snapshot(),
      driveFrames: (frames, r, driver, draw = true) => {
        for (let f = 0; f < frames; f++) {
          clock.advance(1 / 60, r, () => sim.step(driver(sim.snapshot())));
          view.render(false, clock.alpha, false);
        }
        if (draw) view.render(false, clock.alpha);
        hud();
      },
      camera: () => view.inspectCamera(),
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
        view.render(true);
      },
      stats: () => view.stats(),
      visualPart: (id) => {
        const m = view.meshes.get(id);
        return {
          detached: !!m?.userData.detached,
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
    if (!paused) clock.advance(dt, rate, () => sim.step(input()));
    view.render(false, clock.alpha);
    if (captureCamera && cameraTrace.length < 2000)
      cameraTrace.push(cameraSample());
    hud();
    requestAnimationFrame(frame);
  }
  select("easy");
  $("loading").remove();
  requestAnimationFrame(frame);
}
boot().catch((e) => {
  document.getElementById("loading")!.textContent =
    `Unable to start: ${e.message}`;
  console.error(e);
});
