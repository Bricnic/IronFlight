// Draw-call + triangle breakdown per scene branch: node scripts/perf/breakdown.mjs <level...> [more...]
// Prints mesh/tri counts grouped by scene branch and model (top 16 rows each).
import { chromium } from "@playwright/test";
const PORT = process.env.PERF_PORT ?? "5173";
const ids = process.argv.slice(2).filter((a) => !a.startsWith("-"));
if (!ids.length) {
  console.error("usage: node scripts/perf/breakdown.mjs <level-id> [...]");
  process.exit(2);
}
const browser = await chromium.launch({
  channel: "chromium",
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=default",
    "--enable-gpu",
    "--ignore-gpu-blocklist",
  ],
});
try {
  for (const id of ids) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`http://127.0.0.1:${PORT}/`);
    await page.waitForFunction(() => !!window.__game);
    const name = await page.locator(`#level-select [data-track="${id}"] h2`).textContent();
    await page.getByRole("button", { name: `Play ${name}`, exact: true }).click();
    await page.waitForFunction(() => !!window.__game.snapshot().run);
    await page.waitForTimeout(3000);
    const rows = await page.evaluate(() => window.__game.drawBreakdown());
    console.log(`=== ${id} (${rows.reduce((a, r) => a + r.meshes, 0)} visible meshes)`);
    for (const r of rows.slice(0, 16))
      console.log(`  ${String(r.meshes).padStart(5)} meshes ${String(r.tris).padStart(9)} tris  ${r.key}`);
    await page.close();
  }
} finally {
  await browser.close();
}
