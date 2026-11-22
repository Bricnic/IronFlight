export interface PauseMenuActions {
  onResume: () => void;
  onReset: () => void;
  onLevelSelect: () => void;
  onVehicleSelect: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSettings: () => void;
}

/** Start-button pause overlay: resume or jump without touching the keyboard. */
export function createPauseMenu(host: HTMLElement, actions: PauseMenuActions) {
  const screen = document.createElement("section");
  screen.id = "pause-menu";
  screen.hidden = true;
  screen.setAttribute("role", "dialog");
  screen.setAttribute("aria-modal", "true");
  screen.setAttribute("aria-labelledby", "pause-title");
  const entries = [
    ["resume", "Resume game", actions.onResume],
    ["reset", "Reset level", actions.onReset],
    ["levels", "Level select", actions.onLevelSelect],
    ["vehicles", "Vehicle select", actions.onVehicleSelect],
    ["next", "Next track", actions.onNext],
    ["prev", "Previous track", actions.onPrev],
    ["settings", "Settings", actions.onSettings],
  ] as const;
  screen.innerHTML = `<div class="pause-card"><div class="eyebrow">PAUSED</div><h2 id="pause-title">Take a breath.</h2><div class="pause-actions">${entries.map(([id, label]) => `<button id="pause-${id}">${label}</button>`).join("")}</div><p class="pause-hint">D-pad or left stick to choose · A to confirm · Y to reset · B, Start or Escape to resume</p></div>`;
  for (const [id, , fn] of entries)
    screen.querySelector<HTMLButtonElement>(`#pause-${id}`)!.onclick = fn;
  host.append(screen);
  const buttons = Array.from(screen.querySelectorAll<HTMLButtonElement>(".pause-actions button"));
  let selected = 0;
  buttons.forEach((button, index) => button.addEventListener("focus", () => { selected = index; }));
  screen.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      focusSelected(selected + (e.key === "ArrowDown" ? 1 : -1));
    }
  });
  function focusSelected(index: number) {
    selected = (index + buttons.length) % buttons.length;
    buttons[selected].focus();
  }
  return {
    show() {
      screen.hidden = false;
      selected = 0;
      buttons[0].focus();
    },
    hide() {
      screen.hidden = true;
    },
    isVisible() {
      return !screen.hidden;
    },
    /** Controller d-pad step with wraparound. */
    focusNext(dir: 1 | -1) {
      focusSelected(selected + dir);
    },
    /** Controller A button: activate the focused option. */
    activate() {
      buttons[selected].click();
    },
  };
}
