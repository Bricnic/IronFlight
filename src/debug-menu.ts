import { DEFAULT_TUNING, type Tuning } from "./tuning";
import type { Simulation } from "./simulation";
const STORAGE_KEY = "iron-flight-playtest-tuning-v1";
export function createDebugMenu(sim: Simulation) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) sim.setTuning(JSON.parse(saved));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  const menu = document.createElement("section");
  menu.id = "debug-menu";
  menu.hidden = true;
  menu.setAttribute("aria-label", "Playtest tuning");
  const labels: Record<keyof Tuning, string> = {
    acceleration: "Acceleration",
    topSpeed: "Top speed",
    boostPower: "Boost pad power",
    friction: "Coasting friction",
    steeringRate: "Tire steering rate",
  };
  menu.innerHTML = `<div class="eyebrow">PLAYTEST TUNING <span>\u0060 TO CLOSE</span></div><h2>Make it your own.</h2><p>Live adjustments · saved on this browser</p>${(Object.keys(labels) as (keyof Tuning)[]).map((key) => `<label for="tune-${key}">${labels[key]}<output id="value-${key}"></output></label><input id="tune-${key}" type="range" min="1" max="10" step="0.1" value="${sim.tuning[key]}">`).join("")}<button id="reset-tuning">Reset tuning</button>`;
  document.getElementById("app")!.append(menu);
  const sync = () => {
    for (const key of Object.keys(labels) as (keyof Tuning)[]) {
      (menu.querySelector(`#tune-${key}`) as HTMLInputElement).value = String(
        sim.tuning[key],
      );
      menu.querySelector(`#value-${key}`)!.textContent =
        `${sim.tuning[key].toFixed(1)}×`;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sim.tuning));
  };
  for (const key of Object.keys(labels) as (keyof Tuning)[]) {
    menu.querySelector(`#tune-${key}`)!.addEventListener("input", (e) => {
      sim.setTuning({ [key]: Number((e.target as HTMLInputElement).value) });
      sync();
    });
  }
  menu.querySelector("button")!.onclick = () => {
    sim.setTuning(DEFAULT_TUNING);
    sync();
  };
  sync();
  return () => {
    menu.hidden = !menu.hidden;
  };
}
