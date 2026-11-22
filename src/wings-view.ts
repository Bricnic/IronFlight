import * as T from "three";

/** Feather rows per wing: [count, length, height, fan]. */
const ROWS = [
  { count: 9, len: 2.2, y: 0, fan: 0.5 },
  { count: 7, len: 1.6, y: 0.5, fan: 0.42 },
  { count: 5, len: 1.0, y: 0.9, fan: 0.3 },
];

function feather(len: number, mat: T.Material) {
  const geometry = new T.SphereGeometry(0.5, 12, 10);
  geometry.scale(0.32, len, 0.1);
  const mesh = new T.Mesh(geometry, mat);
  mesh.castShadow = true;
  return mesh;
}

/**
 * Paired feathered wings with wingL/wingR pivots for poseWings.
 * Layered primaries/secondaries/coverts with gold outer tips.
 */
export function buildWings(scale = 1) {
  const group = new T.Group();
  group.name = "dream-wings";
  const white = new T.MeshStandardMaterial({
    color: 0xf5f0e6,
    roughness: 0.5,
    metalness: 0.1,
    emissive: 0x443c22,
    emissiveIntensity: 0.25,
  });
  const gold = new T.MeshStandardMaterial({
    color: 0xf0c96a,
    roughness: 0.35,
    metalness: 0.5,
    emissive: 0x7a5a00,
    emissiveIntensity: 0.4,
  });
  for (const side of [-1, 1]) {
    const pivot = new T.Group();
    pivot.name = side < 0 ? "wingL" : "wingR";
    pivot.position.set(side * 0.8, 1.2, -0.5);
    const arm = new T.Mesh(
      new T.CylinderGeometry(0.18, 0.26, 3.2, 12),
      white,
    );
    arm.rotation.z = Math.PI / 2;
    arm.position.x = side * 1.6;
    pivot.add(arm);
    for (const [row, def] of ROWS.entries()) {
      for (let i = 0; i < def.count; i++) {
        const t = def.count === 1 ? 0 : i / (def.count - 1) - 0.5;
        const f = feather(
          def.len * (1 - Math.abs(t) * 0.45),
          row === 0 && Math.abs(t) > 0.3 ? gold : white,
        );
        f.position.set(
          side * (1.2 + Math.abs(t) * 3.4),
          def.y - Math.abs(t) * 0.7,
          -0.2 - row * 0.35,
        );
        f.rotation.z = side * (Math.PI / 2.5 + t * def.fan);
        f.rotation.y = side * t * 0.4;
        pivot.add(f);
      }
    }
    group.add(pivot);
  }
  group.scale.setScalar(scale);
  return group;
}

export type WingPose = "fold" | "flap" | "glide";

/** Flap/fold/glide the wingL/wingR pivots; safe on partial groups. */
export function poseWings(group: T.Group, time: number, mode: WingPose) {
  for (const name of ["wingL", "wingR"]) {
    const pivot = group.getObjectByName(name);
    if (!pivot) continue;
    const side = name === "wingL" ? -1 : 1;
    if (mode === "fold") {
      pivot.rotation.set(0, 0, side * 1.15);
    } else if (mode === "glide") {
      pivot.rotation.set(0, 0, side * (0.12 + Math.sin(time * 2.2) * 0.05));
    } else {
      pivot.rotation.set(
        Math.sin(time * 9 + 1) * 0.08,
        0,
        side * (0.35 + Math.sin(time * 9) * 0.5),
      );
    }
  }
}

let glowTexture: T.DataTexture | null = null;
function wingsGlowTexture(): T.DataTexture {
  if (glowTexture) return glowTexture;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (x - size / 2) / (size / 2);
      const dy = (y - size / 2) / (size / 2);
      const d = Math.min(1, Math.hypot(dx, dy));
      const a = Math.round(255 * Math.pow(1 - d, 2.2));
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 236;
      data[i + 2] = 180;
      data[i + 3] = a;
    }
  glowTexture = new T.DataTexture(data, size, size);
  glowTexture.needsUpdate = true;
  return glowTexture;
}

/** World pickup: flapping wings over a gold ring with an additive glow. */
export function buildWingsPickup(scale = 1) {
  const group = new T.Group();
  const wings = buildWings(1);
  wings.position.y = 1.2;
  const glow = new T.Sprite(
    new T.SpriteMaterial({
      map: wingsGlowTexture(),
      color: 0xffe9a8,
      transparent: true,
      opacity: 0.6,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.scale.setScalar(7);
  glow.raycast = () => {};
  const ring = new T.Mesh(
    new T.TorusGeometry(1.8, 0.12, 12, 40),
    new T.MeshBasicMaterial({ color: 0xf0c96a }),
  );
  ring.rotation.x = Math.PI / 2;
  group.add(wings, glow, ring);
  group.scale.setScalar(scale);
  return group;
}

export function wingsStats(group: T.Group) {
  let meshes = 0,
    triangles = 0;
  group.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    meshes++;
    const g = o.geometry;
    triangles += (g.index ? g.index.count : g.position.count) / 3;
  });
  return { meshes, triangles };
}
