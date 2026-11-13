import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
// Call Gemini image generation ("nano banana") and save the PNG.
// The API key is read at runtime from a file outside the repo and is never
// printed or stored: pass --keyfile or set GEMINI_KEY_FILE.
// If the named keyfile is missing, empty, or rejected, sibling files matching
// gemini*.txt in the same directory are tried in sorted order until one works.
// Only key file paths are ever printed, never key material.
// Usage:
//   node scripts/gemini-image.mjs --prompt "flat game UI icon of a gear" \
//     --out public/icons/settings.png --ar 1:1 --keyfile C:\Code\gemini_key.txt

/** Ordered key candidates: the named file first, then sorted gemini*.txt siblings. */
export async function resolveKeyCandidates(preferred) {
  const dir = dirname(preferred);
  const wanted = basename(preferred);
  let entries = [];
  try {
    entries = await readdir(dir);
  } catch {
    entries = [];
  }
  const siblings = entries
    .filter(
      (e) =>
        e.toLowerCase().startsWith("gemini") &&
        e.toLowerCase().endsWith(".txt") &&
        e !== wanted,
    )
    .sort();
  const found = [];
  for (const name of [wanted, ...siblings]) {
    const path = join(dir, name);
    try {
      const key = (await readFile(path, "utf8")).trim();
      if (key) found.push({ path, key });
    } catch {
      // Missing or unreadable: skip to the next candidate.
    }
  }
  return found;
}

function isAuthError(status, bodyText) {
  if (status === 401 || status === 403) return true;
  return (
    status === 400 &&
    /api[_ ]?key/i.test(bodyText) &&
    /invalid|not valid|expired|unauthorized/i.test(bodyText)
  );
}

export async function main(argv) {
  const flag = (name, def) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
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
  const candidates = await resolveKeyCandidates(keyFile);
  if (candidates.length === 0) {
    console.error(
      `No API key found: ${keyFile} is missing or empty and no gemini*.txt keys exist in ${dirname(keyFile)}`,
    );
    process.exit(2);
  }
  let lastError = "";
  for (const { path, key } of candidates) {
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
    if (res.ok) {
      const body = await res.json();
      const parts = body.candidates?.[0]?.content?.parts ?? [];
      const image = parts.find((p) => p.inlineData?.data);
      if (!image) {
        console.error("No image in response: " + JSON.stringify(body).slice(0, 300));
        process.exit(1);
      }
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, Buffer.from(image.inlineData.data, "base64"));
      console.log(`Using API key file: ${path}`);
      console.log(`Saved ${out} (${image.inlineData.mimeType})`);
      const text = parts.find((p) => p.text)?.text;
      if (text) console.log("Model note: " + text.slice(0, 200));
      return;
    }
    const errText = (await res.text()).slice(0, 300);
    lastError = `Gemini error ${res.status}: ${errText}`;
    if (isAuthError(res.status, errText)) {
      console.error(`Key rejected (${path}), trying next candidate...`);
      continue;
    }
    console.error(lastError);
    process.exit(1);
  }
  console.error(lastError || "All API key candidates were rejected.");
  process.exit(1);
}

if (process.argv[1]?.endsWith("gemini-image.mjs")) await main(process.argv.slice(2));
