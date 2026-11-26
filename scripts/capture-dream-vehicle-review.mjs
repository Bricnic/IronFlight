import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const output = "artifacts/dream-vehicle-review";
await mkdir(output, { recursive: true });
// Bundle the same source models into an offline page: no server, network or game state required.
const html = await readFile("scripts/dream-vehicle-review.html", "utf8");
const moduleSource = html
  .match(/<script type="module">([\s\S]*?)<\/script>/)[1]
  .replace("'/src/dream-vehicles.ts'", "'../src/dream-vehicles.ts'");
const bundle = await build({
  stdin: {
    contents: moduleSource,
    resolveDir: resolve("scripts"),
    loader: "ts",
  },
  bundle: true,
  format: "iife",
  write: false,
  target: "es2022",
});
const offlineHtml = html.replace(
  /<script type="module">[\s\S]*?<\/script>/,
  () =>
    `<script>${bundle.outputFiles[0].text.replaceAll("</script>", "<\\/script>")}</script>`,
);
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 740 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setContent(offlineHtml);
  await page.waitForFunction(() => !!window.review, null, { timeout: 60000 });
  const ids = await page.evaluate(() => window.review.ids);
  const views = ["front-right", "rear-left", "left-side", "rear-low", "top"];
  const shots = [];
  for (const id of ids) {
    if (id === "cake-cruiser") continue;
    for (const [i, angle] of views.entries()) {
      const stats = await page.evaluate(
        ({ id, angle, time }) => window.review.render(id, angle, time),
        { id, angle, time: i * 0.73 },
      );
      const file = `${id}-${angle}.png`;
      await page.screenshot({ path: `${output}/${file}` });
      shots.push({ id, angle, file, ...stats });
      console.log(`Captured ${id} / ${angle}`);
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  await writeFile(`${output}/captures.json`, JSON.stringify(shots, null, 2));
  // A self-contained HTML contact sheet keeps the full-resolution evidence easy to inspect.
  const rows = ids
    .filter((id) => id !== "cake-cruiser")
    .map(
      (id) =>
        `<section><h2>${id}</h2><div>${shots
          .filter((s) => s.id === id)
          .map(
            (s) =>
              `<a href="${s.file}"><img src="${s.file}" alt="${s.id}: ${s.angle}"></a>`,
          )
          .join("")}</div></section>`,
    )
    .join("");
  await writeFile(
    `${output}/index.html`,
    `<!doctype html><meta charset="utf-8"><title>Dream vehicle visual verification</title><style>body{font:16px system-ui;background:#14212d;color:#edf4fa;margin:24px}h1{font-size:28px}h2{font-size:20px}section{margin:28px 0}section div{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}img{width:100%;display:block;border-radius:6px}a{color:inherit}</style><h1>Dream vehicle visual verification</h1><p>Five views per rebuilt vehicle, including a low rear view and an elevated view. Screenshots show the actual Three.js models at different animation times.</p>${rows}`,
  );
  // Review sheets contain every view at readable resolution, without opening 35 files.
  for (const id of ids.filter((id) => id !== "cake-cruiser")) {
    const tiles = await Promise.all(
      shots
        .filter((s) => s.id === id)
        .map(
          async (s) =>
            `<img src="data:image/png;base64,${(await readFile(`${output}/${s.file}`)).toString("base64")}" alt="${s.angle}">`,
        ),
    );
    await page.setViewportSize({ width: 1800, height: 960 });
    await page.setContent(
      `<style>body{margin:0;background:#d9e2e8;display:grid;grid-template-columns:repeat(3,600px)}img{width:600px;height:444px;display:block}</style>${tiles.join("")}`,
    );
    await page.screenshot({
      path: `${output}/${id}-review-sheet.png`,
      fullPage: true,
    });
  }
  console.log(`Saved ${shots.length} screenshots to ${output}`);
} finally {
  await browser.close();
}
