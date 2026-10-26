import { defineConfig, type Plugin } from "vite";
import {
  readFile,
  writeFile,
  rename,
  readdir,
  mkdir,
  unlink,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";
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
const levelsDir = fileURLToPath(new URL("./levels/", import.meta.url));
const LEVEL_NAME = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/;
function levelFile(name: string) {
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
function customLevels(): Plugin {
  return {
    name: "local-custom-levels",
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
            const files = await readdir(levelsDir);
            res.end(
              JSON.stringify(
                files.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)),
              ),
            );
            return;
          }
          if (req.method === "GET") {
            const name = url.searchParams.get("name") ?? "";
            if (!LEVEL_NAME.test(name)) throw new Error("Invalid level name");
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
            if (!LEVEL_NAME.test(name)) throw new Error("Invalid level name");
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
            if (body.length > 262144) throw new Error("Level is too large");
          }
          const { name, level } = JSON.parse(body) as {
            name: string;
            level: unknown;
          };
          if (!LEVEL_NAME.test(name ?? "")) throw new Error("Invalid level name");
          const valid = validateCustomLevel(level);
          if (valid.name !== name) throw new Error("Name and level disagree");
          try {
            await mkdir(levelsDir, { recursive: true });
            const file = levelFile(name);
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
export default defineConfig({ plugins: [tuningDefaults(), customLevels()] });
