import { beforeEach, expect, it, vi } from "vitest";
import * as T from "three";
import { buildDungeonModel } from "../src/dungeon-view";
import { buildEditorPrefab } from "../src/editor-prefabs";
import {
  buildAlien,
  buildAsteroid,
  buildMeteor,
  buildMoonRock,
  buildSatelliteDish,
  buildSolarPanel,
  buildSpaceCrate,
  buildStationPillar,
  buildUfo,
  poseAlien,
  poseAsteroid,
  poseMeteor,
  poseUfo,
} from "../src/space-view";

beforeEach(() => {
  const ctx = {
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    measureText: () => ({ width: 10 }),
  };
  vi.stubGlobal("document", {
    createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
  });
});

const KINDS = [
  "station-pillar",
  "solar-panel",
  "satellite-dish",
  "moon-rock",
  "space-crate",
  "station-tower",
  "habitat-dome",
  "asteroid",
  "meteor",
  "alien",
  "ufo",
];

function triangles(root: T.Object3D) {
  let count = 0;
  root.traverse((o) => {
    if (o instanceof T.Mesh) {
      const geo = o.geometry as T.BufferGeometry;
      count += (geo.index?.count ?? geo.attributes.position.count) / 3;
    }
  });
  return count;
}

function parts(root: T.Object3D) {
  let count = 0;
  root.traverse((o) => {
    if (o instanceof T.Mesh) count++;
  });
  return count;
}

it("builds eleven detailed models identically in preview and gameplay", () => {
  for (const kind of KINDS) {
    const p = { id: `space-${kind}`, kind, x: 5, z: 8, y: 0 };
    const preview = new T.Box3()
      .setFromObject(buildEditorPrefab(p, true))
      .getSize(new T.Vector3());
    const game = new T.Box3()
      .setFromObject(
        buildDungeonModel({ ...p, kind: kind as never, phase: 0 }).root,
      )
      .getSize(new T.Vector3());
    expect(preview.distanceTo(game), `${kind} preview/gameplay`).toBeLessThan(1e-5);
    const model = buildDungeonModel({ ...p, kind: kind as never, phase: 0 });
    expect(parts(model.root), `${kind} parts`).toBeGreaterThanOrEqual(2);
    expect(triangles(model.root), `${kind} triangles`).toBeGreaterThan(800);
  }
});

it("tumbles asteroids, falls meteors, walks aliens, and aims ufo beams", () => {
  const rock = new T.Group();
  const asteroid = buildAsteroid(rock);
  poseAsteroid(asteroid, rock, 10, 8, 20, 0);
  expect(rock.position.toArray()).toEqual([10, 8, 20]);
  poseAsteroid(asteroid, rock, 10, 8, 20, 0.5);
  expect(asteroid.rock.rotation.x).not.toBeCloseTo(0, 5);

  const fall = new T.Group();
  const meteor = buildMeteor(fall);
  poseMeteor(meteor, fall, 0, 40, 0, true, 0);
  expect(fall.visible).toBe(true);
  poseMeteor(meteor, fall, 0, 1, 0, false, 10);
  expect(fall.visible).toBe(false);

  const yard = new T.Group();
  const alien = buildAlien(yard);
  poseAlien(alien, yard, 5, 0, 6, 1.2, 0);
  expect(yard.position.toArray()).toEqual([5, 0, 6]);
  expect(yard.rotation.y).toBeCloseTo(1.2, 5);
  const knee = alien.limbs[0].rotation.x;
  poseAlien(alien, yard, 5, 0, 6, 1.2, 0.7);
  expect(alien.limbs[0].rotation.x).not.toBeCloseTo(knee, 5);

  const sky = new T.Group();
  const ufo = buildUfo(sky);
  poseUfo(ufo, sky, 0, 14, 0, 0, null, 1);
  expect(ufo.beam.visible).toBe(false);
  poseUfo(ufo, sky, 0, 14, 0, 0, { x: 3, y: 1, z: 4 }, 2);
  expect(ufo.beam.visible).toBe(true);
  expect(ufo.beam.scale.y).toBeGreaterThan(10);
});
