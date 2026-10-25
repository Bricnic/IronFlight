import {
  loadSettings,
  saveSettings,
  type VideoQuality,
} from "./settings";
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
) {
  const screen = document.createElement("main");
  screen.id = "settings-screen";
  screen.hidden = true;
  screen.innerHTML = `<div class="track-select-intro"><div><div class="eyebrow">IRON FLIGHT / SETUP</div><h1>Settings.</h1><p>Tune the game to your machine.</p></div><div class="menu-actions"><button id="settings-back">Level select</button></div></div><section class="settings-section" aria-label="Video"><h2>Video</h2><div class="track-grid" role="radiogroup" aria-label="Video quality"></div><p class="selection-footnote">Applies instantly and is remembered.</p></section>`;
  const grid = screen.querySelector<HTMLElement>(".track-grid")!;
  const cards = new Map<VideoQuality, HTMLElement>();
  for (const tier of TIERS) {
    const card = document.createElement("article");
    card.className = "vehicle-card";
    card.dataset.video = tier.id;
    card.innerHTML = `<button class="vehicle-pick" role="radio" aria-label="Video quality ${tier.name}" aria-checked="false"><div class="track-card-body"><div class="track-card-heading"><h2>${tier.name}</h2><span class="best-medal picked">PICKED</span></div><p>${tier.blurb}</p></div></button>`;
    card.querySelector("button")!.onclick = () => {
      saveSettings(tier.id);
      onVideo(tier.id);
      paint(tier.id);
    };
    grid.append(card);
    cards.set(tier.id, card);
  }
  host.append(screen);
  screen.querySelector<HTMLButtonElement>("#settings-back")!.onclick = onBack;
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
      paint(loadSettings().video);
      screen.hidden = false;
      host.classList.add("at-level-select");
    },
    hide() {
      screen.hidden = true;
      host.classList.remove("at-level-select");
    },
  };
}
