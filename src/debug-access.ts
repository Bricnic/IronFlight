const STORAGE_KEY = "iron-flight-debug-allow-locked-content";
export const DEBUG_ACCESS_CHANGED = "debug-access-changed";

let override: boolean | undefined;

export function allowLockedContent(): boolean {
  if (override !== undefined) return override;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setAllowLockedContent(enabled: boolean) {
  override = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {}
  window.dispatchEvent(new Event(DEBUG_ACCESS_CHANGED));
}
