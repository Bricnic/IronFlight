import { ROUTES } from "./routes";
export type Hazard = {
  id: string;
  route: "easy" | "medium" | "hard";
  kind: "fire" | "hammer" | "spikes" | "lava";
  x: number;
  y: number;
  z: number;
};
export const HAZARDS: Hazard[] = ROUTES.flatMap((r) => {
  const all: Hazard[] = [
    { id: `${r.id}-fire`, route: r.id, kind: "fire", x: r.x, y: 2, z: 18 },
  ];
  if (r.id !== "easy")
    all.push(
      {
        id: `${r.id}-hammer`,
        route: r.id,
        kind: "hammer",
        x: r.x + 8.3,
        y: 3.5,
        z: 26,
      },
      {
        id: `${r.id}-spikes`,
        route: r.id,
        kind: "spikes",
        x: r.x,
        y: -3.5,
        z: 24,
      },
    );
  if (r.id === "hard")
    all.push(
      { id: "hard-fire-2", route: r.id, kind: "fire", x: r.x, y: 2.8, z: 30 },
      { id: "hard-lava", route: r.id, kind: "lava", x: r.x, y: -5.4, z: 31 },
    );
  return all;
});
export function hammerAngle(time: number) {
  return time * 1.7 * 1.5;
}
