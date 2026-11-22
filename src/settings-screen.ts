import {
  loadSettings,
  saveInput,
  saveSettings,
  saveObjectHelp,
  type InputDevice,
  type VideoQuality,
} from "./settings";
import { connectedPadId } from "./gamepad";
import { proController } from "./switch-pro";
import type { WeatherFlags } from "./weather";
const TIERS: { id: VideoQuality; name: string; blurb: string }[] = [
  {
    id: "low",
    name: "Low",
    blurb: "Short draw distance, no shadows. Built for weak GPUs.",
  },
  {
    id: "medium",
    name: "Medium",
    blurb: "Balanced pixels and distance with shadows on.",
  },
  {
    id: "high",
    name: "High",
    blurb: "Full pixels, shadows and draw distance.",
  },
];
export function createSettings(
  host: HTMLElement,
  onVideo: (tier: VideoQuality) => void,
  onBack: () => void,
  onWeather: (weather: WeatherFlags) => void,
  onObjectHelp: (show: boolean) => void,
) {
  const screen = document.createElement("main");
  screen.id = "settings-screen";
  screen.hidden = true;
  screen.innerHTML = `<div class="settings-intro"><div><div class="eyebrow">IRON FLIGHT / SETUP</div><h1>Settings.</h1></div><div class="menu-actions"><button id="settings-back">Level select</button></div></div><section class="settings-section" aria-label="Video"><h2>Video</h2><div class="settings-grid" role="radiogroup" aria-label="Video quality"></div><p class="selection-footnote">Applies instantly and is remembered.</p></section><section class="settings-section" aria-label="Weather"><h2>Weather</h2><div class="settings-grid" role="group" aria-label="Weather mutators"></div><p class="selection-footnote">Night and rain apply to every track and can combine. Randomize re-rolls them on every level and retry.</p></section>`;
  const grids = screen.querySelectorAll<HTMLElement>(".settings-grid");
  const grid = grids[0]!;
  const weatherGrid = grids[1]!;
  const cards = new Map<VideoQuality, HTMLElement>();
  for (const tier of TIERS) {
    const card = document.createElement("article");
    card.className = "settings-card";
    card.dataset.video = tier.id;
    card.innerHTML = `<button class="vehicle-pick" role="radio" aria-label="Video quality ${tier.name}" aria-checked="false"><div class="track-card-body"><div class="track-card-heading"><h2>${tier.name}</h2><span class="best-medal picked">PICKED</span></div><p>${tier.blurb}</p></div></button>`;
    card.querySelector("button")!.onclick = () => {
      const stored = loadSettings();
      saveSettings(
        tier.id,
        { night: stored.night, rain: stored.rain },
        stored.randomizeAtmosphere,
      );
      onVideo(tier.id);
      paint(tier.id);
    };
    grid.append(card);
    cards.set(tier.id, card);
  }
  const toggles = new Map<keyof WeatherFlags, HTMLElement>();
  for (const flag of [
    { id: "night", name: "Night racing", blurb: "Dark sky, headlights and glowing gates." },
    { id: "rain", name: "Rainy races", blurb: "Storms, slick roads and rooster tails." },
  ] as const) {
    const card = document.createElement("article");
    card.className = "settings-card";
    card.dataset.weather = flag.id;
    card.innerHTML = `<button class="vehicle-pick" role="switch" aria-label="${flag.name}" aria-checked="false"><div class="track-card-body"><div class="track-card-heading"><h2>${flag.name}</h2><span class="best-medal picked">ON</span></div><p>${flag.blurb}</p></div></button>`;
    card.querySelector("button")!.onclick = () => {
      const stored = loadSettings();
      if (stored.randomizeAtmosphere) return;
      const weather = { night: stored.night, rain: stored.rain, [flag.id]: !stored[flag.id] };
      saveSettings(stored.video, weather, stored.randomizeAtmosphere);
      onWeather(weather);
      paintWeather(weather, stored.randomizeAtmosphere);
    };
    weatherGrid.append(card);
    toggles.set(flag.id, card);
  }
  const randomCard = document.createElement("article");
  randomCard.className = "settings-card";
  randomCard.dataset.weather = "randomize";
  randomCard.innerHTML = `<button class="vehicle-pick" role="switch" aria-label="Randomize atmosphere" aria-checked="false"><div class="track-card-body"><div class="track-card-heading"><h2>Randomize atmosphere</h2><span class="best-medal picked">ON</span></div><p>Fresh night and rain roll on every level and retry.</p></div></button>`;
  randomCard.querySelector("button")!.onclick = () => {
    const stored = loadSettings();
    const randomizeAtmosphere = !stored.randomizeAtmosphere;
    const weather = randomizeAtmosphere
      ? { night: false, rain: false }
      : { night: stored.night, rain: stored.rain };
    saveSettings(stored.video, weather, randomizeAtmosphere);
    onWeather(weather);
    paintWeather(weather, randomizeAtmosphere);
  };
  weatherGrid.append(randomCard);
  const helpSection = document.createElement("section");
  helpSection.className = "settings-section";
  helpSection.setAttribute("aria-label", "Object help");
  helpSection.innerHTML = `<h2>Object help</h2><div class="settings-grid"><article class="settings-card" data-setting="object-help"><button class="vehicle-pick" role="switch" aria-label="Show object help text" aria-checked="false"><div class="track-card-body"><div class="track-card-heading"><h2>Show object help text</h2><span class="best-medal picked">ON</span></div><p>Show labels explaining how to interact with objects.</p></div></button></article></div>`;
  const helpCard = helpSection.querySelector<HTMLElement>("article")!;
  const helpButton = helpCard.querySelector("button")!;
  const paintHelp = (show: boolean) => { helpCard.classList.toggle("selected", show); helpButton.setAttribute("aria-checked", String(show)); };
  helpButton.onclick = () => {
    const show = !loadSettings().showObjectHelp;
    saveObjectHelp(show); onObjectHelp(show); paintHelp(show);
  };
  screen.append(helpSection);
  const inputSection = document.createElement("section");
  inputSection.className = "settings-section";
  inputSection.setAttribute("aria-label", "Input");
  inputSection.innerHTML = `<h2>Input</h2><div class="settings-grid" role="radiogroup" aria-label="Input device"></div><p class="selection-footnote" id="input-status"></p>`;
  const inputGrid = inputSection.querySelector<HTMLElement>(".settings-grid")!;
  const inputStatus = inputSection.querySelector<HTMLElement>("#input-status")!;
  inputStatus.setAttribute("aria-live", "polite");
  const connectPro = document.createElement("button");
  connectPro.id = "connect-pro-controller";
  connectPro.className = "header-action";
  connectPro.textContent = "Connect Pro Controller";
  const connectHelp = document.createElement("p"); connectHelp.className = "selection-footnote";
  connectHelp.textContent = proController.supported
    ? "Focus this page and press a controller button. If your Switch Pro Controller is still undetected, connect it here and choose it in the browser picker."
    : "Focus this page and press a controller button. Direct Switch Pro Controller setup needs Chrome or Edge on HTTPS or localhost.";
  connectPro.disabled = !proController.supported;
  connectPro.onclick = async () => {
    saveInput("controller"); paintInput("controller");
    await proController.connect(); paintInputStatus();
  };
  inputSection.append(connectPro, connectHelp);
  const controllerDetails = document.createElement("details");
  controllerDetails.innerHTML = "<summary>Controller connection details</summary><pre id=\"controller-connection-details\" style=\"white-space:pre-wrap\"></pre>";
  inputSection.append(controllerDetails);
  const inputCards = new Map<InputDevice, HTMLElement>();
  for (const device of [
    { id: "keyboard", name: "Keyboard", blurb: "WASD or arrows drive, Space handbrakes, mouse drag orbits the camera." },
    { id: "controller", name: "Controller or keyboard", blurb: "Left stick steers, ZR accelerates, ZL brakes then reverses, A also accelerates, B handbrakes, Y resets the level, right stick looks, Start pauses. Keyboard controls remain active while the controller is connected." },
  ] as const) {
    const card = document.createElement("article");
    card.className = "settings-card";
    card.dataset.input = device.id;
    card.innerHTML = `<button class="vehicle-pick" role="radio" aria-label="Input device ${device.name}" aria-checked="false"><div class="track-card-body"><div class="track-card-heading"><h2>${device.name}</h2><span class="best-medal picked">PICKED</span></div><p>${device.blurb}</p></div></button>`;
    card.querySelector("button")!.onclick = () => {
      saveInput(device.id);
      paintInput(device.id);
    };
    inputGrid.append(card);
    inputCards.set(device.id, card);
  }
  const paintInput = (picked: InputDevice) => {
    for (const [id, card] of inputCards) {
      card.classList.toggle("selected", id === picked);
      card.querySelector("button")!.setAttribute("aria-checked", String(id === picked));
    }
  };
  const paintInputStatus = () => {
    const id = connectedPadId();
    const direct = proController.status();
    const text = id !== null ? `Controller connected: ${id.slice(0, 64)}.` : direct.message || "Controller: none detected. Press a button on the controller while this page is focused.";
    if (inputStatus.textContent !== text) inputStatus.textContent = text;
    const busy = direct.state === "requesting" || direct.state === "initializing";
    connectPro.disabled = busy || !proController.supported;
    connectPro.textContent = busy ? "Connecting…" : "Connect Pro Controller";
    controllerDetails.querySelector("pre")!.textContent = JSON.stringify(proController.diagnostics(), null, 2);
  };
  proController.subscribe(paintInputStatus);
  let inputStatusTimer: ReturnType<typeof setInterval> | undefined;
  window.addEventListener("gamepadconnected", paintInputStatus);
  window.addEventListener("gamepaddisconnected", paintInputStatus);
  screen.append(inputSection);
  host.append(screen);
  const backButton = screen.querySelector<HTMLButtonElement>("#settings-back")!;
  backButton.onclick = onBack;
  function paintWeather(flags: WeatherFlags, randomizeAtmosphere: boolean) {
    for (const [id, card] of toggles) {
      const on = flags[id] && !randomizeAtmosphere;
      const button = card.querySelector("button")!;
      card.classList.toggle("selected", on);
      card.classList.toggle("disabled", randomizeAtmosphere);
      button.setAttribute("aria-checked", String(on));
      button.disabled = randomizeAtmosphere;
    }
    randomCard.classList.toggle("selected", randomizeAtmosphere);
    randomCard
      .querySelector("button")!
      .setAttribute("aria-checked", String(randomizeAtmosphere));
  }
  function paint(picked: VideoQuality) {
    for (const [id, card] of cards) {
      card.classList.toggle("selected", id === picked);
      card
        .querySelector("button")!
        .setAttribute("aria-checked", String(id === picked));
    }
  }
  return {
    show(onBackOverride?: () => void) {
      const stored = loadSettings();
      paint(stored.video);
      paintHelp(stored.showObjectHelp);
      paintWeather(
        { night: stored.night, rain: stored.rain },
        stored.randomizeAtmosphere,
      );
      paintInput(stored.input);
      paintInputStatus();
      if (inputStatusTimer) clearInterval(inputStatusTimer);
      inputStatusTimer = setInterval(paintInputStatus, 250);
      backButton.onclick = onBackOverride ?? onBack;
      backButton.textContent = onBackOverride ? "Back" : "Level select";
      screen.hidden = false;
      host.classList.add("at-level-select");
    },
    hide() {
      if (inputStatusTimer) clearInterval(inputStatusTimer);
      inputStatusTimer = undefined;
      screen.hidden = true;
      host.classList.remove("at-level-select");
    },
  };
}
