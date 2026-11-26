import { VEHICLES, getVehicle } from "./vehicles";
import { allowLockedContent, DEBUG_ACCESS_CHANGED } from "./debug-access";
import { UnlockSeen } from "./level-unlocks";
import {
  dreamCarRequirement,
  isDreamCar,
  isDreamCarUnlocked,
} from "./dream-cars";
import type { BestTimes } from "./best-times";
import type { GoldStars } from "./gold-stars";

const LOCK_SVG = `<svg viewBox="0 0 24 24" width="72" height="72" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>`;

export function createVehicleSelect(
  host: HTMLElement,
  onPick: (id: string) => void,
  onBack: () => void,
  scores?: BestTimes,
  starBank?: GoldStars,
  unlockSeen?: UnlockSeen,
) {
  const pickedVehicle = () => {
    const stored = localStorage.getItem("vehicle") ?? "monster-truck";
    return VEHICLES.some(v => v.id === stored) || stored === "saturn-saucer"
      ? getVehicle(stored).id
      : "monster-truck";
  };
  const seen =
    unlockSeen ??
    new UnlockSeen({
      getItem: (k) => localStorage.getItem(k),
      setItem: (k, v) => localStorage.setItem(k, v),
    });
  const screen = document.createElement("main");
  screen.id = "vehicle-select";
  screen.hidden = true;
  screen.innerHTML = `<div class="track-select-intro"><div><div class="eyebrow">IRON FLIGHT / GARAGE</div><h1>Choose your vehicle.</h1><p>${VEHICLES.length} ways to wreck. Pick your vehicle.</p></div><div class="menu-actions"><button id="vehicle-back">Level select</button></div></div><div class="track-grid"></div><p class="selection-footnote">Choose with arrow keys, D-pad or left stick · A confirms · B goes back · Space to select · L for level select · C for vehicle select</p><div id="vehicle-lock-toast" role="status" hidden></div>`;
  const grid = screen.querySelector<HTMLElement>(".track-grid")!;
  const cards = new Map<string, HTMLElement>();
  const toast = screen.querySelector<HTMLElement>("#vehicle-lock-toast")!;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const showLockToast = (message: string) => {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2400);
  };
  const isLocked = (id: string) =>
    !allowLockedContent() && isDreamCar(id) && !isDreamCarUnlocked(id, scores!, starBank);
  const buildCards = () => {
    grid.innerHTML = "";
    cards.clear();
    for (const vehicle of VEHICLES) {
      const locked = scores ? isLocked(vehicle.id) : false;
      const card = document.createElement("article");
      card.className = `vehicle-card${locked ? " locked" : ""}`;
      card.dataset.vehicle = vehicle.id;
      card.innerHTML = `<button class="vehicle-pick" aria-label="${locked ? `${vehicle.name} (locked)` : `Drive the ${vehicle.name}`}"><div class="vehicle-preview"><img src="/vehicles/${vehicle.id}.png" alt="${vehicle.name} in-game preview" width="800" height="450">${locked ? `<span class="track-lock">${LOCK_SVG}</span>` : ""}</div><div class="track-card-body"><div class="track-card-heading"><h2>${vehicle.name}</h2><span class="best-medal picked">PICKED</span></div><p>${vehicle.blurb}</p><div class="track-card-bottom"><span class="best-time">${vehicle.parts.length} PARTS</span><span class="play-word">${locked ? "LOCKED" : "DRIVE ↗"}</span></div></div></button>`;
      card.querySelector("button")!.onclick = () => {
        if (card.classList.contains("locked")) {
          if (card.classList.contains("unlocking")) return;
          showLockToast(dreamCarRequirement(vehicle.id));
          if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          card.classList.remove("shake");
          void card.offsetWidth;
          card.classList.add("shake");
          return;
        }
        onPick(vehicle.id);
      };
      card.addEventListener("animationend", (e) => {
        if (e.animationName === "card-shake") card.classList.remove("shake");
      });
      grid.append(card);
      cards.set(vehicle.id, card);
    }
  };
  /** Newly earned dream cars burst open on first sight, like tracks. */
  const playUnlockAnimations = () => {
    if (!scores || allowLockedContent()) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const picked = pickedVehicle();
    for (const vehicle of VEHICLES) {
      if (!isDreamCar(vehicle.id) || isLocked(vehicle.id)) continue;
      if (vehicle.id === picked || seen.has(vehicle.id)) continue;
      if (reduced) {
        seen.mark(vehicle.id);
        continue;
      }
      const card = cards.get(vehicle.id);
      if (!card) continue;
      card.classList.add("locked", "unlocking");
      const button = card.querySelector("button")!;
      button.setAttribute("aria-disabled", "true");
      const preview = card.querySelector(".vehicle-preview")!;
      const lock = document.createElement("span");
      lock.className = "track-lock unlocking-lock";
      lock.innerHTML = LOCK_SVG;
      preview.append(lock);
      const finish = () => {
        lock.remove();
        card.classList.remove("locked", "unlocking");
        button.removeAttribute("aria-disabled");
        button.setAttribute("aria-label", `Drive the ${vehicle.name}`);
        card.querySelector(".play-word")!.textContent = "DRIVE ↗";
        seen.mark(vehicle.id);
      };
      lock.addEventListener("animationend", finish, { once: true });
      setTimeout(() => {
        if (card.classList.contains("unlocking")) finish();
      }, 2500);
    }
  };
  host.append(screen);
  window.addEventListener(DEBUG_ACCESS_CHANGED, () => {
    if (screen.hidden) return;
    buildCards();
    const picked = pickedVehicle();
    for (const [id, card] of cards)
      card.classList.toggle("selected", id === picked);
  });
  screen.querySelector<HTMLButtonElement>("#vehicle-back")!.onclick = onBack;
  const buttons = () =>
    Array.from(grid.querySelectorAll<HTMLButtonElement>(".vehicle-pick"));
  screen.addEventListener("keydown", (e) => {
    if (!(e.target instanceof Element) || !e.target.closest(".track-grid"))
      return;
    const current = buttons().indexOf(
      document.activeElement as HTMLButtonElement,
    );
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      buttons()[Math.min(buttons().length - 1, current + 1)].focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      buttons()[Math.max(0, current - 1)].focus();
    } else if (e.code === "Space") {
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat && current >= 0) buttons()[current].click();
    }
  });
  return {
    show() {
      buildCards();
      const picked = pickedVehicle();
      for (const [id, card] of cards)
        card.classList.toggle("selected", id === picked);
      screen.hidden = false;
      host.classList.add("at-level-select");
      (
        grid.querySelector<HTMLElement>(`[data-vehicle="${picked}"] button`) ??
        buttons()[0]
      ).focus();
      playUnlockAnimations();
    },
    hide() {
      screen.hidden = true;
      host.classList.remove("at-level-select");
    },
  };
}
