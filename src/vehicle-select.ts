import { VEHICLES } from "./vehicles";
export function createVehicleSelect(
  host: HTMLElement,
  onPick: (id: string) => void,
  onBack: () => void,
) {
  const screen = document.createElement("main");
  screen.id = "vehicle-select";
  screen.hidden = true;
  screen.innerHTML = `<div class="track-select-intro"><div><div class="eyebrow">IRON FLIGHT / GARAGE</div><h1>Choose your vehicle.</h1><p>Five ways to wreck. Pick your weapon.</p></div><div class="menu-actions"><button id="vehicle-back">Level select</button></div></div><div class="track-grid"></div><p class="selection-footnote">Choose with arrow keys · Space to select · L for level select</p>`;
  const grid = screen.querySelector<HTMLElement>(".track-grid")!;
  const cards = new Map<string, HTMLElement>();
  for (const vehicle of VEHICLES) {
    const card = document.createElement("article");
    card.className = "vehicle-card";
    card.dataset.vehicle = vehicle.id;
    card.innerHTML = `<button class="vehicle-pick" aria-label="Drive the ${vehicle.name}"><div class="vehicle-preview"><img src="/vehicles/${vehicle.id}.png" alt="${vehicle.name} in-game preview" width="800" height="450"></div><div class="track-card-body"><div class="track-card-heading"><h2>${vehicle.name}</h2><span class="best-medal picked">PICKED</span></div><p>${vehicle.blurb}</p><div class="track-card-bottom"><span class="best-time">${vehicle.parts.length} PARTS</span><span class="play-word">DRIVE ↗</span></div></div></button>`;
    card.querySelector("button")!.onclick = () => onPick(vehicle.id);
    grid.append(card);
    cards.set(vehicle.id, card);
  }
  host.append(screen);
  screen.querySelector<HTMLButtonElement>("#vehicle-back")!.onclick = onBack;
  const buttons = Array.from(
    grid.querySelectorAll<HTMLButtonElement>(".vehicle-pick"),
  );
  screen.addEventListener("keydown", (e) => {
    if (!(e.target instanceof Element) || !e.target.closest(".track-grid"))
      return;
    const current = buttons.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      buttons[Math.min(buttons.length - 1, current + 1)].focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      buttons[Math.max(0, current - 1)].focus();
    } else if (e.code === "Space") {
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat && current >= 0) buttons[current].click();
    }
  });
  return {
    show() {
      const picked = localStorage.getItem("vehicle") ?? "monster-truck";
      for (const [id, card] of cards)
        card.classList.toggle("selected", id === picked);
      screen.hidden = false;
      host.classList.add("at-level-select");
      (
        grid.querySelector<HTMLElement>(`[data-vehicle="${picked}"] button`) ??
        buttons[0]
      ).focus();
    },
    hide() {
      screen.hidden = true;
      host.classList.remove("at-level-select");
    },
  };
}
