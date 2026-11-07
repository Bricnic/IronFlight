import { createTruckColorPickers, type TruckColorKey } from "./color-picker";
import {
  DEFAULT_TUNING,
  replaceDefaults,
  tuningRange,
  type Tuning,
} from "./tuning";
import type { Simulation } from "./simulation";
import {
  PROGRESS_FONT_DEFAULT,
  applyProgressFont,
  loadProgressFont,
  saveProgressFont,
} from "./progress-font";
const GHOSTS_KEY = "iron-flight-graveyard-ghosts";
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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  try {
    sim.ghostsEnabled = localStorage.getItem(GHOSTS_KEY) !== "false";
  } catch {}
  const menu = document.createElement("section");
  menu.id = "debug-menu";
  menu.hidden = true;
  menu.setAttribute("aria-label", "Playtest tuning");
  const labels: Record<Exclude<keyof Tuning, TruckColorKey>, string> = {
    acceleration: "Acceleration",
    topSpeed: "Top speed",
    canyonTopSpeed: "Canyon Plunge top speed",
    slideWaterSpeed: "Sky Slide water speed (100 MPH base)",
    boostPower: "Boost pad power",
    friction: "Coasting friction",
    steeringRate: "Tire steering rate",
    turningPower: "Turning power",
    brakePower: "Brake power",
    maxSteeringAngle: "Maximum tire angle",
    dragonDamage: "Dragon damage per tick",
    hammerSpeed: "Hammer spin rate",
    axeSpeed: "Axe swing speed",
    carouselSpeed: "Carousel spin speed",
    carouselRestriction: "Carousel movement restriction",
    bumperSpeed: "Bumper car speed",
    handbrakePower: "Handbrake multiplier",
    shadowDarkness: "Truck shadow darkness",
    gravity: "Gravity strength",
  };
  const sliderKeys = (Object.keys(labels) as (keyof typeof labels)[])
    .sort((a, b) => labels[a].localeCompare(labels[b]));
  menu.innerHTML = `<div class="eyebrow">PLAYTEST TUNING <span>\u0060 TO CLOSE</span></div><h2>Make it your own.</h2><p>Live adjustments · saved on this browser</p><label class="debug-toggle" for="debug-ghosts"><span>Enable graveyard ghosts</span><input id="debug-ghosts" type="checkbox"></label><label for="objective-font-size">Objective font size<output id="objective-font-size-value"></output></label><input id="objective-font-size" type="range" min="1" max="10" step="0.1" value="1.3"><div id="truck-colors" class="truck-colors"></div>${sliderKeys.map((key) => `<label for="tune-${key}">${labels[key]}<output id="value-${key}"></output></label><input id="tune-${key}" type="range" min="${tuningRange(key).min}" max="${tuningRange(key).max}" step="${tuningRange(key).step}" value="${sim.tuning[key]}">`).join("")}<button id="store-defaults">Store as Defaults</button><button id="reset-tuning">Reset tuning</button><p id="tuning-status" role="status" aria-live="polite"></p>`;
  document.getElementById("app")!.append(menu);
  const ghostToggle = menu.querySelector<HTMLInputElement>("#debug-ghosts")!;
  const setGhostsEnabled = (enabled: boolean) => {
    sim.ghostsEnabled = enabled;
    sync();
  };
  ghostToggle.addEventListener("change", () =>
    setGhostsEnabled(ghostToggle.checked),
  );
  const fontInput =
    menu.querySelector<HTMLInputElement>("#objective-font-size")!;
  const fontOutput = menu.querySelector<HTMLElement>(
    "#objective-font-size-value",
  )!;
  const paintFont = () => {
    const value = loadProgressFont();
    fontInput.value = String(value);
    fontOutput.textContent = `${value.toFixed(1)}×`;
    const counter = document.getElementById("run-progress");
    if (counter) applyProgressFont(counter, value);
  };
  const setProgressFont = (value: number) => {
    saveProgressFont(value);
    paintFont();
  };
  fontInput.addEventListener("input", () =>
    setProgressFont(Number(fontInput.value)),
  );
  const sync = () => {
    ghostToggle.checked = sim.ghostsEnabled;
    paintFont();
    for (const key of sliderKeys) {
      (menu.querySelector(`#tune-${key}`) as HTMLInputElement).value = String(
        sim.tuning[key],
      );
      menu.querySelector(`#value-${key}`)!.textContent =
        key === "carouselRestriction"
          ? sim.tuning[key].toFixed(1)
          : key === "slideWaterSpeed"
          ? `${sim.tuning[key].toFixed(1)}× · ${Math.round(sim.tuning[key] * 100)} MPH`
          : key === "canyonTopSpeed"
            ? `${sim.tuning[key].toFixed(1)}× · ${(sim.tuning.topSpeed * sim.tuning[key]).toFixed(1)}× total`
            : key === "maxSteeringAngle"
              ? `${sim.tuning[key]}°`
              : `${sim.tuning[key].toFixed(1)}×`;
    }
    syncColors(sim.tuning);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sim.tuning));
      localStorage.setItem(GHOSTS_KEY, String(sim.ghostsEnabled));
    } catch {}
  };
  const syncColors = createTruckColorPickers(
    menu.querySelector<HTMLElement>("#truck-colors")!,
    (values) => {
      sim.setTuning(values);
      sync();
    },
  );
  for (const key of sliderKeys) {
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
        setGhostsEnabled(true);
        setProgressFont(PROGRESS_FONT_DEFAULT);
        status.textContent = "Restored source defaults.";
      } catch (error) {
        status.textContent =
          error instanceof Error ? error.message : "Unable to reset tuning.";
      }
    };
  sync();
  return {
    toggleDebug() {
      menu.hidden = !menu.hidden;
      if (menu.hidden && menu.contains(document.activeElement))
        (document.activeElement as HTMLElement).blur();
    },
    toggleGhosts() {
      setGhostsEnabled(!sim.ghostsEnabled);
    },
  };
}
