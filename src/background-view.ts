import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { pbr } from "./materials";
import {
  getBackgroundTemplate,
  layoutRing,
  mulberry32,
  resolveMood,
  type BackgroundShapeRing,
  type BackgroundTemplate,
} from "./backgrounds";
import { DEFAULT_WEATHER, type WeatherFlags } from "./weather";
import { RAIN_STREAK_COUNT, RAIN_STREAK_HEIGHT, buildRainStreaks, layoutRainStreaks } from "./rain-streaks";
import type { Track } from "./tracks";

/** Lerp a base color toward the horizon haze by ring distance. */
export function applyHaze(base: T.Color, horizon: T.Color, radius: number): T.Color {
  return base.lerp(horizon, Math.min(0.45, Math.max(0, radius) / 1400));
}

/** Seeded star points on the upper sky dome; fog-free so they read at night. */
export const STAR_COUNT = 300;
/** Storm-gray cloud tint while raining. */
export const STORM_CLOUD = 0x59616e;
export function buildStarField(count: number): T.Points {
  const rand = mulberry32(0x5eed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const azimuth = rand() * Math.PI * 2;
    const altitude = 0.08 + rand() * 0.85;
    const r = 580 * Math.cos(altitude);
    positions[i * 3] = Math.cos(azimuth) * r;
    positions[i * 3 + 1] = 580 * Math.sin(altitude);
    positions[i * 3 + 2] = Math.sin(azimuth) * r;
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
  const material = new T.PointsMaterial({
    size: 1.6,
    sizeAttenuation: false,
    color: 0xdceaff,
    transparent: true,
    opacity: 0.9,
    fog: false,
    depthWrite: false,
  });
  const stars = new T.Points(geometry, material);
  stars.name = "background-stars";
  stars.raycast = () => {};
  stars.frustumCulled = false;
  return stars;
}
/** Deterministic 0..1 hash for per-shape variation without RNG state. */
function hash(n: number) {
  return Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
}

const KIND_TEXTURE: Partial<Record<string, string>> = {
  hill: "grass_ground",
  mountain: "dark_rock_02",
  "snow-peak": "snow_01",
  mesa: "cracked_red_ground",
  tree: "bark_brown_01",
  "dead-tree": "bark_brown_01",
  skyscraper: "concrete_layers_02",
  "container-stack": "green_metal_rust",
  crane: "green_metal_rust",
  smokestack: "concrete_floor_02",
  "toy-block": "blue_plaster_wall",
  "rock-wall": "dark_rock_02",
};

const FOLIAGE_GREENS = [0x3f7a3a, 0x4d8a3f, 0x2f6b35];
const TOY_COLORS = [0xd94f3d, 0xe08a2d, 0xe8c53a, 0x4da64d, 0x3d7ad9, 0x8a4fd9];

function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): T.Texture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

let cloudMap: T.Texture | null | undefined;
function getCloudTexture() {
  if (cloudMap !== undefined) return cloudMap;
  cloudMap = canvasTexture(128, 64, (ctx) => {
    for (let i = 0; i < 16; i++) {
      const x = 14 + hash(i * 3 + 1) * 100;
      const y = 20 + hash(i * 3 + 2) * 26;
      const r = 10 + hash(i * 3 + 3) * 16;
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 64);
    }
  });
  return cloudMap;
}

let windowMap: T.Texture | null | undefined;
function getWindowTexture() {
  if (windowMap !== undefined) return windowMap;
  windowMap = canvasTexture(64, 128, (ctx) => {
    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, 0, 64, 128);
    for (let row = 0; row < 12; row++)
      for (let col = 0; col < 6; col++) {
        const lit = hash(row * 31 + col * 7 + 1) > 0.45;
        ctx.fillStyle = lit ? "#ffd98a" : "#232a33";
        ctx.fillRect(4 + col * 10, 5 + row * 10, 6, 6);
      }
  });
  return windowMap;
}

let stripeMap: T.Texture | null | undefined;
function getStripeTexture() {
  if (stripeMap !== undefined) return stripeMap;
  stripeMap = canvasTexture(128, 32, (ctx) => {
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? "#f2ede2" : "#d94f3d";
      ctx.fillRect(i * 11, 0, 11, 32);
    }
  });
  return stripeMap;
}

let moonMap: T.Texture | null | undefined;
function getMoonTexture() {
  if (moonMap !== undefined) return moonMap;
  moonMap = canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.75, "rgba(244,241,222,1)");
    g.addColorStop(1, "rgba(244,241,222,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  return moonMap;
}

interface Part {
  geometry: T.BufferGeometry;
  material: T.Material;
}

function place(
  geometry: T.BufferGeometry,
  x: number,
  y: number,
  z: number,
  scale: number,
  rotationY = 0,
  scaleY?: number,
) {
  const matrix = new T.Matrix4().compose(
    new T.Vector3(x, y, z),
    new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rotationY),
    new T.Vector3(scale, scaleY ?? scale, scale),
  );
  geometry.applyMatrix4(matrix);
  return geometry;
}

/** Tile skyscraper side UVs so one window-texture repeat covers 4x8m (~0.67m windows). Roof keeps 0-1. */
export function tileSkyscraperUVs(geometry: T.BufferGeometry, size: number) {
  const uv = geometry.attributes.uv as T.BufferAttribute;
  const n = geometry.attributes.normal as T.BufferAttribute;
  const ru = size / 4, rv = size / 2;
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(n.getY(i)) > 0.5) continue;
    uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
  }
  uv.needsUpdate = true;
}

export class BackgroundView extends T.Group {
  private key = "";
  private builtTrack: Track | null = null;
  private templateName = "";
  private shapeCount = 0;
  private matCache = new Map<string, T.Material>();
  private clouds: { sprite: T.Sprite; baseX: number; drift: number; day: number }[] = [];
  private skyMaterial: T.ShaderMaterial | null = null;
  private stars: T.Points | null = null;
  private nightApplied = false;
  private rain: T.LineSegments | null = null;
  private rainApplied = false;

  update(
    track: Track | null,
    time: number,
    focusX: number,
    focusZ: number,
    far: number,
    weather: WeatherFlags = DEFAULT_WEATHER,
    focusY = 0,
  ) {
    const template = getBackgroundTemplate(
      track?.backgroundTemplate ?? track?.custom?.backgroundTemplate,
    );
    const key = `${track?.id ?? ""}:${template.name}`;
    if (key !== this.key || track !== this.builtTrack) {
      this.rebuild(template);
      this.key = key;
      this.builtTrack = track;
    }
    const mood = resolveMood(template, weather);
    if (this.skyMaterial) {
      this.skyMaterial.uniforms.topColor.value.setHex(mood.sky.top);
      this.skyMaterial.uniforms.horizonColor.value.setHex(mood.sky.horizon);
    }
    this.nightApplied = weather.night && !template.underground;
    if (this.stars) this.stars.visible = this.nightApplied;
    this.rainApplied = weather.rain && !template.underground;
    if (this.rain) {
      this.rain.visible = this.rainApplied;
      this.rain.position.y = focusY - RAIN_STREAK_HEIGHT / 2;
      if (this.rainApplied) layoutRainStreaks(this.rain, time);
    }
    this.position.set(focusX, 0, focusZ);
    this.scale.setScalar(far / 650);
    for (const cloud of this.clouds) {
      cloud.sprite.position.x =
        ((((cloud.baseX + time * cloud.drift + 700) % 1400) + 1400) % 1400) -
        700;
      (cloud.sprite.material as T.SpriteMaterial).color.setHex(
        weather.rain ? STORM_CLOUD : cloud.day,
      );
    }
  }

  stats() {
    return {
      template: this.templateName,
      shapes: this.shapeCount,
      clouds: this.clouds.length,
      stars: this.nightApplied && this.stars ? STAR_COUNT : 0,
      night: this.nightApplied,
      rainStreaks: this.rainApplied && this.rain ? RAIN_STREAK_COUNT : 0,
      rain: this.rainApplied,
    };
  }

  private cached<T extends T.Material>(key: string, make: () => T): T {
    const hit = this.matCache.get(key);
    if (hit) return hit as T;
    const material = make();
    this.matCache.set(key, material);
    return material;
  }

  private flatMat(color: number) {
    return this.cached(`flat|${color}`, () => {
      const material = new T.MeshStandardMaterial({
        color,
        roughness: 0.9,
        metalness: 0,
        flatShading: true,
      });
      material.fog = false;
      return material;
    });
  }

  private texMat(
    id: string,
    repeat: number,
    horizon: T.Color,
    radius: number,
    color = 0xffffff,
  ) {
    return this.cached(`pbr|${id}|${repeat}|${color}`, () => {
      const material = pbr(id, repeat, { color });
      material.fog = false;
      applyHaze(material.color as T.Color, horizon, radius);
      return material;
    });
  }

  private materialFor(
    ring: BackgroundShapeRing,
    horizon: T.Color,
    repeat: number,
    variant: number,
  ): T.Material {
    const id = ring.texture ?? KIND_TEXTURE[ring.kind];
    switch (ring.kind) {
      case "tent":
        return this.cached("tent", () => {
          const map = getStripeTexture();
          const material = map
            ? new T.MeshStandardMaterial({ map, roughness: 0.8 })
            : new T.MeshStandardMaterial({
                color: 0xd94f3d,
                roughness: 0.9,
                flatShading: true,
              });
          material.fog = false;
          return material;
        });
      case "skyscraper":
        return this.cached(`sky|${id}|${repeat}|${ring.color ?? 0xffffff}`, () => {
          const windows = getWindowTexture();
          if (windows) windows.wrapS = windows.wrapT = T.RepeatWrapping;
          const material = id
            ? pbr(id, 1, {
                color: ring.color ?? 0xffffff,
                emissive: 0xffffff,
                ...(windows ? { emissiveMap: windows } : {}),
                emissiveIntensity: windows ? 0.9 : 0,
              })
            : new T.MeshStandardMaterial({ color: ring.color ?? 0xffffff });
          material.fog = false;
          applyHaze(material.color as T.Color, horizon, ring.radius);
          return material;
        });
      case "toy-block": {
        const color =
          TOY_COLORS[Math.floor(variant * TOY_COLORS.length) % TOY_COLORS.length];
        return this.cached(`toy|${id}|${color}`, () => {
          const material = id
            ? pbr(id, 1, { color })
            : new T.MeshStandardMaterial({ color, roughness: 0.4 });
          material.fog = false;
          return material;
        });
      }
      default:
        if (!id) return this.flatMat(ring.color ?? 0xffffff);
        return this.texMat(id, repeat, horizon, ring.radius, ring.color);
    }
  }

  private rebuild(template: BackgroundTemplate) {
    this.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.dispose();
      } else if (o instanceof T.Sprite) {
        (o.material as T.Material).dispose();
      }
    });
    this.clear();
    this.matCache.clear();
    this.clouds = [];
    this.templateName = template.name;
    this.shapeCount = 0;
    this.skyMaterial = null;
    this.stars = null;
    this.rain = null;
    const horizon = new T.Color(template.fog.color);
    if (!template.underground) {
      const sky = this.buildSky(template);
      this.skyMaterial = sky.material as T.ShaderMaterial;
      this.add(sky);
      this.stars = buildStarField(STAR_COUNT);
      this.add(this.stars);
      this.rain = buildRainStreaks(RAIN_STREAK_COUNT);
      this.add(this.rain);
    }
    for (const ring of template.shapes) this.buildRing(ring, horizon);
    if (!template.underground && template.clouds && template.clouds.count > 0)
      this.buildClouds(template);
  }

  private buildSky(template: BackgroundTemplate) {
    const material = new T.ShaderMaterial({
      uniforms: {
        topColor: { value: new T.Color(template.sky.top) },
        horizonColor: { value: new T.Color(template.sky.horizon) },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        varying vec3 vDir;
        void main() {
          float h = normalize(vDir).y;
          vec3 sky = mix(horizonColor, topColor, pow(smoothstep(0.0, 0.65, h), 0.75));
          vec3 ground = mix(horizonColor, horizonColor * 0.55, smoothstep(0.0, -0.4, h));
          gl_FragColor = vec4(h < 0.0 ? ground : sky, 1.0);
        }`,
      side: T.BackSide,
      depthWrite: false,
    });
    const dome = new T.Mesh(new T.SphereGeometry(600, 32, 16), material);
    dome.name = "background-sky";
    dome.renderOrder = -1;
    dome.frustumCulled = false;
    return dome;
  }

  private ringParts(
    ring: BackgroundShapeRing,
    slot: { x: number; z: number; angle: number; scale: number },
    size: number,
    horizon: T.Color,
    repeat: number,
  ): { parts: Part[]; sprites: T.Sprite[] } {
    const parts: Part[] = [];
    const sprites: T.Sprite[] = [];
    const y = ring.y ?? 0;
    const variant = hash(slot.angle * 57.3 + ring.radius);
    const main = () => this.materialFor(ring, horizon, repeat, variant);
    const push = (geometry: T.BufferGeometry, material: T.Material) =>
      parts.push({ geometry, material });
    switch (ring.kind) {
      case "hill":
        push(
          place(
            new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
            slot.x,
            y,
            slot.z,
            size,
            0,
            size * 0.45,
          ),
          main(),
        );
        break;
      case "mountain":
        push(
          place(new T.ConeGeometry(1, 2.2, 7), slot.x, y + size * 1.1, slot.z, size, slot.angle),
          main(),
        );
        break;
      case "snow-peak": {
        push(
          place(new T.ConeGeometry(1, 2.2, 7), slot.x, y + size * 1.1, slot.z, size, slot.angle),
          this.texMat("dark_rock_02", repeat, horizon, ring.radius),
        );
        push(
          place(new T.ConeGeometry(0.45, 1, 7), slot.x, y + size * 1.7, slot.z, size, slot.angle),
          main(),
        );
        break;
      }
      case "mesa":
        push(
          place(new T.CylinderGeometry(0.72, 1, 0.8, 9), slot.x, y + size * 0.4, slot.z, size, slot.angle),
          main(),
        );
        break;
      case "tree": {
        push(
          place(new T.CylinderGeometry(0.09, 0.13, 1, 6), slot.x, y + size * 0.5, slot.z, size),
          this.texMat(
            ring.texture ?? KIND_TEXTURE.tree!,
            repeat,
            horizon,
            ring.radius,
          ),
        );
        const leaves = this.flatMat(
          FOLIAGE_GREENS[Math.floor(variant * FOLIAGE_GREENS.length) % FOLIAGE_GREENS.length],
        );
        push(
          place(new T.ConeGeometry(0.55, 1.1, 7), slot.x, y + size * 1.2, slot.z, size),
          leaves,
        );
        push(
          place(new T.ConeGeometry(0.38, 0.9, 7), slot.x, y + size * 1.75, slot.z, size),
          leaves,
        );
        break;
      }
      case "dead-tree": {
        const bark = this.texMat(
          ring.texture ?? KIND_TEXTURE["dead-tree"]!,
          repeat,
          horizon,
          ring.radius,
          0x8a8078,
        );
        push(
          place(new T.CylinderGeometry(0.07, 0.12, 1.6, 5), slot.x, y + size * 0.8, slot.z, size),
          bark,
        );
        for (let b = 0; b < 3; b++) {
          const branch = new T.CylinderGeometry(0.03, 0.05, 0.7, 5);
          branch.translate(0, 0.35, 0);
          branch.rotateZ(0.7 + variant * 0.4);
          branch.rotateY((b / 3) * Math.PI * 2 + slot.angle);
          push(place(branch, slot.x, y + size * (1 + variant * 0.3), slot.z, size), bark);
        }
        break;
      }
      case "skyscraper": {
        const tower = new T.BoxGeometry(1, 4, 1);
        tileSkyscraperUVs(tower, size);
        push(place(tower, slot.x, y + size * 2, slot.z, size, slot.angle), main());
        break;
      }
      case "container-stack": {
        const material = main();
        const levels = 2 + Math.floor(variant * 2);
        for (let l = 0; l < levels; l++)
          push(
            place(
              new T.BoxGeometry(1, 0.42, 0.5),
              slot.x + (hash(slot.angle + l) - 0.5) * size * 0.2,
              y + size * (0.21 + l * 0.42),
              slot.z,
              size,
              slot.angle,
            ),
            material,
          );
        break;
      }
      case "crane": {
        const material = main();
        const bit = (
          w: number,
          h: number,
          d: number,
          ox: number,
          oy: number,
          oz = 0,
        ) =>
          push(
            place(new T.BoxGeometry(w, h, d), slot.x + ox * size, y + oy * size, slot.z + oz * size, size),
            material,
          );
        bit(1.2, 0.12, 1.2, 0, 0.06);
        bit(0.16, 2.2, 0.16, 0, 1.1);
        bit(2.4, 0.14, 0.14, 0.5, 2.2);
        bit(0.5, 0.3, 0.3, -0.8, 2.05);
        bit(0.03, 0.9, 0.03, 1.4, 1.7);
        bit(0.12, 0.12, 0.12, 1.4, 1.2);
        break;
      }
      case "smokestack":
        push(
          place(new T.CylinderGeometry(0.55, 0.8, 2.4, 10), slot.x, y + size * 1.2, slot.z, size),
          main(),
        );
        break;
      case "tent": {
        push(
          place(new T.ConeGeometry(1, 1.15, 12), slot.x, y + size * 0.575, slot.z, size, slot.angle),
          main(),
        );
        push(
          place(new T.CylinderGeometry(0.03, 0.03, 0.5, 6), slot.x, y + size * 1.3, slot.z, size),
          this.flatMat(0x8a6a3a),
        );
        break;
      }
      case "toy-block": {
        const material = main();
        push(
          place(new T.BoxGeometry(1, 0.7, 0.7), slot.x, y + size * 0.35, slot.z, size, slot.angle),
          material,
        );
        for (const [ox, oz] of [[-0.22, -0.15], [0.22, -0.15], [-0.22, 0.15], [0.22, 0.15]])
          push(
            place(
              new T.CylinderGeometry(0.09, 0.09, 0.18, 8),
              slot.x + ox * size,
              y + size * 0.79,
              slot.z + oz * size,
              size,
            ),
            material,
          );
        break;
      }
      case "rock-wall":
        push(
          place(
            new T.BoxGeometry(1.6, 1.3, 0.35),
            slot.x,
            y + size * 0.65,
            slot.z,
            size,
            Math.atan2(slot.x, slot.z),
          ),
          main(),
        );
        break;
      case "moon": {
        const material = new T.SpriteMaterial({
          map: getMoonTexture(),
          color: ring.color ?? 0xf2eeda,
          transparent: true,
          depthWrite: false,
        });
        material.fog = false;
        const sprite = new T.Sprite(material);
        sprite.position.set(slot.x, y, slot.z);
        sprite.scale.set(size, size, 1);
        sprites.push(sprite);
        break;
      }
    }
    return { parts, sprites };
  }

  private buildRing(ring: BackgroundShapeRing, horizon: T.Color) {
    const slots = layoutRing(ring.count, ring.radius, ring.seed ?? 0);
    const repeat = Math.max(1, Math.round(ring.size[1] / 24));
    const byMaterial = new Map<T.Material, T.BufferGeometry[]>();
    for (const slot of slots) {
      const t = Math.min(1, Math.max(0, (slot.scale - 0.85) / 0.3));
      const size = ring.size[0] + (ring.size[1] - ring.size[0]) * t;
      const { parts, sprites } = this.ringParts(ring, slot, size, horizon, repeat);
      this.shapeCount += 1;
      for (const sprite of sprites) this.add(sprite);
      for (const part of parts) {
        const list = byMaterial.get(part.material);
        if (list) list.push(part.geometry);
        else byMaterial.set(part.material, [part.geometry]);
      }
    }
    for (const [material, geometries] of byMaterial) {
      const merged = mergeGeometries(geometries, false);
      for (const g of geometries) g.dispose();
      if (!merged) continue;
      const mesh = new T.Mesh(merged, material);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.add(mesh);
    }
  }

  private buildClouds(template: BackgroundTemplate) {
    const clouds = template.clouds!;
    const map = getCloudTexture();
    const slots = layoutRing(clouds.count, 1, clouds.seed ?? 0);
    for (const slot of slots) {
      const t = Math.min(1, Math.max(0, (slot.scale - 0.85) / 0.3));
      const radius = clouds.radius[0] + (clouds.radius[1] - clouds.radius[0]) * t;
      const y = clouds.y[0] + (clouds.y[1] - clouds.y[0]) * hash(slot.angle * 91.7);
      const material = new T.SpriteMaterial({
        map,
        color: clouds.color,
        transparent: true,
        opacity: clouds.opacity,
        depthWrite: false,
      });
      material.fog = false;
      const sprite = new T.Sprite(material);
      const w = 70 + t * 50;
      sprite.position.set(Math.cos(slot.angle) * radius, y, Math.sin(slot.angle) * radius);
      sprite.scale.set(w, w * 0.45, 1);
      sprite.name = "background-cloud";
      this.add(sprite);
      this.clouds.push({ sprite, baseX: sprite.position.x, drift: clouds.drift * 3, day: clouds.color });
    }
  }
}
