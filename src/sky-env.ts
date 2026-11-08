import * as T from "three";

/** Dark ground bounce for the baked sky environment. */
export const SKY_ENV_GROUND = 0x1a2027;
const SKY_ENV_SIZE = 64;

function lerpChannel(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

/** Headless-safe gradient: sky top melts into the horizon, then dark ground. */
export function paintSkyGradient(top: number, horizon: number): T.DataTexture {
  const w = SKY_ENV_SIZE;
  const h = SKY_ENV_SIZE;
  const data = new Uint8Array(w * h * 4);
  const c = (hex: number) => [(hex >> 16) & 0xff, ((hex >> 8) & 0xff), hex & 0xff];
  const topC = c(top);
  const horC = c(horizon);
  const gndC = c(SKY_ENV_GROUND);
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const from = t < 0.5 ? topC : horC;
    const to = t < 0.5 ? horC : gndC;
    const k = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i] = lerpChannel(from[0], to[0], k);
      data[i + 1] = lerpChannel(from[1], to[1], k);
      data[i + 2] = lerpChannel(from[2], to[2], k);
      data[i + 3] = 255;
    }
  }
  const tex = new T.DataTexture(data, w, h);
  tex.colorSpace = T.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Tiny gradient-dome scene for PMREM baking a weather-matched environment. */
export function buildSkyEnvScene(top: number, horizon: number): T.Scene {
  const scene = new T.Scene();
  const dome = new T.Mesh(
    new T.SphereGeometry(10, 16, 12),
    new T.MeshBasicMaterial({ map: paintSkyGradient(top, horizon), side: T.BackSide }),
  );
  scene.add(dome);
  return scene;
}
