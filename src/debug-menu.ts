import { createTruckColorPickers, type TruckColorKey } from "./color-picker";
import {
  DEFAULT_TUNING,
  replaceDefaults,
  tuningRange,
  type Tuning,
} from "./tuning";
import type { Simulation } from "./simulation";
const STORAGE_KEY = "iron-flight-playtest-tuning-v3";
export async function createDebugMenu(sim: Simulation) {
  if (import.meta.env.DEV) {
    const response = await fetch("/__tuning-defaults");
    if (response.ok) {
      replaceDefaults(await response.json());
      sim.setTuning(DEFAULT_TUNING);
    }
  }
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
  const labels: Record<Exclude<keyof Tuning, TruckColorKey>, string> = {
    acceleration: "Acceleration",
    topSpeed: "Top speed",
    boostPower: "Boost pad power",
    friction: "Coasting friction",
    steeringRate: "Tire steering rate",
    turningPower: "Turning power",
    brakePower: "Brake power",
    maxSteeringAngle: "Maximum tire angle",
    dragonDamage: "Dragon damage per tick",
    hammerSpeed: "Hammer spin rate",
    handbrakePower: "Handbrake multiplier",
    shadowDarkness: "Truck shadow darkness",
    gravity: "Gravity strength",
  };
  menu.innerHTML = `<div class="eyebrow">PLAYTEST TUNING <span>\u0060 TO CLOSE</span></div><h2>Make it your own.</h2><p>Live adjustments · saved on this browser</p><div id="truck-colors" class="truck-colors"></div>${(Object.keys(labels) as (keyof typeof labels)[]).map((key) => `<label for="tune-${key}">${labels[key]}<output id="value-${key}"></output></label><input id="tune-${key}" type="range" min="${tuningRange(key).min}" max="${tuningRange(key).max}" step="${tuningRange(key).step}" value="${sim.tuning[key]}">`).join("")}<button id="store-defaults">Store as Defaults</button><button id="reset-tuning">Reset tuning</button><p id="tuning-status" role="status" aria-live="polite"></p>`;
  document.getElementById("app")!.append(menu);
  const sync = () => {
    for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
      (menu.querySelector(`#tune-${key}`) as HTMLInputElement).value = String(
        sim.tuning[key],
      );
      menu.querySelector(`#value-${key}`)!.textContent =
        key === "maxSteeringAngle"
          ? `${sim.tuning[key]}°`
          : `${sim.tuning[key].toFixed(1)}×`;
    }
    syncColors(sim.tuning);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sim.tuning));
  };
  const syncColors = createTruckColorPickers(
    menu.querySelector<HTMLElement>("#truck-colors")!,
    (values) => {
      sim.setTuning(values);
      sync();
    },
  );
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
    menu.querySelector(`#tune-${key}`)!.addEventListener("input", (e) => {
      sim.setTuning({ [key]: Number((e.target as HTMLInputElement).value) });
      sync();
    });
  }
  const status = menu.querySelector<HTMLElement>("#tuning-status")!;
  const store = menu.querySelector<HTMLButtonElement>("#store-defaults")!;
  store.disabled = !import.meta.env.DEV;
  if (store.disabled)
    store.title =
      "Saving source defaults is available in the local development server.";
  store.onclick = async () => {
    store.disabled = true;
    try {
      const response = await fetch("/__tuning-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sim.tuning),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Save failed");
      replaceDefaults(result);
      sync();
      status.textContent = "Stored in src/tuning-defaults.json.";
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Unable to store defaults.";
    } finally {
      store.disabled = false;
    }
  };
  menu.querySelector<HTMLButtonElement>("#reset-tuning")!.onclick =
    async () => {
      try {
        if (import.meta.env.DEV) {
          const response = await fetch("/__tuning-defaults");
          if (!response.ok) throw new Error("Cannot read source defaults");
          replaceDefaults(await response.json());
        }
        sim.setTuning(DEFAULT_TUNING);
        sync();
        status.textContent = "Restored source defaults.";
      } catch (error) {
        status.textContent =
          error instanceof Error ? error.message : "Unable to reset tuning.";
      }
    };
  sync();
  return () => {
    menu.hidden = !menu.hidden;
    if (menu.hidden && menu.contains(document.activeElement))
      (document.activeElement as HTMLElement).blur();
  };
}
