import {
  validateCustomLevel,
  toTrack,
  registerCustomTrack,
  getCustomTrack,
  type CustomLevel,
} from "./custom-level";
export interface LevelStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface LevelStoreDeps {
  fetchFn: typeof fetch;
  storage: LevelStorage;
}
const INDEX_KEY = "iron-flight-custom-levels-v1";
const levelKey = (name: string) => `iron-flight-custom-level-v1:${name}`;
function depsOrDefaults(deps?: Partial<LevelStoreDeps>): LevelStoreDeps {
  return {
    fetchFn: deps?.fetchFn ?? globalThis.fetch,
    storage: deps?.storage ?? globalThis.localStorage,
  };
}
function readIndex(storage: LevelStorage): string[] {
  try {
    const parsed = JSON.parse(storage.getItem(INDEX_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "string") : [];
  } catch {
    return [];
  }
}
function writeIndex(storage: LevelStorage, names: string[]) {
  storage.setItem(INDEX_KEY, JSON.stringify(names));
}
async function serverNames(fetchFn: typeof fetch): Promise<string[] | null> {
  try {
    const res = await fetchFn("/__levels");
    if (!res.ok) return null;
    const names = (await res.json()) as unknown;
    return Array.isArray(names) ? names.filter((n) => typeof n === "string") : null;
  } catch {
    return null;
  }
}
/** Union of disk levels and local-only levels, disk first. */
export async function listLevels(deps?: Partial<LevelStoreDeps>) {
  const { fetchFn, storage } = depsOrDefaults(deps);
  const names = [...readIndex(storage)];
  for (const name of (await serverNames(fetchFn)) ?? [])
    if (!names.includes(name)) names.unshift(name);
  return names;
}
/** Validate, register the playable track, mirror locally, persist to disk. */
export async function saveLevel(
  deps: Partial<LevelStoreDeps> | undefined,
  level: CustomLevel,
) {
  const { fetchFn, storage } = depsOrDefaults(deps);
  const valid = validateCustomLevel(level);
  registerCustomTrack(toTrack(valid));
  storage.setItem(levelKey(valid.name), JSON.stringify(valid));
  const names = readIndex(storage);
  if (!names.includes(valid.name)) writeIndex(storage, [...names, valid.name]);
  // Transient disk hiccups (file locks, slow AV scans) retry; deterministic
  // rejections (400) and total outages still fall back to the local mirror.
  const body = JSON.stringify({ name: valid.name, level: valid });
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetchFn("/__levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok || (res.status >= 400 && res.status < 500)) return valid;
    } catch {
      // Fall through to the retry below.
    }
    if (attempt >= 3) return valid;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
/** Load from disk, falling back to the local mirror, and register the track. */
export async function loadLevel(
  deps: Partial<LevelStoreDeps> | undefined,
  name: string,
): Promise<CustomLevel> {
  const { fetchFn, storage } = depsOrDefaults(deps);
  let raw: unknown = null;
  try {
    const res = await fetchFn(`/__levels?name=${encodeURIComponent(name)}`);
    if (res.ok) raw = (await res.json()) as unknown;
  } catch {
    raw = null;
  }
  if (!raw) {
    const cached = storage.getItem(levelKey(name));
    if (cached) raw = JSON.parse(cached) as unknown;
  }
  if (!raw) throw new Error(`Unknown custom level: ${name}`);
  const level = validateCustomLevel(raw);
  // Reads must not clobber a live-registered track (in-playtest edits keep
  // stable gate ids that a fresh positional build would renumber).
  const track = toTrack(level);
  if (!getCustomTrack(track.id)) registerCustomTrack(track);
  return level;
}
export async function removeLevel(
  deps: Partial<LevelStoreDeps> | undefined,
  name: string,
) {
  const { fetchFn, storage } = depsOrDefaults(deps);
  try {
    await fetchFn(`/__levels?name=${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  } catch {
    // Local purge below still applies.
  }
  storage.removeItem(levelKey(name));
  writeIndex(
    storage,
    readIndex(storage).filter((n) => n !== name),
  );
}
export function exportLevel(level: CustomLevel) {
  return JSON.stringify(validateCustomLevel(level), null, 2) + "\n";
}
export async function importLevel(
  deps: Partial<LevelStoreDeps> | undefined,
  json: string,
) {
  return saveLevel(deps, validateCustomLevel(JSON.parse(json) as unknown));
}
/** Register every stored level at boot; never blocks the menu. */
export async function registerStoredTracks(deps?: Partial<LevelStoreDeps>) {
  try {
    for (const name of await listLevels(deps)) await loadLevel(deps, name);
  } catch {
    // Custom levels are optional; the menu still opens.
  }
}
