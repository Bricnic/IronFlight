import { beforeAll, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";

const id = "custom:frostfire-pass";
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(officialFileTracks.find((track) => track.id === id)!);
});

type DinoPrefab = { id: string; kind: string; scale?: number };

function dinoPrefabs(file: string): DinoPrefab[] {
  const level = JSON.parse(readFileSync(file, "utf8")) as {
    prefabs: DinoPrefab[];
  };
  return (level.prefabs ?? []).filter((p) =>
    ["raptor", "pterosaur", "spinosaurus", "ember-wyvern"].includes(p.kind),
  );
}

it("keeps every level dinosaur at the large Jurassic scale", () => {
  const files = readdirSync("levels/official").filter((f) =>
    f.endsWith(".json"),
  );
  expect(files.length).toBeGreaterThan(0);
  let dinos = 0;
  for (const file of files) {
    if (file === "order.json") continue;
    for (const dino of dinoPrefabs(`levels/official/${file}`)) {
      dinos++;
      expect(dino.scale, `${file}:${dino.id}`).toBe(2);
    }
  }
  expect(dinos).toBeGreaterThan(0);
});

it("wrecks a parked truck within two giant bites", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: 36, y: 11.1, z: -25 }, true);
    const mech = () =>
      sim.dungeon.mechanisms.find((m) => m.h.id === "frost-raptor")!;
    for (let i = 0; i < 1200 && sim.status === "driving"; i++)
      sim.step({ brake: 1 });
    const bites = mech().contacts;
    expect(bites).toBeGreaterThanOrEqual(1);
    expect(sim.status).toBe("wrecked");
    expect(bites, "bites to kill").toBeLessThanOrEqual(2);
  } finally {
    sim.dispose();
  }
});
