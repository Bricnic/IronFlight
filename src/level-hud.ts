import { Vector3 } from "three";
import { courseSolids, type CourseSolid } from "./course";
import { ROUTES, routeSolids } from "./routes";
import { loopSolids } from "./loop";
import { solidQuaternion } from "./euler";
import type { Point, Track } from "./tracks";
import type { Simulation } from "./simulation";
import type { BestTimes } from "./best-times";
import type { GoldStars } from "./gold-stars";
import { isStarRelocated } from "./gold-star-migrations";

type Marker = Point & {
  kind:
    | "spawn"
    | "checkpoint"
    | "finish"
    | "collectible"
    | "star"
    | "wings"
    | "target";
  id?: string;
  index?: number;
  ringIndex?: number;
};
export function buildMinimap(track: Track, variant?: string) {
  if (track.legacy && variant) {
    const offset = (ROUTES.find((r) => r.id === variant)?.x ?? -24) + 24;
    track = {
      ...track,
      spawn: { ...track.spawn, x: track.spawn.x + offset },
      path: track.path.map((p) => ({ ...p, x: p.x + offset })),
    };
  }
  const surfaces: CourseSolid[] = track.legacy
    ? [...routeSolids(), ...loopSolids()].map((s, i) => ({
        ...s,
        id: `legacy-${i}`,
        kind:
          s.kind === "landing"
            ? "road"
            : s.kind === "scenery"
              ? "support"
              : s.kind,
        color: track.color,
      }))
    : courseSolids(track);
  const route = [
    track.spawn,
    ...track.path,
    ...track.collectibles,
    ...(track.goldStars ?? []),
  ];
  const routeArea =
    Math.max(
      20,
      Math.max(...route.map((p) => p.x)) - Math.min(...route.map((p) => p.x)),
    ) *
    Math.max(
      20,
      Math.max(...route.map((p) => p.z)) - Math.min(...route.map((p) => p.z)),
    );
  const roads = surfaces
    .filter((s) =>
      ["ground", "road", "ramp", "tile", "container", "loop"].includes(s.kind),
    )
    .sort((a, b) => a.y - b.y)
    .map((s) => {
      const corners = s.footprint ?? [
        { x: -s.w / 2, z: -s.d / 2 },
        { x: s.w / 2, z: -s.d / 2 },
        { x: s.w / 2, z: s.d / 2 },
        { x: -s.w / 2, z: s.d / 2 },
      ];
      const rotation = solidQuaternion(s);
      return {
        id: s.id,
        points: corners.map((p) => {
          const v = new Vector3(p.x, s.h / 2, p.z).applyQuaternion(rotation);
          return { x: v.x + s.x, z: v.z + s.z };
        }),
        ground: s.kind === "ground",
        backdrop: s.kind === "ground" && s.w * s.d > routeArea * 2,
      };
    });
  const markers: Marker[] = [
    { ...track.spawn, kind: "spawn" },
    ...track.checkpoints.map(
      (p, index): Marker => ({
        ...p,
        index,
        kind:
          index === track.checkpoints.length - 1 && !track.ring
            ? "finish"
            : "checkpoint",
      }),
    ),
    ...track.collectibles.map((p): Marker => ({ ...p, kind: "collectible" })),
    ...(track.goldStars ?? []).map((p): Marker => ({ ...p, kind: "star" })),
    ...(track.wings ?? []).map((p): Marker => ({ ...p, kind: "wings" })),
    ...(track.demolish ?? []).map((p): Marker => ({ ...p, kind: "target" })),
    ...(track.rings ?? []).map(
      (p, ringIndex): Marker => ({
        ...p,
        ringIndex,
        kind: p.goal ? "finish" : "collectible",
      }),
    ),
    ...(track.ring ? [{ ...track.ring, kind: "finish" as const }] : []),
  ];
  const foreground = roads.filter((r) => !r.backdrop);
  const points = [
    ...(foreground.length ? foreground : roads).flatMap((r) => r.points),
    ...markers,
    ...track.path,
  ];
  const minX = Math.min(...points.map((p) => p.x)),
    maxX = Math.max(...points.map((p) => p.x));
  const minZ = Math.min(...points.map((p) => p.z)),
    maxZ = Math.max(...points.map((p) => p.z));
  const center = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
  // A fixed bounding circle keeps the whole course visible without zoom pumping during turns.
  const radius = Math.max(
    10,
    ...points.map((p) => Math.hypot(p.x - center.x, p.z - center.z)),
  );
  return { roads, markers, center, radius };
}
export function projectMinimap(
  map: Pick<ReturnType<typeof buildMinimap>, "center" | "radius">,
  point: Point,
  yaw: number,
  size = 240,
) {
  const dx = point.x - map.center.x,
    dz = point.z - map.center.z;
  const scale = (size / 2 - 16) / map.radius,
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  return {
    x: size / 2 + (-dx * c + dz * s) * scale,
    y: size / 2 - (dx * s + dz * c) * scale,
  };
}

/** Idle seconds without a ring/chest collection before arena guidance appears. */
export const GUIDE_IDLE_SECONDS = 15;

export interface GuideRun {
  status: string;
  elapsed: number;
  collectElapsed: number;
  collected: string[];
  ringsDone: number[];
}
/**
 * Bearing arrow toward the nearest uncollected arena ring or chest, once the
 * run has gone idle. Angle is a clockwise CSS rotation (0 points ahead).
 */
export function guideTarget(
  track: Pick<Track, "mode" | "collectibles" | "rings">,
  run: GuideRun,
  position: Point,
  forward: readonly [number, number, number] | readonly number[],
): { angle: number; distance: number; label: string } | null {
  if (track.mode !== "arena" || run.status !== "running") return null;
  if (run.elapsed - run.collectElapsed <= GUIDE_IDLE_SECONDS) return null;
  const collected = new Set(run.collected);
  const ringsDone = new Set(run.ringsDone);
  const candidates: { x: number; z: number; label: string }[] = [
    ...(track.collectibles ?? [])
      .filter((p) => !collected.has(p.id))
      .map((p) => ({ x: p.x, z: p.z, label: p.kind === "chest" ? "CHEST" : "RING" })),
    ...(track.rings ?? [])
      .filter((_, i) => !ringsDone.has(i))
      .map((r) => ({ x: r.x, z: r.z, label: "RING" })),
  ];
  if (!candidates.length) return null;
  let best = candidates[0];
  let bestDist = Math.hypot(best.x - position.x, best.z - position.z);
  for (const c of candidates.slice(1)) {
    const d = Math.hypot(c.x - position.x, c.z - position.z);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  const yaw = Math.atan2(forward[0], forward[2]);
  const bearing = Math.atan2(best.x - position.x, best.z - position.z);
  let angle = (-(bearing - yaw) * 180) / Math.PI;
  while (angle > 180) angle -= 360;
  while (angle <= -180) angle += 360;
  return { angle, distance: bestDist, label: best.label };
}

export function levelRecords(
  track: Track,
  variant: string,
  scores: BestTimes,
  bank: GoldStars,
) {
  const best = scores.best(track.id, variant),
    stars = track.goldStars ?? [];
  const found = stars.filter((s) =>
    bank.isLit(track.id, s, isStarRelocated(track.id, s.id)),
  ).length;
  return {
    time: best ? `${best.time.toFixed(1)}s` : "No time set",
    medal: best?.medal?.toUpperCase() ?? (best ? "COMPLETED" : "UNRANKED"),
    color: best?.medal ?? "none",
    stars:
      stars.length === 0
        ? "No gold star"
        : stars.length === 1
          ? found
            ? "Found"
            : "Not found"
          : `${found}/${stars.length} found`,
    found: stars.length > 0 && found === stars.length,
  };
}

export function createLevelHUD(
  host: HTMLElement,
  scores: BestTimes,
  bank: GoldStars,
) {
  const panel = document.createElement("section");
  panel.id = "level-hud";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Level map and records");
  panel.innerHTML = `<canvas id="hud-minimap" width="480" height="480" role="img" aria-label="Rotating level minimap"></canvas><div class="map-key"><span>● Spawn</span><span>○ Gates</span><span>◇ Pickups</span><span>⚑ Finish</span></div><dl><div><dt>Best time</dt><dd id="hud-best-time"></dd></div><div><dt>Best medal</dt><dd id="hud-best-medal"></dd></div><div><dt>★ Gold star</dt><dd id="hud-gold-star"></dd></div></dl>`;
  host.append(panel);
  const guide = document.createElement("div");
  guide.id = "hud-guide";
  guide.hidden = true;
  guide.setAttribute("role", "status");
  guide.innerHTML = `<span id="hud-guide-arrow">▲</span><span id="hud-guide-label"></span>`;
  host.append(guide);
  const guideArrow = guide.querySelector<HTMLElement>("#hud-guide-arrow")!,
    guideLabel = guide.querySelector<HTMLElement>("#hud-guide-label")!;
  const canvas = panel.querySelector("canvas")!,
    ctx = canvas.getContext("2d")!;
  const time = panel.querySelector<HTMLElement>("#hud-best-time")!,
    medal = panel.querySelector<HTMLElement>("#hud-best-medal")!,
    star = panel.querySelector<HTMLElement>("#hud-gold-star")!;
  let source: Track | undefined, map: ReturnType<typeof buildMinimap>;
  return {
    update(
      track: Track | undefined,
      state: ReturnType<Simulation["snapshot"]>,
      visible: boolean,
    ) {
      panel.hidden = !visible || !track || !state.run;
      if (panel.hidden || !track || !state.run) {
        guide.hidden = true;
        return;
      }
      if (source !== track) {
        source = track;
        map = buildMinimap(track, state.run.variant);
      }
      const records = levelRecords(track, state.run.variant, scores, bank);
      time.textContent = records.time;
      medal.textContent = records.medal;
      star.textContent = records.stars;
      time.dataset.medal = medal.dataset.medal = records.color;
      star.classList.toggle("found", records.found);
      const yaw = Math.atan2(state.forward[0], state.forward[2]);
      canvas.dataset.heading = String(yaw);
      canvas.setAttribute(
        "aria-label",
        `Level minimap: ${track.name}. Spawn, roads, ${track.checkpoints.length} checkpoints, collectibles and finish. Rotates with your heading.`,
      );
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, 240, 240);
      const project = (point: Point) => projectMinimap(map, point, yaw);
      for (const road of map.roads) {
        ctx.beginPath();
        road.points.forEach((point, i) => {
          const p = project(point);
          if (i) ctx.lineTo(p.x, p.y);
          else ctx.moveTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = road.backdrop
          ? "#30454e"
          : road.ground
            ? "#75878e"
            : "#9aa9ad";
        ctx.fill();
        ctx.strokeStyle = "#bbccd04a";
        ctx.lineWidth = 0.65;
        ctx.stroke();
      }
      // Route line connects the objective order without concealing the road shapes.
      ctx.beginPath();
      track.path.forEach((point, i) => {
        const p = project(point);
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      });
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#f5ba7777";
      ctx.stroke();
      ctx.setLineDash([]);
      for (const marker of map.markers) {
        const p = project(marker);
        const collected =
          marker.ringIndex !== undefined
            ? state.run.ringsDone.includes(marker.ringIndex)
            : marker.kind === "star"
              ? state.run.stars.includes(marker.id!)
              : marker.kind === "wings"
                ? state.run.wings
                : marker.kind === "collectible"
                  ? state.run.collected.includes(marker.id!)
                  : marker.kind === "target"
                    ? state.run.destroyed.includes(marker.id!)
                    : marker.index !== undefined &&
                      marker.index < state.run.checkpoint;
        // Arena chests and rings vanish once collected instead of dimming.
        if (
          track.mode === "arena" &&
          collected &&
          (marker.kind === "collectible" || marker.ringIndex !== undefined)
        )
          continue;
        ctx.globalAlpha = collected ? 0.28 : 1;
        ctx.fillStyle =
          marker.kind === "spawn"
            ? "#80edaa"
            : marker.kind === "finish"
              ? "#ff986c"
              : marker.kind === "checkpoint"
                ? "#e8f3f5"
                : marker.kind === "wings"
                  ? "#a9b9ff"
                  : "#ffdb53";
        ctx.strokeStyle = "#101e25";
        ctx.lineWidth = 1;
        if (marker.kind === "star") {
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = (i * Math.PI) / 5 - Math.PI / 2,
              r = i % 2 ? 2.2 : 5;
            const x = p.x + Math.cos(a) * r,
              y = p.y + Math.sin(a) * r;
            if (i) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (marker.kind === "finish") {
          ctx.fillRect(p.x - 3, p.y - 4, 7, 7);
          ctx.strokeRect(p.x - 3, p.y - 4, 7, 7);
          ctx.fillStyle = "#172930";
          ctx.fillRect(p.x - 3, p.y - 4, 3.5, 3.5);
          ctx.fillRect(p.x + 0.5, p.y - 0.5, 3.5, 3.5);
        } else if (["collectible", "wings", "target"].includes(marker.kind)) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - 4);
          ctx.lineTo(p.x + 4, p.y);
          ctx.lineTo(p.x, p.y + 4);
          ctx.lineTo(p.x - 4, p.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, marker.kind === "spawn" ? 4 : 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        if (marker.index === state.run.checkpoint) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.strokeStyle = "#ffbd79";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      const player = project(state.position);
      player.x = Math.max(8, Math.min(232, player.x));
      player.y = Math.max(8, Math.min(232, player.y));
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 7);
      ctx.lineTo(player.x - 5, player.y + 5);
      ctx.lineTo(player.x, player.y + 2);
      ctx.lineTo(player.x + 5, player.y + 5);
      ctx.closePath();
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#0b1a22";
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      const target = guideTarget(track, state.run, state.position, state.forward);
      guide.hidden = !target;
      if (target) {
        guideArrow.style.transform = `rotate(${target.angle}deg)`;
        guideLabel.textContent = `${target.label} ${Math.round(target.distance)}m`;
      }
    },
  };
}
