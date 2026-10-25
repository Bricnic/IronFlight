import * as T from "three";
import { courseHazards } from "./course";
import { flameIntensity, type Hazard } from "./hazards";
import { pbr, lavaMaterial } from "./materials";
import { flameMaterial } from "./materials";
import { courseSolids } from "./course";
import { slideProfileY } from "./tracks";
import type { Simulation } from "./simulation";
export class CourseView extends T.Group {
  private key = "";
  private hazardTime = 0;
  private lavaMaterials: T.MeshStandardMaterial[] = [];
  private hazards: {
    h: Hazard;
    root: T.Group;
    rotor?: T.Group;
    flames?: T.Group;
    lamp?: T.Mesh<T.SphereGeometry, T.MeshBasicMaterial>;
  }[] = [];
  private gateModels: T.Group[] = [];
  private trampolineModels: T.Group[] = [];
  private ringModels: T.Group[] = [];
  private axeModels: { root: T.Group; rotor: T.Group }[] = [];
  private ghostGroup: T.Group | null = null;
  private pickupModels = new Map<string, T.Group>();
  private meshes: T.Mesh[] = [];
  private label(text: string, color: number) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 80;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#14212a";
    ctx.fillRect(0, 0, 512, 80);
    ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    ctx.font = "bold 42px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 42);
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    const mesh = new T.Mesh(
      new T.PlaneGeometry(6, 1),
      new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }),
    );
    return mesh;
  }
  update(sim: Simulation, camera?: T.Camera) {
    this.hazardTime = sim.time;
    const run = sim.trackRun;
    const key = run ? `${run.track.id}:${run.variant}` : "";
    if (key !== this.key) {
      this.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            if (
              m instanceof T.MeshBasicMaterial &&
              m.map instanceof T.CanvasTexture
            )
              m.map.dispose();
            m.dispose();
          }
        }
      });
      this.clear();
      this.key = key;
      this.gateModels = [];
      this.trampolineModels = [];
      this.ringModels = [];
      this.axeModels = [];
      this.ghostGroup = null;
      this.hazards = [];
      this.pickupModels.clear();
      this.meshes = [];
      this.lavaMaterials = [];
      if (run) {
        const track = run.track;
        if (!track.legacy)
          for (const s of courseSolids(track)) {
            const stone =
              s.id.startsWith("vault-wall") ||
              s.id.startsWith("vault-floor") ||
              (s.id.startsWith("crypt-") && s.id !== "crypt-door");
            const cliff = s.id.startsWith("gorge-");
            const groundMap =
              track.id === "canyon-plunge"
                ? "cracked_red_ground"
                : track.id === "haunted-hollow"
                  ? "brown_mud_leaves_01"
                  : track.id === "sky-slide"
                    ? "grass_ground"
                    : ["foundry-run", "inferno-vault"].includes(track.id)
                      ? "concrete_layers_02"
                      : "concrete_floor_02";
            const roadMap =
              track.id === "canyon-plunge"
                ? "coast_sand_rocks_02"
                : track.id === "sky-slide"
                  ? "blue_plaster_wall"
                  : "asphalt_02";
            const groundTint =
              groundMap === "cracked_red_ground"
                ? 0xffffff
                : groundMap === "brown_mud_leaves_01"
                  ? 0x8a7a6a
                  : groundMap === "grass_ground"
                    ? 0xa8c795
                    : track.id === "scrapyard-sweep"
                      ? 0xb8a990
                      : 0xc4c8c8;
            const mat =
              s.kind === "lava"
                ? lavaMaterial()
                : cliff
                  ? pbr("dark_rock_02", 1, { color: 0xd89060, roughness: 0.95 })
                  : stone
                    ? pbr(
                        track.id === "haunted-hollow"
                          ? "monastery_stone_floor"
                          : "rock_06",
                        1,
                        { color: 0xb9b2a7, roughness: 0.94 },
                      )
                    : s.kind === "road" || s.kind === "ramp"
                      ? pbr(roadMap, 1, {
                          color:
                            roadMap === "blue_plaster_wall"
                              ? 0x6fa8d8
                              : roadMap === "coast_sand_rocks_02"
                                ? 0xd8b88a
                                : 0xc3c4c5,
                          roughness:
                            roadMap === "blue_plaster_wall" ? 0.35 : 0.95,
                        })
                      : s.kind === "ground"
                        ? pbr(groundMap, 1, {
                            color: groundTint,
                            roughness:
                              groundMap === "concrete_floor_02" ||
                              groundMap === "concrete_layers_02"
                                ? 0.96
                                : 1,
                          })
                        : new T.MeshStandardMaterial({
                            color: s.color,
                            roughness: s.kind === "container" ? 0.65 : 0.95,
                            metalness: s.kind === "container" ? 0.3 : 0,
                          });
            if (s.kind === "lava") this.lavaMaterials.push(mat);
            const geometry = new T.BoxGeometry(s.w, s.h, s.d);
            if (stone || cliff || ["ground", "road", "ramp"].includes(s.kind)) {
              const pos = geometry.attributes.position,
                normals = geometry.attributes.normal,
                uv = geometry.attributes.uv;
              for (let i = 0; i < pos.count; i++) {
                const top = Math.abs(normals.getY(i)) > 0.5;
                uv.setXY(
                  i,
                  (top
                    ? pos.getX(i) + (s.kind === "ground" ? s.x : 0)
                    : pos.getX(i) + pos.getZ(i)) / 3,
                  (top
                    ? pos.getZ(i) + (s.kind === "ground" ? s.z : 0)
                    : pos.getY(i)) / 3,
                );
              }
              uv.needsUpdate = true;
              mat.userData.surface = stone
                ? "stone"
                : cliff
                  ? "cliff"
                  : s.kind === "ground"
                    ? groundMap === "concrete_floor_02" ||
                      groundMap === "concrete_layers_02"
                      ? "concrete"
                      : groundMap === "grass_ground"
                        ? "grass"
                        : "dirt"
                    : roadMap === "asphalt_02"
                      ? "asphalt_02"
                      : roadMap === "blue_plaster_wall"
                        ? "plaster"
                        : "sand";
            }
            const mesh = new T.Mesh(geometry, mat);
            mesh.position.set(s.x, s.y, s.z);
            mesh.quaternion
              .setFromAxisAngle(new T.Vector3(1, 0, 0), s.angle ?? 0)
              .multiply(
                new T.Quaternion().setFromAxisAngle(
                  new T.Vector3(0, 1, 0),
                  s.yaw ?? 0,
                ),
              );
            mesh.castShadow = s.kind !== "ground" && s.kind !== "road";
            mesh.receiveShadow = true;
            mesh.name = s.id;
            this.add(mesh);
            this.meshes.push(mesh);
            if (s.kind === "container")
              for (let i = -3; i <= 3; i++) {
                const rib = new T.Mesh(
                  new T.BoxGeometry(0.07, s.h - 0.2, s.d + 0.04),
                  new T.MeshStandardMaterial({
                    color: s.color,
                    roughness: 0.75,
                  }),
                );
                rib.position.x = i;
                mesh.add(rib);
              }
          }
        for (const h of courseHazards(track)) {
          const root = new T.Group();
          root.position.set(h.x, h.y, h.z);
          this.add(root);
          const material = new T.MeshStandardMaterial({
            color: 0x52615a,
            metalness: 0.7,
            roughness: 0.5,
          });
          const box = (
            w: number,
            height: number,
            d: number,
            x = 0,
            y = 0,
            z = 0,
          ) => {
            const m = new T.Mesh(new T.BoxGeometry(w, height, d), material);
            m.position.set(x, y, z);
            m.castShadow = true;
            return m;
          };
          if (h.kind === "hammer") {
            const rotor = new T.Group();
            root.add(rotor);
            rotor.add(box(7.2, 0.6, 0.9));
            for (const side of [-1, 1]) {
              rotor.add(box(1.6, 1.6, 1.5, side * 3.6));
              const spike = new T.Mesh(
                new T.ConeGeometry(0.65, 1.8, 16),
                material,
              );
              spike.position.x = side * 5.1;
              spike.rotation.z = (-side * Math.PI) / 2;
              rotor.add(spike);
              for (const dir of [
                new T.Vector3(0, 1, 0),
                new T.Vector3(0, -1, 0),
                new T.Vector3(0, 0, 1),
                new T.Vector3(0, 0, -1),
              ]) {
                const spike = new T.Mesh(
                  new T.ConeGeometry(0.45, 1.3, 12),
                  material,
                );
                spike.position.set(side * 3.6, dir.y * 1.4, dir.z * 1.4);
                spike.quaternion.setFromUnitVectors(
                  new T.Vector3(0, 1, 0),
                  dir,
                );
                rotor.add(spike);
              }
            }
            this.hazards.push({ h, root, rotor });
          } else if (h.kind === "fire") {
            root.add(box(12, 0.25, 0.6, 0, -1.2));
            const flames = new T.Group();
            root.add(flames);
            const mat = flameMaterial();
            for (let i = 0; i < 18; i++) {
              const mesh = new T.Mesh(new T.PlaneGeometry(1.35, 3.6), mat);
              mesh.position.set((i - 8.5) * 0.65, 0.4, 0);
              mesh.rotation.y = -0.6;
              flames.add(mesh);
            }
            const lamp = new T.Mesh(
              new T.SphereGeometry(0.25, 12, 8),
              new T.MeshBasicMaterial({ color: 0xff4225 }),
            );
            lamp.position.set(-5.4, 0.3, 0);
            root.add(lamp);
            this.hazards.push({ h, root, flames, lamp });
          }
        }
        for (const a of sim.axes.snapshot().axes) {
          const root = new T.Group();
          root.position.set(a.x, a.y, a.z);
          const rotor = new T.Group();
          rotor.add(buildAxeMesh());
          root.add(rotor);
          this.add(root);
          this.axeModels.push({ root, rotor });
        }
        const ghosts = sim.ghosts.snapshot().ghosts;
        if (ghosts.length) {
          this.ghostGroup = buildGhostMeshes(ghosts.length);
          this.ghostGroup.children.forEach((g, i) => {
            g.position.set(ghosts[i].x, ghosts[i].y, ghosts[i].z);
          });
          this.add(this.ghostGroup);
        }
        if (track.ring) {
          const tramp = buildTrampolineMesh();
          tramp.position.set(
            track.trampoline?.x ?? track.ring.x,
            -0.5,
            track.trampoline?.z ?? track.ring.z,
          );
          this.add(tramp);
          this.trampolineModels.push(tramp);
          const ringMesh = buildRingMesh(track.ring.radius);
          ringMesh.position.set(track.ring.x, track.ring.y, track.ring.z);
          this.add(ringMesh);
          this.ringModels.push(ringMesh);
        }
        if (track.id === "sky-slide") {
          const foamMat = new T.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
          });
          for (let i = 1; i < track.path.length; i++) {
            const a = track.path[i - 1],
              b = track.path[i],
              ya = slideProfileY(a.z),
              yb = slideProfileY(b.z),
              len = Math.hypot(b.x - a.x, b.z - a.z);
            const yaw = Math.atan2(b.x - a.x, b.z - a.z),
              pitch = Math.atan2(ya - yb, len),
              dx = (b.x - a.x) / len,
              dz = (b.z - a.z) / len;
            for (const [lateral, frac] of [
              [-4, 0.25],
              [3.5, 0.5],
              [-1, 0.75],
            ] as const) {
              const foam = new T.Mesh(new T.PlaneGeometry(1.6, 9), foamMat);
              foam.position.set(
                a.x + (b.x - a.x) * frac + dz * lateral,
                ya + (yb - ya) * frac + 0.35,
                a.z + (b.z - a.z) * frac - dx * lateral,
              );
              foam.quaternion
                .setFromAxisAngle(new T.Vector3(1, 0, 0), -Math.PI / 2 - pitch)
                .multiply(
                  new T.Quaternion().setFromAxisAngle(
                    new T.Vector3(0, 1, 0),
                    yaw,
                  ),
                );
              this.add(foam);
            }
          }
        }
        if (track.id === "haunted-hollow") {
          const spots: [number, number, number][] = [
            [-120, 3.0, -120],
            [-60, 3.0, -120],
            [60, 3.0, -120],
            [120, 3.0, -120],
            [-120, 3.0, 140],
            [-60, 3.0, 140],
            [60, 3.0, 140],
            [120, 3.0, 140],
            [-170, 3.0, -40],
            [170, 3.0, -40],
            [-170, 3.0, 60],
            [170, 3.0, 60],
            [117, 6.0, -105],
            [123, 6.0, -105],
          ];
          for (const [x, y, z] of spots) {
            const pumpkin = buildPumpkinMesh();
            pumpkin.position.set(x, y, z);
            this.add(pumpkin);
          }
        }
        for (const [i, gate] of track.checkpoints.entries()) {
          const g = new T.Group();
          g.name = `checkpoint-${gate.id}`;
          g.position.set(gate.x, Math.max(0, gate.y - 2.6), gate.z);
          g.rotation.y = Math.atan2(gate.nx, gate.nz);
          const mat = new T.MeshStandardMaterial({
            color: track.color,
            roughness: 0.6,
          });
          for (const side of [-1, 1]) {
            const pole = new T.Mesh(
              new T.CylinderGeometry(0.13, 0.2, 5.2, 10),
              mat,
            );
            pole.position.set((side * gate.width) / 2, 2.6, 0);
            g.add(pole);
          }
          const banner = new T.Mesh(
            new T.BoxGeometry(gate.width, 0.35, 0.35),
            mat,
          );
          banner.position.y = 5.1;
          g.add(banner);
          const label = this.label(
            i === track.checkpoints.length - 1 && !track.ring
              ? "FINISH"
              : `CHECKPOINT ${i + 1}`,
            track.color,
          );
          label.position.y = 5.7;
          label.rotation.y = Math.PI;
          g.add(label);
          this.add(g);
          this.gateModels.push(g);
        }
        for (const [i, p] of track.collectibles.entries()) {
          const g = new T.Group();
          g.position.set(p.x, p.y, p.z);
          g.name = p.id;
          const token = new T.Mesh(
            new T.TorusGeometry(0.85, 0.17, 12, 32),
            new T.MeshStandardMaterial({
              color: track.color,
              emissive: track.color,
              emissiveIntensity: 0.7,
              metalness: 0.3,
              roughness: 0.3,
            }),
          );
          g.add(token);
          const label = this.label(String(i + 1), track.color);
          label.scale.setScalar(0.3);
          label.position.y = 1.4;
          g.add(label);
          this.add(g);
          this.pickupModels.set(p.id, g);
        }
      }
    }
    this.visible = !!run;
    if (!run) return;
    for (const material of this.lavaMaterials) {
      material.userData.time.value = sim.time;
      material.map!.offset.set((sim.time * 0.035) % 1, (sim.time * 0.025) % 1);
      material.map!.updateMatrix();
    }
    for (const model of this.hazards) {
      if (model.rotor) model.rotor.rotation.z = sim.hammerPhase;
      if (model.flames) {
        const intensity = flameIntensity(model.h, sim.time);
        model.flames.visible = intensity > 1e-6;
        for (const child of model.flames.children) {
          const mesh = child as T.Mesh;
          mesh.scale.y = intensity;
          mesh.position.y = -1.4 + 1.8 * intensity;
          const shader = mesh.material as T.ShaderMaterial;
          shader.uniforms.time.value = sim.time;
          shader.uniforms.strength.value = intensity;
        }
        model.lamp?.material.color.setHex(
          model.flames.visible ? 0xff4225 : 0x79e698,
        );
      }
    }
    const axes = sim.axes.snapshot().axes;
    this.axeModels.forEach((m, i) => {
      if (axes[i]) m.rotor.rotation.z = axes[i].angle;
    });
    const ghosts = sim.ghosts.snapshot().ghosts;
    if (this.ghostGroup)
      this.ghostGroup.children.forEach((g, i) => {
        if (!ghosts[i]) return;
        g.position.set(
          ghosts[i].x,
          ghosts[i].y + Math.sin(sim.time * 2 + ghosts[i].phase) * 0.4,
          ghosts[i].z,
        );
        const truck = sim.body.translation();
        g.lookAt(truck.x, g.position.y, truck.z);
      });
    this.gateModels.forEach((g, i) => {
      g.visible = i >= run.checkpoint;
      g.scale.setScalar(1);
    });
    for (const p of run.track.collectibles) {
      const g = this.pickupModels.get(p.id)!;
      g.visible = !run.collected.has(p.id);
      g.position.y = p.y + Math.sin(sim.time * 3) * 0.2;
      g.children[0].rotation.y = sim.time;
      if (camera) g.children[1].quaternion.copy(camera.quaternion);
    }
  }
  inspect() {
    return {
      key: this.key,
      axes: this.axeModels.length,
      ghosts: this.ghostGroup?.children.length ?? 0,
      trampolines: this.trampolineModels.length,
      rings: this.ringModels.length,
      gates: this.gateModels.filter((g) => g.visible).length,
      pickups: [...this.pickupModels.values()].filter((g) => g.visible).length,
      solids: this.meshes.length,
      jets: this.hazards
        .filter((m) => m.flames)
        .map((m) => ({
          id: m.h.id,
          intensity: flameIntensity(m.h, this.hazardTime),
          visible: m.flames!.visible,
          scale: m.flames!.children[0].scale.y,
        })),
      surfaces: this.meshes
        .filter(
          (m) => m.material instanceof T.MeshStandardMaterial && m.material.map,
        )
        .map((m) => ({
          id: m.name,
          material: (m.material as T.MeshStandardMaterial).userData.surface,
          map: (m.material as T.MeshStandardMaterial).map?.image?.src,
        })),
    };
  }
}
export function buildGhostMeshes(count: number) {
  const group = new T.Group();
  for (let i = 0; i < count; i++) {
    const ghost = new T.Group();
    ghost.name = `ghost-${i + 1}`;
    const sheet = new T.MeshStandardMaterial({
      color: 0xdfe8ff,
      emissive: 0x8fb4ff,
      emissiveIntensity: 0.6,
      roughness: 0.35,
      transparent: true,
      opacity: 0.6,
      side: T.DoubleSide,
      depthWrite: false,
    });
    const body = new T.Mesh(new T.ConeGeometry(1.4, 3.2, 24, 1, true), sheet);
    body.position.y = 1.6;
    const head = new T.Mesh(new T.SphereGeometry(1.15, 24, 18), sheet);
    head.position.y = 3.3;
    const eyeMat = new T.MeshBasicMaterial({ color: 0x0a0f16 });
    const eyes = [-0.42, 0.42].map((x) => {
      const eye = new T.Mesh(new T.SphereGeometry(0.16, 12, 10), eyeMat);
      eye.position.set(x, 3.5, 1.0);
      eye.name = "eye";
      return eye;
    });
    ghost.add(body, head, ...eyes);
    group.add(ghost);
  }
  return group;
}
export function ghostStats(group: T.Group) {
  let meshes = 0,
    triangles = 0,
    translucent = 0,
    eyes = 0;
  group.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    meshes++;
    const position = o.geometry.attributes.position;
    triangles += o.geometry.index
      ? o.geometry.index.count / 3
      : position.count / 3;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => m.transparent)) translucent++;
    if (o.name === "eye") eyes++;
  });
  return {
    ghosts: group.children.length,
    meshes,
    triangles: Math.round(triangles),
    translucent,
    eyes,
  };
}
export function buildAxeMesh() {
  const group = new T.Group();
  const steel = new T.MeshStandardMaterial({
    color: 0xb9c4cc,
    metalness: 0.85,
    roughness: 0.32,
  });
  const dark = new T.MeshStandardMaterial({
    color: 0x4a545c,
    metalness: 0.7,
    roughness: 0.5,
  });
  const wood = new T.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.8 });
  const handle = new T.Mesh(new T.CylinderGeometry(0.22, 0.28, 8, 20), wood);
  handle.position.y = -4;
  const shape = new T.Shape();
  shape.moveTo(0, 1.8);
  shape.quadraticCurveTo(2.6, 1.2, 2.9, -0.6);
  shape.quadraticCurveTo(1.6, -0.9, 0.4, -1.8);
  shape.lineTo(-0.4, -1.8);
  shape.quadraticCurveTo(0.4, -0.9, 0.2, 0.6);
  shape.quadraticCurveTo(0.1, 1.4, 0, 1.8);
  const bladeGeo = new T.ExtrudeGeometry(shape, {
    steps: 1,
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.12,
    bevelSegments: 3,
    curveSegments: 24,
  });
  bladeGeo.translate(0, 0, -0.25);
  const blade = new T.Mesh(bladeGeo, steel);
  blade.rotation.y = Math.PI / 2;
  blade.position.y = -7;
  const spike = new T.Mesh(new T.ConeGeometry(0.3, 1.6, 16), steel);
  spike.rotation.x = -Math.PI / 2;
  spike.position.set(0, -7, -2.2);
  const collar = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 1.2, 16), dark);
  collar.position.y = -7;
  group.add(handle, blade, spike, collar);
  return group;
}
export function axeStats(group: T.Group) {
  let meshes = 0,
    triangles = 0,
    metallic = 0;
  group.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    meshes++;
    const position = o.geometry.attributes.position;
    triangles += o.geometry.index
      ? o.geometry.index.count / 3
      : position.count / 3;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (
      mats.some(
        (m) => m instanceof T.MeshStandardMaterial && m.metalness >= 0.5,
      )
    )
      metallic++;
  });
  return { meshes, triangles: Math.round(triangles), metallic };
}
export function buildTrampolineMesh() {
  const group = new T.Group();
  const pad = new T.Mesh(
    new T.CylinderGeometry(5, 5, 0.5, 40),
    new T.MeshStandardMaterial({ color: 0x1d2b33, roughness: 0.9 }),
  );
  pad.position.y = 0.3;
  const rim = new T.Mesh(
    new T.TorusGeometry(5, 0.45, 14, 40),
    new T.MeshStandardMaterial({ color: 0xd84a3a, roughness: 0.6 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.55;
  group.add(pad, rim);
  const legMat = new T.MeshStandardMaterial({
    color: 0x8b9697,
    metalness: 0.65,
    roughness: 0.5,
  });
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const leg = new T.Mesh(new T.CylinderGeometry(0.14, 0.14, 1.4, 10), legMat);
    leg.position.set(Math.cos(a) * 4.4, -0.4, Math.sin(a) * 4.4);
    group.add(leg);
  }
  group.traverse((o) => {
    if (o instanceof T.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return group;
}
export function trampolineStats(group: T.Group) {
  let meshes = 0,
    triangles = 0;
  group.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    meshes++;
    triangles += o.geometry.index
      ? o.geometry.index.count / 3
      : o.geometry.attributes.position.count / 3;
  });
  return { meshes, triangles: Math.round(triangles) };
}
export function buildRingMesh(radius = 6) {
  const group = new T.Group();
  group.userData.radius = radius;
  const band = new T.Mesh(
    new T.TorusGeometry(radius, 0.5, 18, 56),
    new T.MeshStandardMaterial({
      color: 0xffd34d,
      metalness: 1,
      roughness: 0.25,
      emissive: 0x7a5a00,
      emissiveIntensity: 0.35,
    }),
  );
  const inner = new T.Mesh(
    new T.TorusGeometry(radius, 0.18, 12, 48),
    new T.MeshBasicMaterial({ color: 0xfff3c4 }),
  );
  // The torus lies in XY: forward (+Z) travel passes through its opening.
  group.add(band, inner);
  return group;
}
export function ringStats(group: T.Group) {
  let meshes = 0,
    triangles = 0;
  group.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    meshes++;
    triangles += o.geometry.index
      ? o.geometry.index.count / 3
      : o.geometry.attributes.position.count / 3;
  });
  return {
    meshes,
    triangles: Math.round(triangles),
    radius: group.userData.radius as number,
  };
}
export function buildPumpkinMesh() {
  const group = new T.Group();
  const body = new T.Mesh(
    new T.SphereGeometry(0.7, 14, 10),
    new T.MeshStandardMaterial({ color: 0xd8641f, roughness: 0.7 }),
  );
  body.scale.y = 0.75;
  body.castShadow = true;
  const stem = new T.Mesh(
    new T.CylinderGeometry(0.08, 0.12, 0.4, 8),
    new T.MeshStandardMaterial({ color: 0x3f5a26, roughness: 0.9 }),
  );
  stem.position.y = 0.6;
  group.add(body, stem);
  return group;
}
