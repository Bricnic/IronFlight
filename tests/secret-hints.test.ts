import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { TRACKS } from "../src/tracks";
import { officialFileTracks } from "../src/official-levels";

it("secret hints cover every level exactly once, sorted A-Z", () => {
  const lines = readFileSync("secret_hints.txt", "utf8").trim().split(/\r?\n/);
  expect(lines).toHaveLength(54);
  const names = lines.map((line) => {
    const sep = line.indexOf(":");
    expect(sep, `level name and hint in "${line}"`).toBeGreaterThan(0);
    const name = line.slice(0, sep).trim();
    const hint = line.slice(sep + 1).trim();
    expect(name.length, `level name in "${line}"`).toBeGreaterThan(0);
    expect(hint.length, `hint for "${name}"`).toBeGreaterThan(0);
    return name;
  });
  // Sorted A-Z by level name (ordinal).
  const sorted = [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  expect(names).toEqual(sorted);
  // Covers every legacy + official display name exactly once.
  const expected = [...TRACKS, ...officialFileTracks].map((t) => t.name);
  expect(new Set(names)).toEqual(new Set(expected));
  expect(new Set(names).size).toBe(54);
});
