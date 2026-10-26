import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getTrack } from "./tracks";
import { courseSolids, courseProps } from "./course";
import { comicHazards } from "./comic-hazards";
import { ROUTES, routeSolids } from "./routes";
import { LOOP, loopSolids } from "./loop";
import {
  COMIC_PREFAB_KINDS,
  validateCustomLevel,
  type CustomLevel,
  type CustomPrefab,
  type CustomSolid,
  type SolidKind,
} from "./custom-level";
/** Committed clone levels live under public/, twin to the gitignored levels/. */
export const SHOWCASE_DIR = "showcase";
/** Harbor Sprint translates losslessly: same solids, props, gates, medals. */
export function cloneHarborSprint(): CustomLevel {
  const track = getTrack("harbor-sprint");
  const solids: CustomSolid[] = courseSolids(track).map((s) => ({
    id: s.id,
    kind: s.kind as SolidKind,
    x: s.x,
    y: s.y,
    z: s.z,
    w: s.w,
    h: s.h,
    d: s.d,
    ...(s.yaw === undefined ? {} : { yaw: s.yaw }),
    ...(s.angle === undefined ? {} : { angle: s.angle }),
    ...(s.roll === undefined ? {} : { roll: s.roll }),
    color: s.color,
  }));
  const prefabs: CustomPrefab[] = [
    ...courseProps(track).map((p) => ({
      id: p.id,
      kind: p.kind,
      x: p.x,
      z: p.z,
      ...(p.ground ? { y: p.ground } : {}),
    })),
    ...comicHazards(track)
      .filter((h) =>
        (COMIC_PREFAB_KINDS as readonly string[]).includes(h.kind),
      )
      .map((h) => ({
        id: h.id,
        kind: h.kind,
        x: h.x,
        z: h.z,
        ...(h.y === undefined ? {} : { y: h.y }),
      })),
  ];
  return validateCustomLevel({
    name: "Clone Harbor Sprint",
    mode: "race",
    spawn: { ...track.spawn },
    checkpoints: track.path.slice(1).map((p) => ({ x: p.x, z: p.z })),
    solids,
    prefabs,
    medals: { ...track.medals },
  });
}
/**
 * Triple Loop translates the easy route: route solids plus the loop beds,
 * one loop prefab, four dragon statues, and a lava pit under the jump gap.
 * Known gaps: no boost pads, chevrons, or gap fire; east dragons face away
 * (prefabs have no yaw yet); loop/jump completion flags don't gate customs.
 */
export function cloneTripleLoop(): CustomLevel {
  const track = getTrack("triple-loop");
  const route = ROUTES.find((r) => r.id === "easy")!;
  const solids: CustomSolid[] = [
    ...routeSolids()
      .filter((s) => s.x === route.x)
      .map((s, i) => ({
        id: `route-${i}`,
        kind: (s.kind === "landing" ? "road" : s.kind) as SolidKind,
        x: s.x,
        y: s.y,
        z: s.z,
        w: s.w,
        h: s.h,
        d: s.d,
        ...(s.angle === undefined ? {} : { angle: s.angle }),
        color: 0x303e49,
      })),
    ...loopSolids()
      .filter(
        (s) =>
          s.kind === "road" && (s.x === route.x || s.x === route.x + 12),
      )
      .map((s, i) => ({
        id: `bed-${i}`,
        kind: "road" as SolidKind,
        x: s.x,
        y: s.y,
        z: s.z,
        w: s.w,
        h: s.h,
        d: s.d,
        color: 0x303e49,
      })),
    {
      id: "gap-lava",
      kind: "lava",
      x: route.x,
      y: -7.0125,
      z: (route.gapEnd + 12) / 2,
      w: 13,
      h: 2.175,
      d: route.gapEnd - 12,
      color: 0xff6a20,
    },
    {
      id: "arena-floor",
      kind: "ground",
      x: 0,
      y: -9.2,
      z: 140,
      w: 340,
      h: 1,
      d: 630,
      color: 0xc7dfb2,
      texture: "grass_ground",
    },
  ];
  const prefabs: CustomPrefab[] = [
    { id: "loop-1", kind: "loop", x: route.x, z: LOOP.z },
    ...LOOP.dragonZ.flatMap((z) =>
      [-1, 1].map((side) => ({
        id: `dragon-${z}-${side}`,
        kind: "dragon",
        x: route.x + side * 10,
        z,
      })),
    ),
    { id: "stand-west", kind: "grandstand", x: -83, z: 10 },
    { id: "stand-east", kind: "grandstand", x: 65, z: 10 },
    ...[-57, 57].flatMap((x) =>
      [-90, 0, 95].map((z) => ({
        id: `lamp-${x}-${z}`,
        kind: "lamp",
        x,
        z,
      })),
    ),
  ];
  return validateCustomLevel({
    name: "Clone Triple Loop",
    mode: "race",
    spawn: { ...track.spawn },
    checkpoints: track.path.slice(1).map((p) => ({ x: p.x, z: p.z })),
    solids,
    prefabs,
    medals: { ...track.medals },
  });
}
/** Regenerate the committed clones; the showcase test pins their content. */
export function writeShowcaseClones(publicDir: string) {
  const dir = join(publicDir, SHOWCASE_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "clone-harbor-sprint.json"),
    JSON.stringify(cloneHarborSprint(), null, 2) + "\n",
  );
  writeFileSync(
    join(dir, "clone-triple-loop.json"),
    JSON.stringify(cloneTripleLoop(), null, 2) + "\n",
  );
}
