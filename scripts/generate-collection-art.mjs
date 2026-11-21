import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname } from "node:path";
import { resolveKeyCandidates } from "./gemini-image.mjs";

const model = "gemini-3.1-flash-image";
const imageTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".webp": "image/webp",
};

function flag(argv, name, def) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
}

async function main(argv) {
  const referencePath = flag(argv, "reference", "");
  const outputPath = flag(argv, "out", "");
  const theme = flag(argv, "theme", "");
  const keyFile = flag(argv, "keyfile", process.env.GEMINI_KEY_FILE ?? "");
  if (!referencePath || !outputPath || !theme || !keyFile) {
    console.error(
      "Usage: node scripts/generate-collection-art.mjs --reference R --out F --theme T --keyfile K",
    );
    process.exit(2);
  }
  const mimeType = imageTypes[extname(referencePath).toLowerCase()];
  if (!mimeType) throw new Error("Use a PNG, JPEG, or WebP reference image.");
  if (imageTypes[extname(outputPath).toLowerCase()] !== "image/jpeg")
    throw new Error("Use a .jpg or .jpeg output path.");

  const reference = await readFile(referencePath);
  const prompt = [
    "Using this reference image to get a sense of the art style, create a postcard displaying this theme:",
    `"${theme}"`,
    "Match the reference's vibrant stylized look. Wide landscape postcard composition, no text, no words, no letters, no UI.",
  ].join("\n\n");

  const candidates = await resolveKeyCandidates(keyFile);
  if (candidates.length === 0) {
    console.error(`No API key found: ${keyFile} missing and no gemini*.txt siblings.`);
    process.exit(2);
  }
  let lastError = "";
  for (const { path, key } of candidates) {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/interactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        redirect: "error",
        signal: AbortSignal.timeout(180_000),
        body: JSON.stringify({
          model,
          store: false,
          input: [
            {
              type: "user_input",
              content: [
                { type: "image", mime_type: mimeType, data: reference.toString("base64") },
                { type: "text", text: prompt },
              ],
            },
          ],
          response_format: {
            type: "image",
            mime_type: "image/jpeg",
            aspect_ratio: "3:2",
            image_size: "1K",
          },
        }),
      },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      lastError = `Gemini returned HTTP ${response.status}. ${result?.error?.message ?? ""}`;
      if (response.status === 401 || response.status === 403) {
        console.error(`Key rejected (${path}), trying next candidate...`);
        continue;
      }
      console.error(lastError);
      process.exit(1);
    }
    const image = result?.steps
      ?.filter((step) => step.type === "model_output")
      .flatMap((step) => step.content ?? [])
      .find((part) => part.type === "image" && part.data);
    if (!image) {
      console.error(`Gemini returned no image (${result?.status ?? "unknown status"}).`);
      process.exit(1);
    }
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, Buffer.from(image.data, "base64"));
    console.log(`Using API key file: ${path}`);
    console.log(`Saved ${outputPath} using ${model}`);
    return;
  }
  console.error(lastError || "All API key candidates were rejected.");
  process.exit(1);
}

await main(process.argv.slice(2));
