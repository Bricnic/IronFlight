import { getTrack, type TrackId, type CustomTrackId } from "./tracks";
import { officialTracks } from "./official-levels";
import {
  LEVEL_COLLECTIONS,
  collectionForTrack,
  type LevelCollection,
} from "./level-collections";
import {
  UNLOCK_BASE,
  UnlockSeen,
  goldCount,
  hasPlayed,
  starProgress,
  unlockedCount,
  unlockedIds,
} from "./level-unlocks";
import type { BestTimes } from "./best-times";
import type { GoldStars } from "./gold-stars";
import { isStarRelocated } from "./gold-star-migrations";
import type { TrackRun } from "./track-run";
import { modeLabel, timeoutCopy } from "./run-copy";

const format = (time: number) => `${time.toFixed(2)}s`;
const LOCK_SVG = `<svg viewBox="0 0 24 24" width="72" height="72" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>`;

export function createLevelSelect(
  host: HTMLElement,
  scores: BestTimes,
  onStart: (id: TrackId | CustomTrackId) => void,
  onLab: () => void,
  onTuning: () => void,
  onRetry: () => void,
  onMenu: () => void,
  onNext: () => void,
  starBank?: GoldStars,
  unlockSeen?: UnlockSeen,
) {
  const seen =
    unlockSeen ??
    new UnlockSeen({
      getItem: (k) => localStorage.getItem(k),
      setItem: (k, v) => localStorage.setItem(k, v),
    });
  const screen = document.createElement("main");
  screen.id = "level-select";
  screen.innerHTML = `<div class="track-select-intro"><div><div class="eyebrow">IRON FLIGHT / TRACK COLLECTIONS</div><h1>Choose your collection.</h1><p>${officialTracks.length} tracks across ${LEVEL_COLLECTIONS.length} collections. Earn gold medals to unlock more.</p></div><div class="menu-actions"><button id="menu-tuning">Truck tuning</button><button id="menu-lab">Destruction lab</button></div></div><div class="collection-grid"></div><div class="collection-tracks" hidden><div class="collection-tracks-head"><button id="collection-back">← All collections</button><div><div class="eyebrow" id="collection-eyebrow"></div><h2 id="collection-title"></h2><p id="collection-theme"></p></div></div><div class="track-grid"></div></div><p class="selection-footnote">Choose with arrow keys, D-pad or left stick · A confirms · B goes back · Space to play · L for level select · C for vehicle select · N/P for next/previous unlocked level · Drive with WASD or arrow keys · Space to handbrake · Best times stay on this browser</p><div id="lock-toast" role="status" hidden></div>`;
  const collectionGrid =
    screen.querySelector<HTMLElement>(".collection-grid")!;
  const tracksSection =
    screen.querySelector<HTMLElement>(".collection-tracks")!;
  const grid = screen.querySelector<HTMLElement>(".track-grid")!;
  const cards = new Map<string, HTMLElement>();
  const collectionCards = new Map<string, HTMLElement>();
  let activeCollection: LevelCollection | null = null;
  let selectedCollection = 0;
  let selected = 0;

  for (const [i, collection] of LEVEL_COLLECTIONS.entries()) {
    const card = document.createElement("article");
    card.className = "collection-card";
    card.dataset.collection = collection.id;
    card.innerHTML = `<button class="collection-pick" aria-label="Open ${collection.name}"><div class="collection-image"><img src="${collection.art}" alt="${collection.name} artwork"></div><div class="collection-body"><h2>${collection.name}</h2><div class="collection-stats"><span class="collection-gold"></span><span class="collection-stars"></span></div></div></button>`;
    card.querySelector("button")!.onclick = () => {
      selectedCollection = i;
      openCollection(collection);
    };
    collectionGrid.append(card);
    collectionCards.set(collection.id, card);
  }
  screen.querySelector<HTMLButtonElement>("#collection-back")!.onclick = () => {
    activeCollection = null;
    tracksSection.hidden = true;
    collectionGrid.hidden = false;
    refresh();
    collectionButtons[selectedCollection].focus();
  };

  const toast = screen.querySelector<HTMLElement>("#lock-toast")!;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const showLockToast = (message: string) => {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2400);
  };

  const buildTrackCards = (collection: LevelCollection) => {
    grid.innerHTML = "";
    cards.clear();
    const unlocked = new Set(unlockedIds(collection, scores, starBank));
    for (const [i, id] of collection.trackIds.entries()) {
      const track = getTrack(id);
      const locked = !unlocked.has(id);
      const card = document.createElement("article");
      card.className = `track-card${locked ? " locked" : ""}`;
      card.dataset.track = track.id;
      card.style.setProperty(
        "--track-accent",
        `#${track.color.toString(16).padStart(6, "0")}`,
      );
      card.innerHTML = `<button class="track-play" aria-label="${locked ? `${track.name} (locked)` : `Play ${track.name}`}"${locked ? ' aria-disabled="true"' : ""}><div class="track-image"><img src="${track.thumbnail}" alt="${track.name} route preview"><span class="track-number">${String(i + 1).padStart(2, "0")}</span><span class="track-mode">${modeLabel(track)}</span>${locked ? `<span class="track-lock">${LOCK_SVG}</span>` : ""}</div><div class="track-card-body"><div class="track-card-heading"><h2>${track.name}</h2><span class="best-medal">UNRANKED</span></div><div class="medal-targets"><span class="gold">● ${track.medals.gold}s</span><span class="silver">● ${track.medals.silver}s</span><span class="bronze">● ${track.medals.bronze}s</span></div><div class="track-card-bottom"><span class="best-variant"></span><span class="star-row" aria-label="Gold stars"></span><span class="track-card-action"><span class="best-time">NO TIME SET</span><span class="play-word">${locked ? "LOCKED" : "PLAY ↗"}</span></span></div></div></button>`;
      const lockedFeedback = () => {
        if (card.classList.contains("unlocking")) return;
        const need = i + 1 - unlockedCount(collection, scores);
        showLockToast(
          collection.dream === id
            ? `Locked — earn a gold medal and find the gold star on every ${collection.name} course to unlock ${track.name}.`
            : `Locked — earn ${need} more gold medal${need === 1 ? "" : "s"} in ${collection.name} to unlock ${track.name}.`,
        );
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        card.classList.remove("shake");
        // Restart the shake on repeat clicks.
        void card.offsetWidth;
        card.classList.add("shake");
      };
      // Locked tracks stay focusable buttons (aria-disabled) instead of
      // disabled ones: disabled buttons swallow clicks entirely, while
      // these answer with a shake and the gold still needed.
      card.querySelector("button")!.onclick = () => {
        if (card.classList.contains("locked")) {
          lockedFeedback();
          return;
        }
        selected = i;
        onStart(track.id as TrackId | CustomTrackId);
      };
      card.addEventListener("animationend", (e) => {
        if (e.animationName === "card-shake") card.classList.remove("shake");
      });
      grid.append(card);
      cards.set(track.id, card);
    }
    refreshTrackCards(collection);
    playUnlockAnimations(collection);
  };

  /** Earned unlocks (beyond the base two) that are unseen and unplayed burst open. */
  const playUnlockAnimations = (collection: LevelCollection) => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const [i, id] of collection.trackIds.entries()) {
      if (i < UNLOCK_BASE) continue;
      const card = cards.get(id);
      if (!card || card.classList.contains("locked")) continue;
      if (hasPlayed(id, scores) || seen.has(id)) continue;
      if (reduced) {
        seen.mark(id);
        continue;
      }
      // Re-lock visually, then animate the lock gold and exploding away.
      card.classList.add("locked", "unlocking");
      const button = card.querySelector("button")!;
      button.setAttribute("aria-disabled", "true");
      const image = card.querySelector(".track-image")!;
      const lock = document.createElement("span");
      lock.className = "track-lock unlocking-lock";
      lock.innerHTML = LOCK_SVG;
      image.append(lock);
      const finish = () => {
        lock.remove();
        card.classList.remove("locked", "unlocking");
        button.removeAttribute("aria-disabled");
        button.setAttribute("aria-label", `Play ${getTrack(id).name}`);
        card.querySelector(".play-word")!.textContent = "PLAY ↗";
        seen.mark(id);
      };
      lock.addEventListener("animationend", finish, { once: true });
      // Safety net: never leave a playable track locked.
      setTimeout(() => {
        if (card.classList.contains("unlocking")) finish();
      }, 2500);
    }
  };

  const openCollection = (collection: LevelCollection, selectedId?: string) => {
    activeCollection = collection;
    selected = selectedId
      ? Math.max(
          0,
          collection.trackIds.findIndex((t) => t === selectedId),
        )
      : 0;
    screen.querySelector("#collection-eyebrow")!.textContent =
      `${collection.trackIds.length} TRACKS`;
    screen.querySelector("#collection-title")!.textContent = collection.name;
    screen.querySelector("#collection-theme")!.textContent = collection.theme;
    collectionGrid.hidden = true;
    tracksSection.hidden = false;
    buildTrackCards(collection);
    trackButtons()[selected]?.focus();
  };

  const result = document.createElement("section");
  result.id = "track-result";
  result.hidden = true;
  result.setAttribute("role", "dialog");
  result.setAttribute("aria-modal", "true");
  result.setAttribute("aria-labelledby", "result-title");
  result.innerHTML = `<div class="result-card"><div id="result-track" class="eyebrow"></div><div id="result-medal" class="result-medal"></div><h2 id="result-title"></h2><p id="result-description"></p><div id="result-time"></div><p id="personal-best"></p><p id="result-unlock" hidden></p><div class="result-actions"><button id="next-track" hidden>Next level</button><button id="retry-track">Retry track</button><button id="result-level-select">Level select</button></div></div>`;
  host.append(screen, result);
  screen.querySelector<HTMLButtonElement>("#menu-lab")!.onclick = onLab;
  screen.querySelector<HTMLButtonElement>("#menu-tuning")!.onclick = onTuning;
  result.querySelector<HTMLButtonElement>("#retry-track")!.onclick = onRetry;
  result.querySelector<HTMLButtonElement>("#result-level-select")!.onclick =
    onMenu;
  const nextButton = result.querySelector<HTMLButtonElement>("#next-track")!;
  nextButton.onclick = onNext;
  const collectionButtons = Array.from(
    collectionGrid.querySelectorAll<HTMLButtonElement>(".collection-pick"),
  );
  const trackButtons = () =>
    Array.from(grid.querySelectorAll<HTMLButtonElement>(".track-play"));
  screen.addEventListener("keydown", (e) => {
    const inCollections =
      e.target instanceof Element && !!e.target.closest(".collection-grid");
    const inTracks =
      e.target instanceof Element && !!e.target.closest(".track-grid");
    if (!inCollections && !inTracks) return;
    const buttons = inCollections ? collectionButtons : trackButtons();
    const current = buttons.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    if (current >= 0) {
      if (inCollections) selectedCollection = current;
      else selected = current;
    }
    const activeGrid = inCollections ? collectionGrid : grid;
    const columns =
      getComputedStyle(activeGrid).gridTemplateColumns.split(" ").length;
    const delta: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -columns,
      ArrowDown: columns,
    };
    if (e.key in delta) {
      e.preventDefault();
      let next = (inCollections ? selectedCollection : selected) + delta[e.key];
      next = Math.max(0, Math.min(buttons.length - 1, next));
      if (inCollections) selectedCollection = next;
      else selected = next;
      buttons[next].focus();
    } else if (e.code === "Space") {
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat)
        buttons[inCollections ? selectedCollection : selected].click();
    } else if (e.key === "Escape" && inTracks) {
      e.preventDefault();
      screen.querySelector<HTMLButtonElement>("#collection-back")!.click();
    }
  });
  const refreshTrackCards = (collection: LevelCollection) => {
    const unlocked = new Set(unlockedIds(collection, scores, starBank));
    for (const id of collection.trackIds) {
      const track = getTrack(id);
      const best = track.legacy
        ? (["easy", "medium", "hard"] as const)
            .map((v) => ({ v, b: scores.best(track.id, v) }))
            .filter((p) => p.b)
            .sort((a, b) => a.b!.time - b.b!.time)[0]
        : { v: "default", b: scores.best(track.id) };
      const card = cards.get(track.id)!;
      const locked = !unlocked.has(id);
      card.classList.toggle("locked", locked);
      const button = card.querySelector("button")!;
      if (locked) button.setAttribute("aria-disabled", "true");
      else button.removeAttribute("aria-disabled");
      const bestTime = card.querySelector(".best-time")!;
      bestTime.textContent = best?.b ? `Best: ${best.b.time.toFixed(1)}s` : "NO TIME SET";
      bestTime.className = `best-time ${best?.b?.medal ?? ""}`;
      card.querySelector(".best-variant")!.textContent = track.legacy && best?.b ? best.v.toUpperCase() : "";
      card.querySelector(".best-medal")!.textContent =
        best?.b?.medal?.toUpperCase() ?? (best?.b ? "COMPLETED" : "UNRANKED");
      card.querySelector(".best-medal")!.className =
        `best-medal ${best?.b?.medal ?? ""}`;
      const defs = track.goldStars ?? [];
      card.querySelector(".star-row")!.innerHTML = defs
        .map((s) => {
          const lit =
            starBank?.isLit(track.id, s, isStarRelocated(track.id, s.id)) ??
            false;
          return `<span class="star ${lit ? "star-lit" : "star-unlit"}" data-star="${s.id}" title="${lit ? "Gold star collected" : "Gold star not collected yet"}">★</span>`;
        })
        .join("");
    }
  };
  const refresh = () => {
    for (const collection of LEVEL_COLLECTIONS) {
      const card = collectionCards.get(collection.id)!;
      const golds = goldCount(collection, scores);
      const { lit, total } = starProgress(collection, starBank);
      card.querySelector(".collection-gold")!.textContent =
        `🟡${golds}/${collection.trackIds.length} gold`;
      card.querySelector(".collection-gold")!.className =
        `collection-gold${golds === collection.trackIds.length ? " complete" : ""}`;
      card.querySelector(".collection-stars")!.textContent =
        `⭐${lit}/${total} stars`;
    }
    if (activeCollection && !tracksSection.hidden)
      refreshTrackCards(activeCollection);
  };
  return {
    show(hintTrackId?: string) {
      refresh();
      screen.hidden = false;
      result.hidden = true;
      host.classList.add("at-level-select");
      // Returning from play lands on the current track's collection so
      // N-hops never strand the view on a stale origin collection.
      const hinted = hintTrackId ? collectionForTrack(hintTrackId) : undefined;
      if (hinted) {
        selectedCollection = LEVEL_COLLECTIONS.indexOf(hinted);
        openCollection(hinted, hintTrackId);
      } else if (activeCollection && !tracksSection.hidden) {
        buildTrackCards(activeCollection);
        trackButtons()[selected]?.focus();
      } else {
        activeCollection = null;
        tracksSection.hidden = true;
        collectionGrid.hidden = false;
        collectionButtons[selectedCollection].focus();
      }
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
    showResult(
      run: ReturnType<TrackRun["snapshot"]>,
      personalBest: boolean,
      unlockedNames: string[] = [],
    ) {
      screen.hidden = true;
      result.hidden = false;
      result.style.opacity = "1";
      result.style.pointerEvents = "auto";
      result.inert = false;
      host.classList.remove("at-level-select");
      const completed = run.status === "completed";
      const collection = collectionForTrack(run.trackId);
      const stillOfficial =
        !!collection || officialTracks.some((t) => t.id === run.trackId);
      nextButton.hidden = !completed || !stillOfficial;
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
      const unlock = result.querySelector<HTMLElement>("#result-unlock")!;
      if (unlockedNames.length) {
        unlock.hidden = false;
        unlock.textContent =
          unlockedNames.length === 1
            ? `New track unlocked: ${unlockedNames[0]}!`
            : `New tracks unlocked: ${unlockedNames.join(", ")}!`;
      } else {
        unlock.hidden = true;
        unlock.textContent = "";
      }
      result.querySelector<HTMLButtonElement>("#retry-track")!.focus();
    },
  };
}
