import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { LOOP, dragonFiring, loopSolids, loopX } from "./loop";
import { ROUTES } from "./routes";
import { pbr, flameMaterial } from "./materials";

/** Scenery shares track dimensions and fire timing with the simulation. */
export class LoopView extends T.Group {
  private jets: T.Group[] = [];
  private eyes: T.MeshStandardMaterial;
  private lights: T.Mesh[] = [];
  constructor() {
    super();
    this.name = "dragon-loop-course";
    const asphalt = pbr("asphalt_02", 1, { color: 0xb0b8b8, roughness: 0.85 });
    const geometries = loopSolids().map((s) => {
      const g = new T.BoxGeometry(s.w, s.h, s.d);
      const positions = g.attributes.position,
        normals = g.attributes.normal,
        uv = g.attributes.uv;
      const station = s.kind === "loop" ? -(s.angle ?? 0) * LOOP.radius : s.z;
      for (let i = 0; i < positions.count; i++) {
        if (Math.abs(normals.getY(i)) > 0.5)
          uv.setXY(i, positions.getX(i) / 3, (station + positions.getZ(i)) / 3);
      }
      g.rotateX(s.angle ?? 0);
      g.translate(s.x, s.y, s.z);
      return g;
    });
    const track = new T.Mesh(mergeGeometries(geometries), asphalt);
    track.name = "physical-loop-track";
    track.receiveShadow = true;
    track.castShadow = true;
    this.add(track);
    geometries.forEach((g) => g.dispose());
    const trim = pbr("green_metal_rust", 1, {
      color: 0xf4973b,
      metalness: 0.7,
      roughness: 0.45,
    });
    const stone = pbr("rock_06", 2, { color: 0x626b66, roughness: 0.88 });
    const bronze = pbr("green_metal_rust", 1, {
      color: 0x78988b,
      metalness: 0.65,
      roughness: 0.48,
    });
    const horn = new T.MeshStandardMaterial({
      color: 0xd7c7a0,
      roughness: 0.7,
    });
    this.eyes = new T.MeshStandardMaterial({
      color: 0xff5a0a,
      emissive: 0xff3500,
      emissiveIntensity: 3,
    });
    for (const r of ROUTES) {
      for (const edge of [-1, 1]) {
        const points = Array.from({ length: 241 }, (_, i) => {
          const t = (i / 240) * Math.PI * 2;
          return new T.Vector3(
            loopX(r.x, t) + edge * 5.8,
            LOOP.radius * (1 - Math.cos(t)) + Math.cos(t) * 0.45,
            LOOP.z + (LOOP.radius - 0.45) * Math.sin(t),
          );
        });
        const rail = new T.Mesh(
          new T.TubeGeometry(
            new T.CatmullRomCurve3(points),
            400,
            0.16,
            8,
            false,
          ),
          trim,
        );
        rail.castShadow = true;
        this.add(rail);
      }
      const pad = new T.Mesh(
        new T.BoxGeometry(11.5, 0.05, LOOP.boostEnd - LOOP.boostStart),
        new T.MeshStandardMaterial({
          color: 0x183c3f,
          emissive: 0x0e7974,
          emissiveIntensity: 0.6,
          roughness: 0.45,
        }),
      );
      pad.position.set(r.x, 0.035, (LOOP.boostStart + LOOP.boostEnd) / 2);
      this.add(pad);
      for (let z = LOOP.boostStart + 3; z < LOOP.boostEnd; z += 6) {
        // Chevron points in the direction of travel, visible from the rear camera.
        for (const side of [-1, 1]) {
          const arrow = new T.Mesh(
            new T.BoxGeometry(3.7, 0.035, 0.35),
            new T.MeshBasicMaterial({ color: 0x95fff0 }),
          );
          arrow.position.set(r.x + side * 1.35, 0.075, z);
          arrow.rotation.y = side * 0.65;
          this.add(arrow);
        }
      }
      for (const z of LOOP.dragonZ) {
        for (const side of [-1, 1]) {
          const statue = this.dragon(stone, bronze, horn);
          statue.name = `dragon-${r.id}-${z}-${side}`;
          statue.position.set(r.x + side * 10, 0, z);
          statue.rotation.y = (-side * Math.PI) / 2;
          this.add(statue);
        }
        const jets = new T.Group();
        jets.name = `dragon-jets-${r.id}-${z}`;
        jets.position.set(r.x, 2.65, z);
        this.add(jets);
        this.jets.push(jets);
        const flame = flameMaterial();
        for (const side of [-1, 1])
          for (let i = 0; i < 7; i++) {
            const jet = new T.Mesh(new T.PlaneGeometry(2.4, 13), flame);
            jet.rotation.z = (side * Math.PI) / 2;
            jet.rotation.x = ((i - 3) * Math.PI) / 7;
            jet.position.set(0, Math.sin(i) * 0.16, (i - 3) * 0.18);
            jets.add(jet);
          }
      }
      const signal = new T.Mesh(new T.SphereGeometry(0.65, 16, 12), this.eyes);
      signal.position.set(r.x - 6, 5, LOOP.boostStart - 5);
      this.add(signal);
      this.lights.push(signal);
      for (const z of [LOOP.z - 34, LOOP.z + 34])
        for (const side of [-1, 1]) {
          const support = new T.Mesh(new T.BoxGeometry(0.6, 25, 0.6), trim);
          support.position.set(r.x + side * 7, 12.5, z);
          support.castShadow = true;
          this.add(support);
        }
    }
  }
  private dragon(stone: T.Material, bronze: T.Material, horn: T.Material) {
    const g = new T.Group();
    const mesh = (
      geometry: T.BufferGeometry,
      material: T.Material,
      x: number,
      y: number,
      z: number,
      sx = 1,
      sy = 1,
      sz = 1,
    ) => {
      const m = new T.Mesh(geometry, material);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      return m;
    };
    mesh(new T.BoxGeometry(4, 0.8, 5), stone, 0, 0.4, 0);
    mesh(new T.SphereGeometry(1, 32, 24), bronze, 0, 2.2, -0.5, 1.2, 1.6, 1.5);
    const neck = new T.CatmullRomCurve3([
      new T.Vector3(0, 2, -0.3),
      new T.Vector3(0, 4, 0),
      new T.Vector3(0, 4.6, 1.6),
      new T.Vector3(0, 3.2, 2.6),
    ]);
    mesh(new T.TubeGeometry(neck, 40, 0.6, 16, false), bronze, 0, 0, 0);
    mesh(
      new T.SphereGeometry(1, 32, 20),
      bronze,
      0,
      3.35,
      2.6,
      0.85,
      0.7,
      1.15,
    );
    mesh(new T.BoxGeometry(1.1, 0.4, 1.6), bronze, 0, 2.9, 3.1);
    // Black mouth and curved horns make the fire source legible at driving scale.
    mesh(
      new T.SphereGeometry(0.5, 24, 16),
      new T.MeshStandardMaterial({ color: 0x151919 }),
      0,
      3.25,
      3.55,
      1.05,
      0.55,
      1,
    );
    for (const side of [-1, 1]) {
      mesh(
        new T.SphereGeometry(0.13, 16, 12),
        this.eyes,
        side * 0.72,
        3.7,
        2.95,
      );
      const h = mesh(
        new T.ConeGeometry(0.22, 1.5, 20),
        horn,
        side * 0.55,
        4.25,
        2.1,
      );
      h.rotation.x = -0.5;
      h.rotation.z = -side * 0.35;
      mesh(
        new T.SphereGeometry(0.5, 20, 16),
        bronze,
        side * 0.9,
        0.95,
        1,
        1,
        0.7,
        1.8,
      );
      for (let i = 0; i < 3; i++) {
        const claw = mesh(
          new T.ConeGeometry(0.14, 0.6, 12),
          horn,
          side * (0.7 + i * 0.24),
          0.85,
          1.85,
        );
        claw.rotation.x = Math.PI / 2;
      }
      const wing = new T.Shape();
      wing.moveTo(0, 0);
      wing.lineTo(side * 3.8, 2.8);
      wing.lineTo(side * 3.3, 0.5);
      wing.lineTo(side * 2.5, 0.9);
      wing.lineTo(side * 2, -0.8);
      wing.lineTo(0, 0);
      mesh(
        new T.ExtrudeGeometry(wing, {
          depth: 0.16,
          bevelEnabled: true,
          bevelSize: 0.12,
          bevelThickness: 0.1,
          bevelSegments: 2,
        }),
        bronze,
        0,
        2.5,
        -1.3,
      );
    }
    const tail = new T.CatmullRomCurve3([
      new T.Vector3(0, 1.8, -1),
      new T.Vector3(0.5, 1.1, -2.6),
      new T.Vector3(1.5, 0.9, -3.1),
    ]);
    mesh(new T.TubeGeometry(tail, 24, 0.3, 12, false), bronze, 0, 0, 0);
    for (let i = 0; i < 7; i++)
      mesh(
        new T.ConeGeometry(0.22, 0.65, 12),
        horn,
        0,
        3.6 + i * 0.12,
        -1 + i * 0.45,
      );
    return g;
  }
  update(time: number) {
    const firing = dragonFiring(time);
    for (const jets of this.jets) {
      jets.visible = firing;
      jets.children.forEach((jet, i) => {
        jet.scale.setScalar(0.95 + 0.05 * Math.sin(time * 18 + i * 3));
        ((jet as T.Mesh).material as T.ShaderMaterial).uniforms.time.value =
          time;
      });
    }
    this.eyes.emissive.setHex(firing ? 0xff3500 : 0x1bbf8e);
    this.eyes.color.setHex(firing ? 0xff5a0a : 0x73f5bc);
  }
  stats() {
    return {
      dragonStatues: 12,
      loopSegments: LOOP.segments * 3,
      jetsVisible: this.jets.filter((j) => j.visible).length,
    };
  }
}
