#!/usr/bin/env node
/**
 * Pipeline: generate a fleet of new vehicles with Gemini concept art,
 * implement them on the standard chassis, prove each one on every level,
 * and push.
 *
 * Usage:
 *   node scripts/generate-vehicles.mjs [--dry-run] [--config PATH]
 *     [--count N] [--only <id>] [--no-push]
 *
 * Config (default config/vehicle-gen.json):
 *   count            TOTAL fleet size the run converges to (top-up semantics:
 *                    a count=1 pilot followed by count=10 ends with 10 total,
 *                    keeping the pilot car). Default 10.
 *   keyFile          Gemini API key file. Read by THIS script into the
 *                    GEMINI_API_KEY env var for child runs; never printed,
 *                    never committed. Default C:\Code\gemini_api_key.txt.
 *   styleReference   Existing vehicle render passed to Gemini as the style
 *                    anchor for every concept. Default the truck preview.
 *   artDir           Concept-art + ledger dir. Default generated/.
 *   modelSteps       --max-model-steps per muse run. Default 150.
 *   timeoutMinutes   Timeout per muse run. Default 90.
 *   port             First dev-server port to try (scans upward). Default 5240.
 *   push / pushTarget  Push origin HEAD:<pushTarget> when everything passes.
 *   knownFailures    Unit-test names allowed to fail (pre-existing reds).
 *                    Anything else failing blocks the push.
 *
 * Phases: ideation (one muse run: ideas + Gemini art) -> one build run per
 * vehicle (code + ledger + preview + validation) -> gates (tsc, full unit
 * suite vs the allowlist, vite build) -> commit + push. Resuming is safe:
 * complete ideas are skipped, partial ones are finished by their build run.
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ART = join(ROOT, "artifacts", "vehicle-gen");
const PROMPTS = join(ART, "prompts");
const IDEAS = join(ART, "ideas.json");
const PW_CONFIG = join(ART, "playwright.gen.cjs");
const DEFAULT_CONFIG = join(ROOT, "config", "vehicle-gen.json");

const DEFAULTS = {
  count: 10,
  keyFile: "C:\\Code\\gemini_api_key.txt",
  styleReference: "public/vehicles/monster-truck.png",
  artDir: "visual-plan/refs/gemini/generated",
  modelSteps: 150,
  timeoutMinutes: 90,
  port: 5240,
  push: true,
  pushTarget: "main",
  knownFailures: [
    "completes all 15 chests within the five-minute limit",
    "every track resolves a background template",
  ],
};

const ID_RE = /^[a-z0-9-]+$/;
const REF_RE = /^[A-Za-z0-9/_.-]+$/;

function fail(message) {
  // Throw (never process.exit): main's finally must stop the dev server.
  throw new Error(message);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    config: DEFAULT_CONFIG,
    count: null,
    only: null,
    push: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--config") args.config = resolve(ROOT, argv[++i] ?? fail("missing --config value"));
    else if (a === "--count") {
      args.count = Number(argv[++i]);
      if (!Number.isInteger(args.count) || args.count < 1 || args.count > 50)
        fail("--count must be an integer 1..50");
    } else if (a === "--only") {
      args.only = argv[++i] ?? fail("missing --only value");
      if (!ID_RE.test(args.only)) fail(`bad --only id: ${args.only}`);
    } else if (a === "--no-push") args.push = false;
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node scripts/generate-vehicles.mjs [--dry-run] [--config PATH] [--count N] [--only <id>] [--no-push]");
      process.exit(0);
    } else fail(`unknown arg: ${a}`);
  }
  return args;
}

async function loadConfig(path, overrides) {
  let file = {};
  if (await exists(path)) {
    try {
      file = JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
      fail(`cannot parse ${path}: ${error.message}`);
    }
  } else if (path !== DEFAULT_CONFIG) fail(`config not found: ${path}`);
  const config = { ...DEFAULTS, ...file };
  if (overrides.count !== null) config.count = overrides.count;
  if (!overrides.push) config.push = false;
  if (!Number.isInteger(config.count) || config.count < 1 || config.count > 50)
    fail("config.count must be an integer 1..50");
  if (!REF_RE.test(config.pushTarget)) fail("bad config.pushTarget");
  if (!Array.isArray(config.knownFailures)) fail("config.knownFailures must be an array");
  return config;
}

async function currentFleet(artDir) {
  const ledger = join(ROOT, artDir, "briefs.json");
  if (!(await exists(ledger))) return [];
  try {
    const entries = JSON.parse(await readFile(ledger, "utf8"));
    return Array.isArray(entries) ? entries.map((e) => e.id).filter((id) => ID_RE.test(id ?? "")) : [];
  } catch {
    return [];
  }
}

async function dryRun(config, args) {
  const fleet = await currentFleet(config.artDir);
  const keyOk = await exists(config.keyFile);
  const styleOk = await exists(join(ROOT, config.styleReference));
  const need = Math.max(0, config.count - fleet.length);
  console.log("generate-vehicles --dry-run (no side effects)");
  console.log(`  config:  ${args.config}`);
  console.log(`  fleet:   target ${config.count}, implemented ${fleet.length}, to add ~${need}`);
  console.log(`  key:     ${config.keyFile} (${keyOk ? "present" : "MISSING"})`);
  console.log(`  style:   ${config.styleReference} (${styleOk ? "present" : "MISSING"})`);
  console.log(`  art:     ${config.artDir}/<id>.jpg + briefs.json`);
  console.log(`  prompts: artifacts/vehicle-gen/prompts/ (ideate.md, build-<id>.md)`);
  console.log(`  ideas:   artifacts/vehicle-gen/ideas.json`);
  console.log(`  server:  vite on port ${config.port}..${config.port + 4} (first free)`);
  console.log(`  muse:    muse exec --yolo --trust-workspace --disable-request-user-input --workspace <root> --prompt-file <f> --max-model-steps ${config.modelSteps} --image <refs...>`);
  console.log(`  per-run: timeout ${config.timeoutMinutes} min, env GEMINI_API_KEY=<redacted> CAPTURE_URL=<server> PLAYWRIGHT_GEN_CONFIG=<file>`);
  console.log(`  gates:   tsc, full unit suite (allowlist: ${config.knownFailures.length} known), vite build`);
  console.log(`  push:    ${config.push && args.push ? `origin HEAD:${config.pushTarget}` : "disabled"} (explicit vehicle paths only, never --force)`);
  console.log(`  steps:   1 ideation run + ${need} build run(s) sequential, stop after 2 consecutive build failures`);
  if (!keyOk || !styleOk) fail("dry-run: resolve the MISSING inputs above");
}

function quote(arg) {
  return `"${arg.replace(/"/g, "")}"`;
}

function runLive(command, args, { cwd = ROOT, env = {}, timeoutMs = 0 } = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: "inherit",
      shell: true,
    });
    let timer = null;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        treeKill(child);
        rejectRun(new Error(`timed out after ${Math.round(timeoutMs / 60000)} min: ${command} ${args.join(" ")}`));
      }, timeoutMs);
      timer.unref?.();
    }
    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      rejectRun(error);
    });
    child.on("exit", (code) => {
      if (timer) clearTimeout(timer);
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} exited with code ${code}`));
    });
  });
}

function runCapture(command, args, { cwd = ROOT, env = {}, timeoutMs = 0, maxBytes = 100 * 1024 * 1024 } = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });
    let out = "", err = "", size = 0, killed = false;
    const onData = (chunk) => {
      size += chunk.length;
      if (size > maxBytes && !killed) {
        killed = true;
        treeKill(child);
        rejectRun(new Error(`${command}: output exceeded ${maxBytes} bytes`));
      }
    };
    child.stdout.on("data", (chunk) => { out += chunk; onData(chunk); });
    child.stderr.on("data", (chunk) => { err += chunk; onData(chunk); });
    let timer = null;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        killed = true;
        treeKill(child);
        rejectRun(new Error(`timed out after ${Math.round(timeoutMs / 60000)} min: ${command} ${args.join(" ")}`));
      }, timeoutMs);
      timer.unref?.();
    }
    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      rejectRun(error);
    });
    child.on("exit", (code) => {
      if (timer) clearTimeout(timer);
      if (!killed) resolveRun({ code, out, err });
    });
  });
}

function treeKill(child) {
  try {
    if (process.platform === "win32")
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", shell: true });
    else child.kill("SIGKILL");
  } catch { /* already gone */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer(port) {
  for (let p = port; p < port + 5; p++) {
    const child = spawn(
      "node",
      ["node_modules/vite/bin/vite.js", "--port", String(p), "--strictPort", "--host", "127.0.0.1"],
      { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], shell: false },
    );
    let logged = "";
    child.stdout.on("data", (c) => { logged = `${logged}${c}`.slice(-2000); });
    child.stderr.on("data", (c) => { logged = `${logged}${c}`.slice(-2000); });
    const url = `http://127.0.0.1:${p}`;
    const deadline = Date.now() + 60000;
    let exited = false;
    child.on("exit", () => { exited = true; });
    while (Date.now() < deadline) {
      if (exited) break;
      try {
        const res = await fetch(`${url}/`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          console.log(`generate-vehicles: dev server up at ${url}`);
          return { child, url };
        }
      } catch { /* not ready yet */ }
      await sleep(500);
    }
    treeKill(child);
    if (!exited) console.log(`generate-vehicles: port ${p} unusable, trying next`);
  }
  fail(`no free dev-server port in ${port}..${port + 4}`);
}

async function stopServer(server) {
  if (!server) return;
  treeKill(server.child);
  await sleep(1000);
}

async function writePlaywrightConfig(url) {
  const body = [
    "// Generated by scripts/generate-vehicles.mjs; do not edit.",
    "module.exports = {",
    `  testDir: ${JSON.stringify(join(ROOT, "e2e"))},`,
    "  timeout: 90000,",
    "  workers: 1,",
    '  reporter: [["list"]],',
    "  use: {",
    `    baseURL: ${JSON.stringify(url)},`,
    '    trace: "retain-on-failure",',
    '    screenshot: "only-on-failure",',
    "    launchOptions: {",
    '      args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],',
    "    },",
    "  },",
    "};",
    "",
  ].join("\n");
  await writeFile(PW_CONFIG, body);
  return PW_CONFIG;
}

async function runMuse({ name, prompt, images, key, serverUrl, modelSteps, timeoutMinutes }) {
  const promptFile = join(PROMPTS, `${name}.md`);
  await writeFile(promptFile, prompt);
  console.log(`generate-vehicles: starting ${name} (prompt: ${promptFile})`);
  const args = [
    "exec", "--yolo", "--trust-workspace", "--disable-request-user-input",
    "--workspace", quote(ROOT),
    "--prompt-file", quote(promptFile),
    "--max-model-steps", String(modelSteps),
  ];
  for (const image of images) args.push("--image", quote(image));
  await runLive("muse", args, {
    env: { GEMINI_API_KEY: key, CAPTURE_URL: serverUrl ?? "", PLAYWRIGHT_GEN_CONFIG: PW_CONFIG },
    timeoutMs: timeoutMinutes * 60 * 1000,
  });
}

async function readResult(path, kind) {
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    fail(`${kind}: missing result file ${path}`);
  }
  let result;
  try {
    result = JSON.parse(raw);
  } catch (error) {
    fail(`${kind}: result is not JSON: ${error.message}`);
  }
  if (result?.ok !== true) fail(`${kind} reported failure: ${result?.error ?? JSON.stringify(result)}`);
  return result;
}

function ideationPrompt({ count, styleReference, artDir, keyFile }) {
  return [
    `You are the vehicle designer for DemolitionDerby, a stylized 3D demolition-derby browser game.`,
    `Your working directory is the repo root; all paths below are relative to it.`,
    ``,
    `GOAL: plan a fleet of exactly ${count} NEW vehicles. artifacts/vehicle-gen/ideas.json may already list some: keep those entries and add more until there are ${count} total. Never duplicate an id, name, or concept already in ideas.json, src/generated-vehicles.ts, src/vehicles.ts, src/concept-vehicles.ts, src/themed-vehicles.ts, visual-plan/refs/gemini/themed/briefs.json, or visual-plan/refs/gemini/generated/briefs.json.`,
    ``,
    `STEPS:`,
    `1. Survey the existing garage: read the ids, names, and blurbs in src/vehicles.ts (VEHICLES), src/concept-vehicles.ts, src/themed-vehicles.ts, and src/generated-vehicles.ts, plus both briefs.json ledgers. Note the established tone and which shapes already exist so your ideas are novel.`,
    `2. Design the new ideas across THREE categories, as evenly as possible:`,
    `   - realistic, serious models (invent fresh ones; do not copy existing cars),`,
    `   - silly, offbeat ideas,`,
    `   - wild shapes: F1-style open-wheeler, motorcycle-with-sidecar look, tricycle, jet-sled, and similar. NOTE: wild shapes are BODYWORK over the standard 4-wheel derby chassis (the builder keeps four treaded wheels under every body), so brief them as "reads as an F1 car / trike / sled from the side, but with four chunky derby wheels".`,
    `   Assign each idea: a kebab-case id ([a-z0-9-], unique), a display name, a one-line blurb, a category, a theme (paint and mood), and a palette [paint, accent, rim, tireWidth, spokes] as hex ints plus two numbers (copy the shape of entries in src/themed-vehicles.ts).`,
    `3. For EACH new idea, generate concept art with the repo script (it sends your brief plus the style reference to Gemini):`,
    `   node scripts/generate-vehicle-concept.mjs "${styleReference}" "${artDir}/<id>.jpg" "<brief>"`,
    `   - The API key is already in the GEMINI_API_KEY environment variable. NEVER print, log, or transmit it; never read ${keyFile}; never commit anything containing it.`,
    `   - The brief MUST describe four wheels on two axles, a chunky monster-truck-scale derby build, and the theme's key shapes and materials. Say "four wheels" explicitly; the model needs the reminder.`,
    `   - PowerShell quoting: prefer single-quoted briefs; if a brief contains quotes, write it to a temp file first and build the command carefully. Verify each .jpg exists and exceeds 20KB; retry once with a tweaked brief on failure.`,
    `4. Write artifacts/vehicle-gen/ideas.json: the FULL array of all ${count} ideas (existing entries preserved, new ones appended), each {id, name, blurb, category, theme, palette, brief, art} where art is "${artDir}/<id>.jpg".`,
    `5. Write artifacts/vehicle-gen/result-ideation.json: {ok: true, count: ${count}, added: [<new ids>], ideas: [<all ${count} ids>]}. On any failure write {ok: false, error: "<what failed>"} instead and stop.`,
    ``,
    `RULES:`,
    `- Do NOT edit src/, tests/, levels/, e2e/, or public/. Write only concept .jpgs under ${artDir}/, artifacts/vehicle-gen/ideas.json, and the result file.`,
    `- Do NOT commit or push; the pipeline owns git.`,
    `- Keep going until ALL ${count} ideas have art; report per-idea status in the result file.`,
    ``,
  ].join("\n");
}

function buildPrompt({ idea, styleReference, artDir }) {
  const art = `${artDir}/${idea.id}.jpg`;
  return [
    `You are the vehicle builder for DemolitionDerby, a stylized 3D demolition-derby browser game.`,
    `Your working directory is the repo root; all paths below are relative to it.`,
    ``,
    `GOAL: implement ONE vehicle end to end: code, ledger, preview, design review, validation.`,
    `IDEA: ${JSON.stringify(idea)}`,
    `Concept art: ${art} (also attached to this prompt). Style reference: ${styleReference} (attached).`,
    ``,
    `STEPS:`,
    `1. Read src/generated-vehicles.ts (you append here), ONE similar entry in src/themed-vehicles.ts (the pattern to copy), src/concept-vehicle-kit.ts (the kit API: bar, plate, fenders, wheels, lights, and part-group helpers), src/themed-vehicle-body.ts (shared body helpers), src/damage.ts (the 13 PARTS in order), and the concept art (attached image; the file is ${art}).`,
    `   If "${idea.id}" is already in GENERATED_VEHICLES, do NOT append again: finish whatever is missing (ledger, preview) and continue at step 5.`,
    `2. Append ONE vehicle(...) entry for "${idea.id}" to GENERATED_VEHICLES (name ${JSON.stringify(idea.name)}, blurb ${JSON.stringify(idea.blurb)}, palette ${JSON.stringify(idea.palette)}), adding whatever kit/body imports the entry needs. CONTRACT, enforced by tests - violate nothing:`,
    `   - Kit-built via ConceptVehicleKit. The standard chassis (PARTS, four suspension hardpoints, wheel radius) is inherited from vehicles.ts: NEVER define custom parts or suspension.`,
    `   - FOUR treaded wheel assemblies at the kit hardpoints (the treadBlocks >= 384 test counts tread geometry). Wild shapes are bodywork OVER the chassis: a jet-sled or trike look still carries four wheels with full treads; bodywork may partly shroud them but every wheel arch must read clearly. Invisible or missing wheels FAIL.`,
    `   - Cover all 13 PARTS ids with named groups; each part group's FIRST child must be a deformable Mesh (group.getObjectByName(part.id).children[0].isMesh must be true with BufferGeometry).`,
    `   - High-poly detail: >= 90,000 triangles, >= 60 meshes, more than 40% of the truck's triangles. Use THREE primitives plus kit materials only; no external assets.`,
    `   - build() must not throw in node or in the browser.`,
    `3. Append {"id": "${idea.id}", "name": ${JSON.stringify(idea.name)}, "brief": <your brief>, "category": "${idea.category}"} to ${artDir}/briefs.json in the SAME order as GENERATED_VEHICLES (the ledger test enforces entry-for-entry equality). Reuse the idea brief, adjusted to describe what you actually built.`,
    `   If the concept art is missing or corrupt, regenerate it with node scripts/generate-vehicle-concept.mjs "${styleReference}" "${art}" "<brief>" (key already in GEMINI_API_KEY; NEVER print it).`,
    `4. Capture the showroom preview with node scripts/capture-vehicle-previews.mjs ${idea.id} (CAPTURE_URL is already set to the pipeline dev server; the script writes public/vehicles/${idea.id}.png at 800x450). Rerun after any visual fix.`,
    `5. DESIGN REVIEW, one critic round: compare public/vehicles/${idea.id}.png against the concept art ${art} (view both with your image tools; if you cannot view images, say so in the result file and still do the contract checks). Check: silhouette and shape match the concept; four wheels read clearly; theme and palette match; chunky derby proportions (nothing spindly, floating, or sunken); no z-fighting or gaps. Fix ALL blockers (wrong shape, unreadable wheels, broken build) and majors (off-theme, muddy details); at most 2 fix iterations, re-capturing the preview each time. Polish nits may stand.`,
    `6. VALIDATE - every command must pass:`,
    `   - npx tsc --noEmit`,
    `   - npx vitest run tests/new-vehicles.test.ts`,
    `   - npx vitest run tests/vehicle-matrix.test.ts -t "${idea.id}"`,
    `   - npx vitest run tests/generated-vehicles.test.ts -t "${idea.id}"`,
    `   - npx playwright test -c "$env:PLAYWRIGHT_GEN_CONFIG" e2e/vehicle-select.spec.ts`,
    `   (PowerShell: $env:CAPTURE_URL and $env:PLAYWRIGHT_GEN_CONFIG are already set. The -t filters run only your vehicle's matrix proofs; new-vehicles and vehicle-select loop the whole garage including your car.)`,
    `   Fix failures in YOUR code only. Never weaken or skip tests, never touch other vehicles or levels. Do not stash or revert to investigate: if a failure looks pre-existing, report it as blocked instead (ok: false with evidence) and stop.`,
    `7. Write artifacts/vehicle-gen/result-${idea.id}.json: {ok: true, id: "${idea.id}", files: ["src/generated-vehicles.ts", "${artDir}/briefs.json", "${art}", "public/vehicles/${idea.id}.png"], validation: {tsc: "pass", suites: {"new-vehicles": "pass", "vehicle-matrix": "pass", "generated-vehicles": "pass", "vehicle-select": "pass"}}, review: {compared: <bool>, fixes: [...]}}. On any failure write {ok: false, id: "${idea.id}", error: "<what failed>"} instead.`,
    ``,
    `RULES:`,
    `- Do NOT commit or push; the pipeline owns git. Your change set is exactly: your GENERATED_VEHICLES entry (+ imports), your briefs.json entry, your concept .jpg, your preview .png.`,
    `- NEVER print, log, or transmit the API key.`,
    `- Stay in scope: your vehicle and its ledger/preview only.`,
    ``,
  ].join("\n");
}

async function readIdeas() {
  if (!(await exists(IDEAS))) return [];
  try {
    const ideas = JSON.parse(await readFile(IDEAS, "utf8"));
    return Array.isArray(ideas) ? ideas : [];
  } catch {
    return [];
  }
}

function validIdea(idea) {
  return (
    idea &&
    ID_RE.test(idea.id ?? "") &&
    typeof idea.name === "string" &&
    typeof idea.blurb === "string" &&
    typeof idea.category === "string" &&
    typeof idea.brief === "string" &&
    Array.isArray(idea.palette)
  );
}

async function ideaComplete(idea, artDir) {
  const source = await readFile(join(ROOT, "src", "generated-vehicles.ts"), "utf8").catch(() => "");
  const inCode = source.includes(`"${idea.id}"`);
  const fleet = await currentFleet(artDir);
  const inLedger = fleet.includes(idea.id);
  const artOk = await exists(join(ROOT, artDir, `${idea.id}.jpg`));
  const previewOk = await exists(join(ROOT, "public", "vehicles", `${idea.id}.png`));
  return inCode && inLedger && artOk && previewOk;
}

async function runGates(config) {
  console.log("generate-vehicles: gate 1/3: tsc --noEmit");
  await runLive("npx", ["tsc", "--noEmit"], { timeoutMs: 5 * 60 * 1000 });

  console.log("generate-vehicles: gate 2/3: full unit suite");
  const suite = await runCapture("npx", ["vitest", "run", "--reporter=json"], {
    timeoutMs: 25 * 60 * 1000,
  });
  let report;
  try {
    report = JSON.parse(suite.out);
  } catch {
    console.error(suite.out.slice(-3000));
    console.error(suite.err.slice(-3000));
    fail("unit suite produced no JSON report");
  }
  const failed = [];
  for (const file of report.testResults ?? []) {
    for (const t of file.assertionResults ?? []) {
      if (t.status === "failed") {
        const name = [...(t.ancestorTitles ?? []), t.title].join(" > ");
        failed.push(`${file.name} > ${name}`);
      }
    }
  }
  const known = [], fresh = [];
  for (const f of failed) {
    if (config.knownFailures.some((k) => f.includes(k))) known.push(f);
    else fresh.push(f);
  }
  console.log(`generate-vehicles: suite: ${report.numPassedTests ?? "?"} passed, ${failed.length} failed (${known.length} known, ${fresh.length} new)`);
  for (const f of known) console.log(`  known: ${f}`);
  for (const f of fresh) console.log(`  NEW FAILURE: ${f}`);
  for (const k of config.knownFailures) {
    if (!failed.some((f) => f.includes(k)))
      console.log(`  note: allowlisted "${k}" now passes - remove it from config`);
  }
  if (fresh.length > 0) fail("unit suite has failures outside the allowlist");

  console.log("generate-vehicles: gate 3/3: vite build");
  await runLive("npm", ["run", "build"], { timeoutMs: 10 * 60 * 1000 });
}

async function commitAndPush(config, built) {
  const artDir = config.artDir;
  // Commit every ledgered vehicle, not just this run's: a retried run must
  // not commit shared files whose other entries lack their art/preview.
  const ids = [...new Set([...built, ...(await currentFleet(artDir))])];
  const paths = ["src/generated-vehicles.ts", `${artDir}/briefs.json`];
  for (const id of ids) {
    if (!ID_RE.test(id)) fail(`refusing to commit suspicious id: ${id}`);
    paths.push(`${artDir}/${id}.jpg`, `public/vehicles/${id}.png`);
  }
  for (const p of paths) {
    if (!(await exists(join(ROOT, p)))) fail(`cannot commit: missing ${p}`);
  }
  const status = await runCapture("git", ["status", "--porcelain", "--", ...paths.map(quote)]);
  if (status.code !== 0) fail(`git status failed: ${status.err}`);
  const dirty = status.out.trim();
  if (!dirty) {
    console.log("generate-vehicles: vehicle paths already committed, nothing new to commit");
  } else {
    console.log(`generate-vehicles: committing:${dirty.split("\n").map((l) => `\n  ${l}`).join("")}`);
    await runLive("git", ["add", "--", ...paths.map(quote)]);
    const message = `Add ${ids.length} pipeline-generated vehicle${ids.length === 1 ? "" : "s"} (${ids.join(", ")})`;
    await runLive("git", ["commit", "-m", quote(message)]);
  }
  if (!config.push) {
    console.log("generate-vehicles: push disabled (--no-push or config), stopping after commit");
    return;
  }
  const landing = await runCapture("git", ["rev-list", "--count", `origin/${config.pushTarget}..HEAD`]);
  console.log(`generate-vehicles: pushing ${landing.out.trim()} commit(s) to origin/${config.pushTarget} (HEAD, never --force)`);
  await runLive("git", ["push", "origin", `HEAD:${config.pushTarget}`]);
  console.log("generate-vehicles: push complete");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = await loadConfig(args.config, args);
  if (args.dryRun) {
    await dryRun(config, args);
    return;
  }
  const key = (await readFile(config.keyFile, "utf8").catch(() => fail(`cannot read key file: ${config.keyFile}`))).trim();
  if (!key) fail("key file is empty");
  const styleAbs = join(ROOT, config.styleReference);
  if (!(await exists(styleAbs))) fail(`style reference not found: ${config.styleReference}`);
  await mkdir(PROMPTS, { recursive: true });
  await mkdir(join(ROOT, config.artDir), { recursive: true });

  let ideas = await readIdeas();
  if (!args.only && ideas.length > config.count)
    fail(`${IDEAS} lists ${ideas.length} ideas but count is ${config.count}; trim it or raise count`);
  if (args.only) {
    ideas = ideas.filter((idea) => idea.id === args.only);
    if (ideas.length === 0) fail(`--only ${args.only}: no such idea in ${IDEAS} (run ideation first)`);
  } else if (ideas.length !== config.count || ideas.some((idea) => !validIdea(idea))) {
    await runMuse({
      name: "ideate",
      prompt: ideationPrompt({
        count: config.count,
        styleReference: config.styleReference,
        artDir: config.artDir,
        keyFile: config.keyFile,
      }),
      images: [styleAbs],
      key,
      serverUrl: null,
      modelSteps: config.modelSteps,
      timeoutMinutes: config.timeoutMinutes,
    });
    await readResult(join(ART, "result-ideation.json"), "ideation");
    ideas = await readIdeas();
    if (ideas.length !== config.count || ideas.some((idea) => !validIdea(idea)))
      fail(`ideation must leave exactly ${config.count} valid ideas in ${IDEAS}`);
    const arts = [];
    for (const idea of ideas) {
      const art = join(ROOT, config.artDir, `${idea.id}.jpg`);
      if (!(await exists(art))) arts.push(idea.id);
    }
    if (arts.length > 0) fail(`ideation missing concept art for: ${arts.join(", ")}`);
  } else {
    console.log(`generate-vehicles: reusing ${ideas.length} ideas from ${IDEAS}`);
  }

  let server = null;
  try {
    server = await startServer(config.port);
    await writePlaywrightConfig(server.url);
    let consecutiveFailures = 0;
    const built = [];
    for (const idea of ideas) {
      if (await ideaComplete(idea, config.artDir)) {
        console.log(`generate-vehicles: ${idea.id} already complete, skipping`);
        built.push(idea.id);
        consecutiveFailures = 0;
        continue;
      }
      try {
        await runMuse({
          name: `build-${idea.id}`,
          prompt: buildPrompt({ idea, styleReference: config.styleReference, artDir: config.artDir }),
          images: [join(ROOT, config.artDir, `${idea.id}.jpg`), styleAbs],
          key,
          serverUrl: server.url,
          modelSteps: config.modelSteps,
          timeoutMinutes: config.timeoutMinutes,
        });
        await readResult(join(ART, `result-${idea.id}.json`), `build ${idea.id}`);
      } catch (error) {
        consecutiveFailures++;
        if (consecutiveFailures >= 2) fail(`stopping after 2 consecutive build failures (latest: ${error.message})`);
        console.error(`generate-vehicles: build ${idea.id} failed (${error.message}); continuing`);
        continue;
      }
      if (!(await ideaComplete(idea, config.artDir)))
        fail(`build ${idea.id}: result ok but files incomplete`);
      console.log(`generate-vehicles: ${idea.id} complete`);
      built.push(idea.id);
      consecutiveFailures = 0;
    }
    const failed = ideas.map((i) => i.id).filter((id) => !built.includes(id));
    if (failed.length > 0) fail(`builds failed for: ${failed.join(", ")}; not pushing`);
    await runGates(config);
    await commitAndPush(config, built);
    console.log(`generate-vehicles: done. Fleet: ${built.join(", ")}`);
  } finally {
    await stopServer(server);
  }
}

try {
  await main();
} catch (error) {
  console.error(`generate-vehicles: ${error.message}`);
  process.exitCode = 1;
}
