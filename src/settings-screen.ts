import {
  loadSettings,
  saveSettings,
  type VideoQuality,
} from "./settings";
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
) {
  const screen = document.createElement("main");
  screen.id = "settings-screen";
  screen.hidden = true;
  screen.innerHTML = `<div class="settings-intro"><div><div class="eyebrow">IRON FLIGHT / SETUP</div><h1>Settings.</h1><p>Tune the game to your machine.</p></div><div class="menu-actions"><button id="settings-back">Level select</button></div></div><section class="settings-section" aria-label="Video"><h2>Video</h2><div class="settings-grid" role="radiogroup" aria-label="Video quality"></div><p class="selection-footnote">Applies instantly and is remembered.</p></section><section class="settings-section" aria-label="Weather"><h2>Weather</h2><div class="settings-grid" role="group" aria-label="Weather mutators"></div><p class="selection-footnote">Night and rain apply to every track and can combine. Randomize re-rolls them on every level and retry.</p></section>`;
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
  host.append(screen);
  screen.querySelector<HTMLButtonElement>("#settings-back")!.onclick = onBack;
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
    show() {
      const stored = loadSettings();
      paint(stored.video);
      paintWeather(
        { night: stored.night, rain: stored.rain },
        stored.randomizeAtmosphere,
      );
      screen.hidden = false;
      host.classList.add("at-level-select");
    },
    hide() {
      screen.hidden = true;
      host.classList.remove("at-level-select");
    },
  };
}
