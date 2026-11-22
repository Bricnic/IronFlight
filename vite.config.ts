import { defineConfig, type Plugin } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import {
  readFile,
  writeFile,
  rename,
  readdir,
  mkdir,
  unlink,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, sep } from "node:path";
import type { IncomingMessage } from "node:http";
import { validateTuning, TUNING_KEYS, type Tuning } from "./src/tuning-schema";
import { validateCustomLevel } from "./src/custom-level";
const configPath = fileURLToPath(
  new URL("./src/tuning-defaults.json", import.meta.url),
);
function tuningDefaults(): Plugin {
  return {
    name: "local-tuning-defaults",
    handleHotUpdate(ctx) {
      if (resolve(ctx.file) !== resolve(configPath)) return;
      for (const module of ctx.server.moduleGraph.getModulesByFile(ctx.file) ??
        [])
        ctx.server.moduleGraph.invalidateModule(module);
      // The saving page updates from the response; don't interrupt an ongoing run.
      return [];
    },
    configureServer(server) {
      server.middlewares.use("/__tuning-defaults", async (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        try {
          if (req.method === "GET") {
            res.end(await readFile(configPath, "utf8"));
            return;
          }
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: "Use GET or POST" }));
            return;
          }
          if (
            !req.headers.origin ||
            req.headers.origin !== `http://${req.headers.host}` ||
            !/^((127\.0\.0\.1)|(localhost))(:[0-9]+)?$/.test(
              req.headers.host ?? "",
            )
          ) {
            res.statusCode = 403;
            res.end(
              JSON.stringify({
                error: "Only this local game's browser may save defaults",
              }),
            );
            return;
          }
          let body = "";
          for await (const chunk of req) {
            body += chunk;
            if (body.length > 8192) throw new Error("Config is too large");
          }
          const next = validateTuning(JSON.parse(body) as Tuning);
          if (Object.keys(next).length !== TUNING_KEYS.length)
            throw new Error("A complete tuning config is required");
          await writeFile(
            configPath + ".tmp",
            JSON.stringify(next, null, 2) + "\n",
            "utf8",
          );
          await rename(configPath + ".tmp", configPath);
          res.end(JSON.stringify(next));
        } catch (error) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : "Unable to store defaults",
            }),
          );
        }
      });
    },
  };
}
const projectRoot = fileURLToPath(new URL("./", import.meta.url)).replace(
  /[\\/]+$/,
  "",
);
const gameCopyFile = fileURLToPath(
  new URL("./game-copy.json", import.meta.url),
);
const levelsDir = fileURLToPath(new URL("./levels/", import.meta.url));
const LEVEL_PATH = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}(\/[A-Za-z0-9][A-Za-z0-9 _-]{0,63})*$/;
function levelFile(name: string) {
  if (!LEVEL_PATH.test(name)) throw new Error("Invalid level path");
  const file = resolve(levelsDir, `${name}.json`);
  if (!file.startsWith(levelsDir.endsWith(sep) ? levelsDir : levelsDir + sep))
    throw new Error("Invalid level name");
  return file;
}
function localRequest(req: IncomingMessage) {
  return (
    !!req.headers.origin &&
    req.headers.origin === `http://${req.headers.host}` &&
    /^((127\.0\.0\.1)|(localhost))(:[0-9]+)?$/.test(
      String(req.headers.host ?? ""),
    )
  );
}
async function writeGameCopy() {
  const body = `${JSON.stringify({ root: projectRoot }, null, 2)}\n`;
  try {
    if ((await readFile(gameCopyFile, "utf8")) === body) return;
  } catch {
    // Missing or unreadable: written below.
  }
  await writeFile(gameCopyFile, body, "utf8");
}
function gameCopy(): Plugin {
  return {
    name: "local-game-copy",
    async configureServer() {
      await writeGameCopy();
    },
  };
}
function customLevels(): Plugin {
  return {
    name: "local-custom-levels",
    async handleHotUpdate(ctx) {
      if (
        !resolve(ctx.file).startsWith(resolve(levelsDir) + sep) ||
        !ctx.file.endsWith(".json")
      ) return;
      try {
        validateCustomLevel(JSON.parse(await ctx.read()));
      } catch {
        // Lineup indexes, environment templates and invalid files keep normal HMR.
        return;
      }
      for (const module of ctx.server.moduleGraph.getModulesByFile(ctx.file) ?? [])
        ctx.server.moduleGraph.invalidateModule(module);
      // Saves register the edited track in the running game. Official levels are
      // also bundled imports: reloading them here would interrupt the playtest.
      return [];
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/__levels")) {
          next();
          return;
        }
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        try {
          const url = new URL(req.url, "http://levels.local");
          if (req.method === "GET" && !url.searchParams.get("name")) {
            await mkdir(levelsDir, { recursive: true });
            const files = await readdir(levelsDir, { recursive: true, withFileTypes: true });
            const names: string[] = [];
            for (const entry of files) {
              if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
              const path = resolve(entry.parentPath, entry.name);
              const name = path.slice(levelsDir.length).replaceAll("\\", "/").slice(0, -5);
              if (!LEVEL_PATH.test(name)) continue;
              try {
                validateCustomLevel(JSON.parse(await readFile(path, "utf8")));
                names.push(name);
              } catch {
                // Indexes and environment templates are not editable levels.
              }
            }
            res.end(
              JSON.stringify(
                names.sort(),
              ),
            );
            return;
          }
          if (req.method === "GET") {
            const name = url.searchParams.get("name") ?? "";
            levelFile(name);
            try {
              res.end(await readFile(levelFile(name), "utf8"));
            } catch {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `Unknown level: ${name}` }));
            }
            return;
          }
          if (!localRequest(req)) {
            res.statusCode = 403;
            res.end(
              JSON.stringify({
                error: "Only this local game's browser may save levels",
              }),
            );
            return;
          }
          if (req.method === "DELETE") {
            const name = url.searchParams.get("name") ?? "";
            levelFile(name);
            try {
              await unlink(levelFile(name));
            } catch {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `Unknown level: ${name}` }));
              return;
            }
            res.end(JSON.stringify({}));
            return;
          }
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: "Use GET, POST or DELETE" }));
            return;
          }
          let body = "";
          for await (const chunk of req) {
            body += chunk;
            if (body.length > 4 * 1024 * 1024) throw new Error("Level is too large");
          }
          const { name, level } = JSON.parse(body) as {
            name: string;
            level: unknown;
          };
          levelFile(name ?? "");
          const valid = validateCustomLevel(level);
          // Storage identity is independent of the editable display name.
          delete valid.sourcePath;
          try {
            await mkdir(levelsDir, { recursive: true });
            const file = levelFile(name);
            await mkdir(dirname(file), { recursive: true });
            await writeFile(
              file + ".tmp",
              JSON.stringify(valid, null, 2) + "\n",
              "utf8",
            );
            await rename(file + ".tmp", file);
          } catch (error) {
            // Storage failures (locks, transient fs errors) are retryable.
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to store level",
              }),
            );
            return;
          }
          res.end(JSON.stringify(valid));
        } catch (error) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error:
                error instanceof Error ? error.message : "Unable to store level",
            }),
          );
        }
      });
    },
  };
}
// XRCERT=1 (npm run dev:https) serves HTTPS with a self-signed cert so a
// Quest headset on the LAN can open an immersive-vr session, which needs a
// secure context. Plain `npm run dev` stays HTTP for local e2e.
const httpsPlugins: Plugin[] =
  process.env.XRCERT === "1" ? [basicSsl() as unknown as Plugin] : [];

export default defineConfig({
  plugins: [tuningDefaults(), customLevels(), gameCopy(), ...httpsPlugins, {
    name: "local-controller-diagnostics",
    configureServer(server) {
      let latest: unknown = null;
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== "/__controller-diagnostics") { next(); return; }
        res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
        if (req.method === "POST" && localRequest(req)) {
          try {
            let body = "";
            for await (const part of req) { body += String(part); if (body.length > 16384) throw new Error("Diagnostics too large"); }
            latest = JSON.parse(body); res.end("{}");
          } catch { res.statusCode = 400; res.end("{}"); }
        } else if (req.method === "GET") res.end(JSON.stringify(latest));
        else { res.statusCode = 403; res.end("{}"); }
      });
    },
  }],
});
