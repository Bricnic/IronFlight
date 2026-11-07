import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname } from "node:path";

const model = "gemini-3.1-flash-image";
const apiKey = process.env.GEMINI_API_KEY?.trim();
const [referencePath, outputPath, brief] = process.argv.slice(2);
const imageTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

async function main() {
  if (
    !referencePath ||
    !outputPath ||
    !brief?.trim() ||
    process.argv.length !== 5
  )
    throw new Error(
      'Usage: node scripts/generate-vehicle-concept.mjs <reference image> <output.jpg> "<vehicle brief>"',
    );
  if (!apiKey)
    throw new Error("Set GEMINI_API_KEY before running this script.");
  const mimeType = imageTypes[extname(referencePath).toLowerCase()];
  if (!mimeType) throw new Error("Use a PNG, JPEG, or WebP reference image.");
  if (imageTypes[extname(outputPath).toLowerCase()] !== "image/jpeg")
    throw new Error("Use a .jpg or .jpeg output path.");

  const reference = await readFile(referencePath);
  const prompt = [
    "Design one new vehicle for the demolition derby game shown in the reference screenshot.",
    brief,
    "Match the reference's stylized real-time 3D look, with chunky proportions, simple beveled forms, and clearly separated painted metal, rubber, and mechanical parts.",
    "Show the complete vehicle from a slightly elevated front three-quarter angle on a neutral floor with soft daylight. Keep the silhouette, wheels, and chassis easy to read for 3D modeling. Exclude drivers, text, logos, and UI.",
  ].join("\n\n");
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1/interactions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      redirect: "error",
      signal: AbortSignal.timeout(180_000),
      body: JSON.stringify({
        model,
        store: false,
        input: [
          {
            type: "user_input",
            content: [
              {
                type: "image",
                mime_type: mimeType,
                data: reference.toString("base64"),
              },
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
  if (!response.ok)
    throw new Error(
      `Gemini returned HTTP ${response.status}. ${result?.error?.message ?? ""}`,
    );
  const image = result?.steps
    ?.filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .find((part) => part.type === "image" && part.data);
  if (!image)
    throw new Error(
      `Gemini returned no image (${result?.status ?? "unknown status"}).`,
    );
  if (image.mime_type !== "image/jpeg")
    throw new Error(
      `Expected JPEG output but Gemini returned ${image.mime_type}.`,
    );

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(image.data, "base64"));
  console.log(`Saved ${outputPath} using ${model}`);
}

try {
  await main();
} catch (error) {
  console.error(
    apiKey ? error.message.replaceAll(apiKey, "[redacted]") : error.message,
  );
  process.exitCode = 1;
}
