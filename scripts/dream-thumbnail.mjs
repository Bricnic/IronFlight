import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// Dream thumbnails: collection art with DREAM superimposed center.
// Usage: node scripts/dream-thumbnail.mjs <collection-id> [...]
// Writes public/tracks/<collection-id>-dream.png per collection.

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error("usage: node scripts/dream-thumbnail.mjs <collection-id> [...]");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1264, height: 848 } });
for (const id of ids) {
  const art = await readFile(`public/collections/${id}.jpg`);
  const url = `data:image/jpeg;base64,${art.toString("base64")}`;
  await page.setContent(
    `<body style="margin:0"><div id="card" style="position:relative;width:1264px">` +
      `<img src="${url}" style="display:block;width:1264px">` +
      `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">` +
      `<span style="font:900 240px 'Barlow Condensed',Arial,sans-serif;letter-spacing:18px;color:#fff;` +
      `-webkit-text-stroke:10px #1b2a33;paint-order:stroke fill;` +
      `text-shadow:0 10px 34px rgba(0,0,0,.55)">DREAM</span>` +
      `</div></div></body>`,
  );
  await page.locator("#card").screenshot({
    path: path.join("public", "tracks", `${id}-dream.png`),
  });
  console.log(`wrote public/tracks/${id}-dream.png`);
}
await browser.close();
