import { defineConfig, type Plugin } from "vite";
import { readFile, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { validateTuning, TUNING_KEYS, type Tuning } from "./src/tuning-schema";
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
export default defineConfig({ plugins: [tuningDefaults()] });
