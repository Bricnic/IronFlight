import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { pbr } from "./materials";
import { CAROUSEL_SLOTS, TRAP_SLOTS } from "./fairground";
import type { Simulation } from "./simulation";
import type { Track } from "./tracks";

const COLORS = [0xee437b, 0x35cbd2, 0xffcf40, 0x845cdd, 0x61d397, 0xff873b];
const metal = (color: number) =>
  new T.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
function mesh(
  group: T.Group,
  geometry: T.BufferGeometry,
  material: T.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new T.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  group.add(m);
  return m;
}
function box(
  group: T.Group,
  size: number[],
  at: number[],
  material: T.Material,
  radius = 0.12,
) {
  return mesh(
    group,
    new RoundedBoxGeometry(size[0], size[1], size[2], 6, radius),
    material,
    ...(at as [number, number, number]),
  );
}
/** Batch the static ornamentation, preserving a high-detail mesh without a
 * draw call for every bulb, rail, rivet and canopy panel. */
function batch(group: T.Group) {
  const materials = new Map<T.Material, T.Mesh[]>();
  for (const child of [...group.children]) {
    if (child instanceof T.Group) batch(child);
    if (child instanceof T.Mesh && !Array.isArray(child.material)) {
      const list = materials.get(child.material) ?? [];
      list.push(child);
      materials.set(child.material, list);
    }
  }
  for (const [material, meshes] of materials) {
    if (meshes.length < 2) continue;
    const pieces = meshes.map((m) => {
      m.updateMatrix();
      return (
        m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
      ).applyMatrix4(m.matrix);
    });
    const geometry = mergeGeometries(pieces, false);
    pieces.forEach((p) => p.dispose());
    if (!geometry) continue;
    mesh(group, geometry, material);
    for (const m of meshes) {
      m.removeFromParent();
      m.geometry.dispose();
    }
  }
}
function label(text: string, danger = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = danger ? "#821c35" : "#182b42";
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = "#ffdb73";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 150);
  ctx.fillStyle = "#fff4d8";
  ctx.textAlign = "center";
  ctx.font = "bold 40px sans-serif";
  if (danger) {
    // Draw the skull explicitly so the warning does not depend on emoji fonts.
    ctx.beginPath();
    ctx.ellipse(72, 60, 34, 32, 0, 0, 7);
    ctx.fill();
    ctx.fillRect(51, 70, 42, 31);
    ctx.fillStyle = "#18202a";
    for (const x of [58, 85]) {
      ctx.beginPath();
      ctx.arc(x, 58, 9, 0, 7);
      ctx.fill();
    }
    for (const x of [59, 71, 83]) ctx.fillRect(x, 83, 4, 18);
    ctx.fillStyle = "#fff4d8";
    ctx.fillText(text, 302, 90);
  } else ctx.fillText(text, 256, 94);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return new T.Mesh(
    new T.PlaneGeometry(8, 2.5),
    new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }),
  );
}
export function buildCarousel() {
  const group = new T.Group();
  group.name = "giant-carousel";
  const gold = metal(0xdab75d),
    dark = metal(0x223148);
  const paint = COLORS.map(metal);
  const oak = pbr("concrete_layers_02", 3, {
    color: 0xd7a85b,
    roughness: 0.75,
  });
  const enamel = pbr("blue_plaster_wall", 3, {
    color: 0xc78ee8,
    roughness: 0.4,
  });
  const copper = pbr("green_metal_rust", 2, {
    color: 0xd6ac65,
    metalness: 0.7,
  });
  mesh(group, new T.CylinderGeometry(26, 26, 1, 192, 12), oak, 0, 0.5);
  const rim = mesh(group, new T.TorusGeometry(25.7, 0.35, 24, 384), gold, 0, 1);
  rim.rotation.x = Math.PI / 2;
  mesh(group, new T.CylinderGeometry(2.5, 3.2, 10, 96, 32), copper, 0, 6);
  const inner = mesh(
    group,
    new T.TorusGeometry(4, 0.45, 32, 256),
    enamel,
    0,
    1.2,
  );
  inner.rotation.x = Math.PI / 2;
  for (let i = 0; i < CAROUSEL_SLOTS; i++) {
    const a = (i * Math.PI * 2) / CAROUSEL_SLOTS;
    mesh(
      group,
      new T.CylinderGeometry(
        0.6,
        26,
        6,
        96,
        24,
        false,
        a,
        (Math.PI * 2) / CAROUSEL_SLOTS,
      ),
      paint[i % paint.length],
      0,
      14,
    );
    const bay = new T.Group();
    bay.rotation.y = a;
    group.add(bay);
    box(bay, [7.6, 0.12, 8.5], [0, 1.04, 17], paint[i % paint.length]);
    box(bay, [7.5, 1, 0.35], [0, 1.5, 12.5], gold);
    for (const side of [-1, 1]) {
      box(
        bay,
        [0.3, 0.7, 8.5],
        [side * 4.2, 1.35, 17],
        paint[(i + 1) % paint.length],
      );
      mesh(
        bay,
        new T.CylinderGeometry(0.14, 0.2, 10, 24, 12),
        gold,
        side * 3.5,
        6,
        12.5,
      );
      for (let j = 0; j < 6; j++) {
        const ring = mesh(
          bay,
          new T.TorusGeometry(0.25, 0.06, 12, 32),
          copper,
          side * 3.5,
          2 + j * 1.4,
          12.5,
        );
        ring.rotation.x = Math.PI / 2;
      }
    }
    const sign = label(
      TRAP_SLOTS.includes(i) ? "DANGER" : `BAY ${i + 1}`,
      TRAP_SLOTS.includes(i),
    );
    sign.position.set(0, 4, 12.45);
    sign.scale.setScalar(0.65);
    bay.add(sign);
    if (TRAP_SLOTS.includes(i)) {
      const burst = new T.Group();
      burst.name = `burst-${i}`;
      burst.position.set(0, 3, 17);
      burst.visible = false;
      bay.add(burst);
      const flash = new T.MeshBasicMaterial({
        color: 0xffb626,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      mesh(burst, new T.SphereGeometry(1.8, 24, 16), flash);
      for (let j = 0; j < 10; j++) {
        const spark = mesh(burst, new T.ConeGeometry(0.3, 3, 12), flash);
        spark.position.set(
          Math.sin(j * 2.4) * 2,
          Math.cos(j * 1.8) * 2,
          Math.cos(j * 2.4) * 2,
        );
        spark.rotation.set(j, j * 2.4, j * 1.8);
      }
    }
  }
  const bulbMats = COLORS.map(
    (color) =>
      new T.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.5,
      }),
  );
  for (let i = 0; i < 96; i++) {
    const a = (i * Math.PI) / 48;
    mesh(
      group,
      new T.SphereGeometry(0.23, 16, 12),
      bulbMats[i % 6],
      Math.sin(a) * 26,
      11,
      Math.cos(a) * 26,
    );
  }
  mesh(group, new T.SphereGeometry(1.3, 48, 32), gold, 0, 18);
  const crown = label("MIDNIGHT MERRY-GO-ROUND");
  crown.position.set(0, 11, -26);
  crown.rotation.y = Math.PI;
  group.add(crown);
  batch(group);
  return group;
}
function buildArena() {
  const group = new T.Group(),
    rail = metal(0xec4c8c),
    gold = metal(0xffd768);
  mesh(
    group,
    new T.BoxGeometry(64, 0.06, 50),
    pbr("blue_plaster_wall", 6, { color: 0x4e86a6 }),
    0,
    0.03,
  );
  for (const side of [-1, 1])
    for (const offset of [-1, 1]) {
      box(group, [1, 2, 16], [side * 32, 1, offset * 17], rail);
      box(group, [20, 2, 1], [offset * 22, 1, side * 25], rail);
    }
  for (const x of [-31, 31])
    for (const z of [-24, 24]) {
      mesh(group, new T.CylinderGeometry(0.2, 0.3, 9, 24), gold, x, 4.5, z);
      const flag = mesh(group, new T.ConeGeometry(1.4, 2.5, 3), rail, x, 9, z);
      flag.rotation.z = -0.4;
    }
  const sign = label("BUMPER BRAWL");
  sign.position.set(0, 6, -25);
  sign.rotation.y = Math.PI;
  group.add(sign);
  for (const x of [-20, 0, 20])
    for (const z of [-15, 0, 15]) {
      const ring = mesh(
        group,
        new T.TorusGeometry(4, 0.06, 8, 64),
        gold,
        x,
        0.08,
        z,
      );
      ring.rotation.x = Math.PI / 2;
    }
  batch(group);
  return group;
}
function buildArenaXL() {
  const group = new T.Group(),
    rail = metal(0xec4c8c),
    gold = metal(0xffd768);
  mesh(
    group,
    new T.BoxGeometry(64, 0.06, 100),
    pbr("blue_plaster_wall", 6, { color: 0x4e86a6 }),
    0,
    0.03,
  );
  for (const side of [-1, 1]) {
    box(group, [1, 2, 40], [side * 32, 1, -30], rail);
    box(group, [1, 2, 40], [side * 32, 1, 30], rail);
  }
  box(group, [64, 2, 1], [0, 1, -50], rail);
  box(group, [22, 2, 1], [-21, 1, 50], rail);
  box(group, [22, 2, 1], [21, 1, 50], rail);
  for (const side of [-1, 1])
    box(group, [2, 6, 2], [side * 10, 3, 50], gold);
  box(group, [24, 1.5, 1.5], [0, 6.5, 50], gold);
  for (const x of [-31, 31])
    for (const z of [-49, 49]) {
      mesh(group, new T.CylinderGeometry(0.2, 0.3, 9, 24), gold, x, 4.5, z);
      const flag = mesh(group, new T.ConeGeometry(1.4, 2.5, 3), rail, x, 9, z);
      flag.rotation.z = -0.4;
    }
  const sign = label("BUMPER BRAWL XL");
  sign.position.set(0, 6, -50);
  sign.rotation.y = Math.PI;
  group.add(sign);
  for (const x of [-20, 0, 20])
    for (const z of [-30, -15, 0, 15, 30]) {
      const ring = mesh(
        group,
        new T.TorusGeometry(4, 0.06, 8, 64),
        gold,
        x,
        0.08,
        z,
      );
      ring.rotation.x = Math.PI / 2;
    }
  batch(group);
  return group;
}
function buildBumper(index: number) {
  const group = new T.Group(),
    paint = metal(COLORS[index % 6]),
    rubber = metal(0x1c2536),
    chrome = metal(0xe0e8df);
  box(group, [3, 1.1, 4.2], [0, 0, 0], paint, 0.4);
  const rim = mesh(
    group,
    new T.TorusGeometry(1.75, 0.3, 24, 80),
    rubber,
    0,
    -0.25,
  );
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1, 1.35, 1);
  box(group, [1.4, 0.9, 1], [0, 0.8, -0.6], rubber, 0.2);
  mesh(group, new T.CylinderGeometry(0.06, 0.06, 5, 16, 8), chrome, 0, 2, -1.4);
  const pennant = mesh(
    group,
    new T.ConeGeometry(0.5, 1.2, 3),
    paint,
    0,
    4.5,
    -1.4,
  );
  pennant.rotation.z = 1.57;
  const steering = mesh(
    group,
    new T.TorusGeometry(0.4, 0.06, 12, 48),
    chrome,
    0,
    1,
    0.7,
  );
  steering.rotation.x = -0.5;
  for (const side of [-1, 1])
    mesh(group, new T.SphereGeometry(0.17, 16, 12), chrome, side, 0.3, 2);
  batch(group);
  return group;
}
function buildBalloon() {
  const group = new T.Group();
  for (let i = 0; i < 12; i++) {
    const panel = mesh(
      group,
      new T.SphereGeometry(7, 12, 48, (i * Math.PI) / 6, Math.PI / 6),
      metal(COLORS[i % 6]),
    );
    panel.scale.y = 1.3;
  }
  const rope = metal(0xd5bc82);
  for (const x of [-1, 1])
    for (const z of [-1, 1])
      mesh(
        group,
        new T.CylinderGeometry(0.06, 0.06, 5, 12),
        rope,
        x * 1.2,
        -7.5,
        z * 1.2,
      );
  box(
    group,
    [3, 2, 3],
    [0, -10, 0],
    pbr("concrete_layers_02", 2, { color: 0xb77942 }),
    0.2,
  );
  mesh(
    group,
    new T.ConeGeometry(0.45, 2, 24),
    new T.MeshBasicMaterial({ color: 0xffb72a }),
    0,
    -7.2,
  );
  batch(group);
  return group;
}
function buildBanana() {
  const group = new T.Group(),
    yellow = metal(0xffd536),
    brown = metal(0x6b4623);
  for (let i = 0; i < 3; i++) {
    const peel = mesh(
      group,
      new T.TorusGeometry(0.65, 0.16, 12, 24, Math.PI * 0.85),
      yellow,
    );
    peel.rotation.set(0, (i * Math.PI * 2) / 3, 0.4);
    peel.position.y = -0.15;
  }
  mesh(group, new T.CylinderGeometry(0.1, 0.15, 0.6, 12), brown, 0, 0.5);
  batch(group);
  return group;
}
export class FairgroundView extends T.Group {
  private track?: Track;
  private carouselModels = new Map<string, T.Group>();
  private bumperModels = new Map<string, T.Group>();
  private balloonModels = new Map<string, T.Group>();
  private bananaModels = new Map<number, T.Group>();
  update(sim: Simulation) {
    if (this.track !== sim.courseTrack) {
      this.disposeGroup(this);
      this.clear();
      this.track = sim.courseTrack;
      this.carouselModels.clear();
      this.bumperModels.clear();
      this.balloonModels.clear();
      this.bananaModels.clear();
      for (const c of sim.fairground.carousels) {
        const model = buildCarousel();
        model.position.set(c.p.x, c.p.y ?? 0, c.p.z);
        this.add(model);
        this.carouselModels.set(c.p.id, model);
      }
      for (const p of sim.courseTrack?.custom?.prefabs ?? [])
        if (p.kind === "bumper-arena" || p.kind === "bumper-arena-xl") {
          const model =
            p.kind === "bumper-arena-xl" ? buildArenaXL() : buildArena();
          model.position.set(p.x, p.y ?? 0, p.z);
          this.add(model);
        }
      sim.fairground.bumpers.forEach((car, i) => {
        const model = buildBumper(i);
        this.add(model);
        this.bumperModels.set(car.id, model);
      });
      for (const b of sim.fairground.balloons) {
        const model = buildBalloon();
        this.add(model);
        this.balloonModels.set(b.p.id, model);
      }
    }
    for (const c of sim.fairground.carousels) {
      const model = this.carouselModels.get(c.p.id)!;
      model.rotation.y = c.angle;
      for (const trap of c.traps) {
        const burst = model.getObjectByName(`burst-${trap.slot}`)!;
        const age = sim.time - trap.exploded;
        burst.visible = age >= 0 && age < 0.9;
        burst.scale.setScalar(1 + Math.max(0, age) * 3);
      }
    }
    for (const car of sim.fairground.bumpers) {
      const model = this.bumperModels.get(car.id)!;
      model.position.copy(car.body.translation());
      model.quaternion.copy(car.body.rotation());
      model.scale.y = car.health <= 0 ? 0.6 : 0.85 + car.health * 0.15;
    }
    for (const b of sim.fairground.balloons)
      this.balloonModels.get(b.p.id)!.position.set(b.x, b.y, b.z);
    const alive = new Set(sim.fairground.bananas.map((b) => b.id));
    for (const [id, model] of this.bananaModels)
      if (!alive.has(id)) {
        model.removeFromParent();
        this.disposeGroup(model);
        this.bananaModels.delete(id);
      }
    for (const b of sim.fairground.bananas) {
      let model = this.bananaModels.get(b.id);
      if (!model) {
        model = buildBanana();
        this.add(model);
        this.bananaModels.set(b.id, model);
      }
      model.position.set(b.x, b.y, b.z);
      model.scale.set(1, b.grounded ? 0.15 : 1, 1);
      model.rotation.y = b.grounded ? b.id : sim.time * 3;
    }
  }
  private disposeGroup(group: T.Group) {
    group.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (
          m instanceof T.MeshBasicMaterial &&
          m.map instanceof T.CanvasTexture
        )
          m.map.dispose();
        m.dispose();
      }
    });
  }
  inspect() {
    let triangles = 0;
    let carouselTriangles = 0;
    for (const model of this.carouselModels.values())
      model.traverse((o) => {
        if (o instanceof T.Mesh)
          carouselTriangles +=
            (o.geometry.index?.count ?? o.geometry.attributes.position.count) /
            3;
      });
    this.traverse((o) => {
      if (o instanceof T.Mesh)
        triangles +=
          (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    });
    return {
      triangles,
      carouselTriangles,
      carousels: this.carouselModels.size,
      bumpers: this.bumperModels.size,
      balloons: this.balloonModels.size,
      bananas: this.bananaModels.size,
    };
  }
}
