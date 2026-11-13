import { describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveKeyCandidates } from "../scripts/gemini-image.mjs";

async function makeDir(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "gemini-key-"));
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content);
  }
  return dir;
}

describe("gemini key discovery", () => {
  it("prefers the named keyfile, then sorted gemini*.txt siblings", async () => {
    const dir = await makeDir({
      "gemini_api_key.txt": "preferred-key",
      "gemini_key.txt": "sibling-key",
      "gemini-backup.txt": "backup-key",
      "notes.txt": "not-a-key",
    });
    try {
      const found = await resolveKeyCandidates(join(dir, "gemini_api_key.txt"));
      expect(found.map((c) => c.path)).toEqual([
        join(dir, "gemini_api_key.txt"),
        join(dir, "gemini-backup.txt"),
        join(dir, "gemini_key.txt"),
      ]);
      expect(found[0].key).toBe("preferred-key");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("discovers a sibling when the named keyfile is missing", async () => {
    const dir = await makeDir({ "gemini_key.txt": "sibling-key" });
    try {
      const found = await resolveKeyCandidates(join(dir, "gemini_api_key.txt"));
      expect(found.map((c) => c.path)).toEqual([join(dir, "gemini_key.txt")]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("skips empty key files", async () => {
    const dir = await makeDir({
      "gemini_api_key.txt": "   \n",
      "gemini-empty.txt": "",
      "gemini_key.txt": "sibling-key",
    });
    try {
      const found = await resolveKeyCandidates(join(dir, "gemini_api_key.txt"));
      expect(found.map((c) => c.path)).toEqual([join(dir, "gemini_key.txt")]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns no candidates when nothing matches", async () => {
    const dir = await makeDir({ "notes.txt": "not-a-key" });
    try {
      await expect(resolveKeyCandidates(join(dir, "gemini_api_key.txt"))).resolves.toEqual([]);
      await expect(
        resolveKeyCandidates(join(dir, "no-such-dir", "gemini_api_key.txt")),
      ).resolves.toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
