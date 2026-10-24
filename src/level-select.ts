import { TRACKS, getTrack, type TrackId } from "./tracks";
import type { BestTimes } from "./best-times";
import type { TrackRun } from "./track-run";
import { modeLabel, timeoutCopy } from "./run-copy";
const format = (time: number) => `${time.toFixed(2)}s`;
export function createLevelSelect(
  host: HTMLElement,
  scores: BestTimes,
  onStart: (id: TrackId) => void,
  onLab: () => void,
  onTuning: () => void,
  onRetry: () => void,
  onMenu: () => void,
) {
  const screen = document.createElement("main");
  screen.id = "level-select";
  screen.innerHTML = `<div class="track-select-intro"><div><div class="eyebrow">IRON FLIGHT / TRACK COLLECTION 01</div><h1>Choose your track.</h1><p>Nine places to send it. Make every second count.</p></div><div class="menu-actions"><button id="menu-tuning">Truck tuning</button><button id="menu-lab">Destruction lab</button></div></div><div class="track-grid"></div><p class="selection-footnote">Drive with WASD or arrow keys · Space to handbrake · Best times stay on this browser</p>`;
  const grid = screen.querySelector<HTMLElement>(".track-grid")!;
  const cards = new Map<TrackId, HTMLElement>();
  for (const [i, track] of TRACKS.entries()) {
    const card = document.createElement("article");
    card.className = "track-card";
    card.dataset.track = track.id;
    card.style.setProperty(
      "--track-accent",
      `#${track.color.toString(16).padStart(6, "0")}`,
    );
    card.innerHTML = `<button class="track-play" aria-label="Play ${track.name}"><div class="track-image"><img src="${track.thumbnail}" alt="${track.name} route preview"><span class="track-number">0${i + 1}</span><span class="track-mode">${modeLabel(track)}</span></div><div class="track-card-body"><div class="track-card-heading"><h2>${track.name}</h2><span class="best-medal">UNRANKED</span></div><p>${track.description}</p><div class="medal-targets"><span class="gold">● ${track.medals.gold}s</span><span class="silver">● ${track.medals.silver}s</span><span class="bronze">● ${track.medals.bronze}s</span></div><div class="track-card-bottom"><span class="best-time">NO TIME SET</span><span class="play-word">PLAY ↗</span></div></div></button>`;
    card.querySelector("button")!.onclick = () => onStart(track.id);
    grid.append(card);
    cards.set(track.id, card);
  }
  const result = document.createElement("section");
  result.id = "track-result";
  result.hidden = true;
  result.setAttribute("role", "dialog");
  result.setAttribute("aria-modal", "true");
  result.setAttribute("aria-labelledby", "result-title");
  result.innerHTML = `<div class="result-card"><div id="result-track" class="eyebrow"></div><div id="result-medal" class="result-medal"></div><h2 id="result-title"></h2><p id="result-description"></p><div id="result-time"></div><p id="personal-best"></p><div class="result-actions"><button id="retry-track">Retry track</button><button id="result-level-select">Level select</button></div></div>`;
  host.append(screen, result);
  screen.querySelector<HTMLButtonElement>("#menu-lab")!.onclick = onLab;
  screen.querySelector<HTMLButtonElement>("#menu-tuning")!.onclick = onTuning;
  result.querySelector<HTMLButtonElement>("#retry-track")!.onclick = onRetry;
  result.querySelector<HTMLButtonElement>("#result-level-select")!.onclick =
    onMenu;
  const refresh = () => {
    for (const track of TRACKS) {
      const best = track.legacy
        ? ["easy", "medium", "hard"]
            .map((v) => ({ v, b: scores.best(track.id, v) }))
            .filter((p) => p.b)
            .sort((a, b) => a.b!.time - b.b!.time)[0]
        : { v: "default", b: scores.best(track.id) };
      const card = cards.get(track.id)!;
      card.querySelector(".best-time")!.textContent = best?.b
        ? `${track.legacy ? `${best.v.toUpperCase()} · ` : ""}${format(best.b.time)}`
        : "NO TIME SET";
      card.querySelector(".best-medal")!.textContent =
        best?.b?.medal?.toUpperCase() ?? (best?.b ? "COMPLETED" : "UNRANKED");
      card.querySelector(".best-medal")!.className =
        `best-medal ${best?.b?.medal ?? ""}`;
    }
  };
  return {
    show() {
      refresh();
      screen.hidden = false;
      result.hidden = true;
      host.classList.add("at-level-select");
    },
    hide() {
      screen.hidden = true;
      result.hidden = true;
      host.classList.remove("at-level-select");
    },
    reveal(opacity: number) {
      result.style.opacity = String(opacity);
      result.style.pointerEvents = opacity > 0.05 ? "auto" : "none";
      result.inert = opacity <= 0.05;
    },
    showResult(run: ReturnType<TrackRun["snapshot"]>, personalBest: boolean) {
      screen.hidden = true;
      result.hidden = false;
      result.style.opacity = "1";
      result.style.pointerEvents = "auto";
      result.inert = false;
      host.classList.remove("at-level-select");
      const completed = run.status === "completed";
      result.querySelector("#result-track")!.textContent = getTrack(
        run.trackId,
      ).name.toUpperCase();
      result.querySelector("#result-title")!.textContent = completed
        ? "Track complete!"
        : "Run ended";
      result.querySelector("#result-description")!.textContent = completed
        ? "You made it. Ready to shave off another second?"
        : run.reason === "timeout"
          ? timeoutCopy(getTrack(run.trackId))
          : "Truck wrecked. Rebuild and take another run.";
      result.querySelector("#result-time")!.textContent = format(run.elapsed);
      const medal = result.querySelector<HTMLElement>("#result-medal")!;
      medal.textContent = completed
        ? (run.medal?.toUpperCase() ?? "FINISHER")
        : "TRY AGAIN";
      medal.className = `result-medal ${run.medal ?? ""}`;
      result.querySelector("#personal-best")!.textContent = personalBest
        ? "NEW PERSONAL BEST"
        : completed
          ? "Best time retained on this browser"
          : "No medal awarded";
      result.querySelector<HTMLButtonElement>("#retry-track")!.focus();
    },
  };
}
