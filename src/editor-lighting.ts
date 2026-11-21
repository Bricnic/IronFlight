import * as T from "three";
import { prefabY, type CustomLevel } from "./custom-level";
import { buildCandleLightPool, assignCandleLights } from "./candle-lights";
import { buildMysticLightPool, assignMysticLights, MYSTIC_SOURCE_COLORS } from "./mystic-lights";

/** The gameplay light pools at time zero; editor previews never animate them. */
export function buildEditorLocalLights(level: CustomLevel, focus: T.Vector3, night: boolean) {
  const root = new T.Group(); root.name = "editor-local-lights";
  const sources = level.prefabs.map(p => ({ ...p, y: prefabY(p), phase: 0 }));
  const candles = sources.filter(p => p.kind === "candle");
  if (candles.length) {
    const pool = buildCandleLightPool(); assignCandleLights(pool, candles, focus, night, 0); root.add(...pool);
  }
  const mystic = sources.filter(p => p.kind in MYSTIC_SOURCE_COLORS).map(p => ({ ...p, color: MYSTIC_SOURCE_COLORS[p.kind] }));
  if (mystic.length) {
    const pool = buildMysticLightPool(); assignMysticLights(pool, mystic, focus, night, 0); root.add(...pool);
  }
  return root;
}
