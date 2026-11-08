import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
// Call Gemini image generation ("nano banana") and save the PNG.
// The API key is read at runtime from a file outside the repo and is never
// printed or stored: pass --keyfile or set GEMINI_KEY_FILE.
// Usage:
//   node scripts/gemini-image.mjs --prompt "flat game UI icon of a gear" \
//     --out public/icons/settings.png --ar 1:1 --keyfile C:\Code\gemini_api_key.txt
const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
};
const prompt = flag("prompt", "");
const out = flag("out", "");
const aspectRatio = flag("ar", "1:1");
const model = flag("model", "gemini-2.5-flash-image");
const keyFile = flag("keyfile", process.env.GEMINI_KEY_FILE ?? "");
if (!prompt || !out || !keyFile) {
  console.error("Usage: node scripts/gemini-image.mjs --prompt P --out F --keyfile K [--ar 1:1]");
  process.exit(2);
}
const key = (await readFile(keyFile, "utf8")).trim();
if (!key) {
  console.error("Empty API key file: " + keyFile);
  process.exit(2);
}
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio },
      },
    }),
  },
);
if (!res.ok) {
  console.error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
const body = await res.json();
const parts = body.candidates?.[0]?.content?.parts ?? [];
const image = parts.find((p) => p.inlineData?.data);
if (!image) {
  console.error("No image in response: " + JSON.stringify(body).slice(0, 300));
  process.exit(1);
}
await mkdir(dirname(out), { recursive: true });
await writeFile(out, Buffer.from(image.inlineData.data, "base64"));
console.log(`Saved ${out} (${image.inlineData.mimeType})`);
const text = parts.find((p) => p.text)?.text;
if (text) console.log("Model note: " + text.slice(0, 200));
