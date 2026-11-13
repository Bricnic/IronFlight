import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { platform } from "node:os";

// The driver is a Windows batch file; CI runs Ubuntu, so this suite only runs
// on win32. Verified locally: `cmd /c scripts\generate-levels.cmd --dry-run`.
describe.runIf(platform() === "win32")("generate-levels.cmd", () => {
  const run = (...args: string[]): string =>
    execFileSync("cmd.exe", ["/c", "scripts\\generate-levels.cmd", ...args], {
      encoding: "utf8",
    });

  it("--dry-run prints effective config without executing", () => {
    const out = run("--dry-run", "--set", "theme", "christmas", "--set", "gemini", "false");
    expect(out).toContain("[dry-run]");
    expect(out).toContain("muse exec --yolo");
    expect(out).toContain("--prompt-file");
    expect(out).toContain("level-generation.md");
    expect(out).toContain("--workspace");
    expect(out).toContain("theme=christmas");
    expect(out).toContain("gemini=false");
    expect(out).toContain("levels=5");
    expect(out).toContain("decor=6");
    expect(out).toContain("destructibles=5");
    expect(out).toContain("backgrounds=2");
    expect(out).toContain("lethals=8");
    expect(out).toContain("goldMin=45");
    expect(out).toContain("goldMax=200");
    expect(out).toContain("idealMin=45");
    expect(out).toContain("idealMax=300");
    expect(out).toContain("nothing executed");
  });

  it("--help explains usage", () => {
    expect(run("--help")).toContain("Usage:");
  });

  it("rejects unknown keys and flags with exit 2", () => {
    for (const args of [
      ["--dry-run", "--set", "bogus", "1"],
      ["--frobnicate"],
      ["--set", "theme"],
    ]) {
      try {
        run(...args);
        expect.unreachable(`expected failure for ${args.join(" ")}`);
      } catch (e) {
        expect((e as { status?: number }).status).toBe(2);
      }
    }
  });
});
