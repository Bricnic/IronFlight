import { expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { VEHICLES } from "../src/vehicles";

it("ships a thumbnail and WebM turntable for every garage vehicle", async () => {
  for (const vehicle of VEHICLES) {
    const clip = await readFile(
      `public/vehicles/turntables/${vehicle.id}.webm`,
    );
    expect(clip.byteLength, vehicle.id).toBeGreaterThan(1000);
    expect(clip.subarray(0, 4).toString("hex"), vehicle.id).toBe("1a45dfa3");
    const thumbnail = await readFile(`public/vehicles/${vehicle.id}.png`);
    expect(
      [thumbnail.readUInt32BE(16), thumbnail.readUInt32BE(20)],
      vehicle.id,
    ).toEqual([800, 450]);
  }
});
