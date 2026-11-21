import * as T from "three";
import { prefabY, type CustomPrefab, type CustomSolid } from "./custom-level";

const DEFAULTS: Record<string, { lumens: number; color: number; height: number }> = {
  "cave-fairy": { lumens: 150, color: 0xff6fe0, height: 0 },
  firefly: { lumens: 150, color: 0xffd23b, height: 0 },
  "glow-mushroom": { lumens: 500, color: 0x4ff5e0, height: 2.6 },
  "birthday-candle": { lumens: 250, color: 0xffe6a3, height: 1.56 },
  "gold-star": { lumens: 300, color: 0xffe6a3, height: 0 },
};
export function prefabLightSettings(p: Pick<CustomPrefab, "kind" | "lightLumens" | "lightColor">) {
  const defaults = DEFAULTS[p.kind];
  return { lumens: p.lightLumens ?? defaults?.lumens ?? 0, color: p.lightColor ?? defaults?.color ?? 0xffffff, height: defaults?.height ?? 0 };
}
export function validPrefabLightPatch(patch: Record<string, unknown>) {
  return (patch.lightLumens === undefined || typeof patch.lightLumens === "number" && Number.isFinite(patch.lightLumens) && patch.lightLumens >= 0) &&
    (patch.lightColor === undefined || typeof patch.lightColor === "number" && Number.isInteger(patch.lightColor) && patch.lightColor >= 0 && patch.lightColor <= 0xffffff);
}
/** Bound shader cost while keeping the nearest emitters active. Power is in lumens. */
export class PrefabLights extends T.Group {
  static readonly capacity = 16;
  private pool: T.PointLight[] = [];
  update(prefabs: CustomPrefab[], focus: T.Vector3, anchorFor?: (id: string, kind: "solid" | "prefab") => T.Object3D | undefined, solids: CustomSolid[] = []) {
    const objects: { object: CustomPrefab | CustomSolid; kind: "solid" | "prefab" }[] = [
      ...prefabs.map(object => ({ object, kind: "prefab" as const })),
      ...solids.map(object => ({ object, kind: "solid" as const })),
    ];
    const sources = objects.flatMap(({ object: p, kind }) => {
      const settings = prefabLightSettings(p); if (settings.lumens <= 0) return [];
      const anchor = anchorFor?.(p.id, kind);
      if (anchor && !anchor.visible) return [];
      const origin = kind === "prefab" ? anchor?.getObjectByName("prefab-light-origin") : undefined;
      const height = kind === "solid" ? (p as CustomSolid).h / 2 + 0.15 : settings.height;
      const position = origin ? origin.getWorldPosition(new T.Vector3()) : anchor
        ? anchor.localToWorld(new T.Vector3(0, height, 0))
        : kind === "solid" ? new T.Vector3(0, height, 0).applyEuler(new T.Euler(p.angle ?? 0, p.yaw ?? 0, p.roll ?? 0, "YXZ")).add(new T.Vector3(p.x, p.y, p.z))
        : new T.Vector3(p.x, prefabY(p as CustomPrefab) + height * ((p as CustomPrefab).resizeScale ?? 1), p.z);
      return [{ id: p.id, position, ...settings }];
    }).sort((a, b) => a.position.distanceToSquared(focus) - b.position.distanceToSquared(focus)).slice(0, PrefabLights.capacity);
    while (this.pool.length < sources.length) {
      const light = new T.PointLight(0xffffff, 0, 40, 2);
      this.pool.push(light); this.add(light);
    }
    this.pool.forEach((light, i) => {
      const source = sources[i]; light.visible = !!source;
      if (!source) return;
      light.userData.prefabId = source.id;
      light.position.copy(source.position); light.color.setHex(source.color); light.power = source.lumens;
      light.distance = Math.max(12, Math.min(80, Math.sqrt(source.lumens) * 2));
    });
  }
  inspect() {
    return this.pool.filter(o => o.visible).map(o => ({ id: o.userData.prefabId as string, lumens: o.power, color: o.color.getHex(), position: o.position.toArray() }));
  }
}
