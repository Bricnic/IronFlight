import { expect, it, vi } from "vitest";
import {
  listLevels,
  saveLevel,
  loadLevel,
  removeLevel,
  exportLevel,
  importLevel,
  type LevelStoreDeps,
} from "../src/level-store";
import type { CustomLevel } from "../src/custom-level";
const level = (name: string): CustomLevel => ({
  name,
  mode: "race",
  spawn: { x: 0, y: 2.1, z: -100, yaw: 0 },
  checkpoints: [{ x: 0, z: 0 }],
  solids: [
    {
      id: "ground",
      kind: "ground",
      x: 0,
      y: -0.6,
      z: 0,
      w: 200,
      h: 1.2,
      d: 400,
      color: 0x6d817c,
    },
  ],
  prefabs: [],
  medals: { gold: 35, silver: 50, bronze: 75 },
});
function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}
/** In-memory /__levels server. */
function serverBackend(down = false) {
  const files = new Map<string, unknown>();
  const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
    if (down) throw new TypeError("server unreachable");
    const u = new URL(url, "http://127.0.0.1:5173");
    if (u.pathname !== "/__levels")
      return { ok: false, status: 404, json: async () => ({}) };
    if (!init?.method || init.method === "GET") {
      const name = u.searchParams.get("name");
      if (name) {
        if (!files.has(name))
          return { ok: false, status: 404, json: async () => ({}) };
        return { ok: true, status: 200, json: async () => files.get(name) };
      }
      return { ok: true, status: 200, json: async () => [...files.keys()] };
    }
    if (init.method === "POST") {
      const body = JSON.parse(init.body as string) as {
        name: string;
        level: unknown;
      };
      files.set(body.name, body.level);
      return { ok: true, status: 200, json: async () => body.level };
    }
    if (init.method === "DELETE") {
      files.delete(u.searchParams.get("name") ?? "");
      return { ok: true, status: 200, json: async () => ({}) };
    }
    return { ok: false, status: 405, json: async () => ({}) };
  });
  return { files, fetchFn };
}
function deps(down = false): LevelStoreDeps & { storage: ReturnType<typeof memoryStorage>; backend: ReturnType<typeof serverBackend> } {
  const storage = memoryStorage();
  const backend = serverBackend(down);
  return {
    storage,
    backend,
    fetchFn: backend.fetchFn as unknown as typeof fetch,
  };
}
it("round-trips levels through the disk endpoint", async () => {
  const d = deps();
  expect(await listLevels(d)).toEqual([]);
  await saveLevel(d, level("Alpha"));
  await saveLevel(d, level("Beta"));
  expect(await listLevels(d)).toEqual(["Alpha", "Beta"]);
  expect(await loadLevel(d, "Alpha")).toMatchObject({ name: "Alpha" });
  expect(d.backend.files.has("Alpha")).toBe(true);
  await removeLevel(d, "Alpha");
  expect(await listLevels(d)).toEqual(["Beta"]);
  expect(d.backend.files.has("Alpha")).toBe(false);
});
it("rejects invalid levels before any write", async () => {
  const d = deps();
  await expect(
    saveLevel(d, { ...level("Bad"), checkpoints: [] }),
  ).rejects.toThrow(/checkpoint/);
  expect(d.backend.fetchFn).not.toHaveBeenCalled();
  expect(await listLevels(d)).toEqual([]);
});
it("falls back to the local mirror when the server is down", async () => {
  const d = deps(true);
  await saveLevel(d, level("Offline"));
  expect(await listLevels(d)).toEqual(["Offline"]);
  expect(await loadLevel(d, "Offline")).toMatchObject({ name: "Offline" });
  await removeLevel(d, "Offline");
  expect(await listLevels(d)).toEqual([]);
});
it("merges server and local-only levels in listings", async () => {
  const d = deps();
  await saveLevel(d, level("On Disk"));
  const offline: LevelStoreDeps = {
    storage: d.storage,
    fetchFn: (async () => {
      throw new TypeError("down");
    }) as unknown as typeof fetch,
  };
  await saveLevel(offline, level("Local Only"));
  expect(await listLevels(d)).toEqual(["On Disk", "Local Only"]);
});
it("exports and imports level JSON", async () => {
  const d = deps();
  const json = exportLevel(level("Portable"));
  expect(JSON.parse(json).name).toBe("Portable");
  await importLevel(d, json);
  expect(await listLevels(d)).toContain("Portable");
  await expect(importLevel(d, "{broken")).rejects.toThrow();
  await expect(
    importLevel(d, JSON.stringify({ ...level("X"), checkpoints: [] })),
  ).rejects.toThrow(/checkpoint/);
});
it("missing levels raise a clear error", async () => {
  const d = deps();
  await expect(loadLevel(d, "Ghost")).rejects.toThrow(/Ghost/);
});
it("registers the playable track on save, replacing stale versions", async () => {
  const d = deps();
  const { getTrack } = await import("../src/tracks");
  await saveLevel(d, level("Fresh Play"));
  expect(getTrack("custom:fresh-play").checkpoints).toHaveLength(1);
  const revised = level("Fresh Play");
  revised.checkpoints.push({ x: 10, z: 50 });
  await saveLevel(d, revised);
  expect(getTrack("custom:fresh-play").checkpoints).toHaveLength(2);
});
