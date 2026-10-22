import * as T from "three";
import { courseHazards } from "./course";
import { hazardActive, type Hazard } from "./hazards";
import { pbr, lavaMaterial } from "./materials";
import { flameMaterial } from "./materials";
import { courseSolids } from "./course";
import type { Simulation } from "./simulation";
export class CourseView extends T.Group {
  private key = "";
  private lavaMaterials: T.MeshStandardMaterial[] = [];
  private hazards: {
    h: Hazard;
    root: T.Group;
    rotor?: T.Group;
    flames?: T.Group;
    lamp?: T.Mesh<T.SphereGeometry, T.MeshBasicMaterial>;
  }[] = [];
  private gateModels: T.Group[] = [];
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
      this.hazards = [];
      this.pickupModels.clear();
      this.meshes = [];
      this.lavaMaterials = [];
      if (run) {
        const track = run.track;
        if (!track.legacy)
          for (const s of courseSolids(track)) {
            const mat =
              s.kind === "lava"
                ? lavaMaterial()
                : s.kind === "road" || s.kind === "ramp"
                  ? pbr("asphalt_02", 1, { color: 0xc3c4c5, roughness: 0.95 })
                  : s.kind === "ground"
                    ? pbr(
                        ["foundry-run", "inferno-vault"].includes(track.id)
                          ? "concrete_layers_02"
                          : "concrete_floor_02",
                        1,
                        {
                          color:
                            track.id === "scrapyard-sweep"
                              ? 0xb8a990
                              : 0xc4c8c8,
                          roughness: 0.96,
                        },
                      )
                    : new T.MeshStandardMaterial({
                        color: s.color,
                        roughness: s.kind === "container" ? 0.65 : 0.95,
                        metalness: s.kind === "container" ? 0.3 : 0,
                      });
            if (s.kind === "lava") this.lavaMaterials.push(mat);
            const geometry = new T.BoxGeometry(s.w, s.h, s.d);
            if (["ground", "road", "ramp"].includes(s.kind)) {
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
              mat.userData.surface =
                s.kind === "ground" ? "concrete" : "asphalt_02";
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
        for (const [i, gate] of track.checkpoints.entries()) {
          const g = new T.Group();
          g.name = `checkpoint-${gate.id}`;
          g.position.set(gate.x, 0, gate.z);
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
            i === track.checkpoints.length - 1
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
        model.flames.visible = hazardActive(model.h, sim.time);
        for (const mesh of model.flames.children)
          ((mesh as T.Mesh).material as T.ShaderMaterial).uniforms.time.value =
            sim.time;
        model.lamp?.material.color.setHex(
          model.flames.visible ? 0xff4225 : 0x79e698,
        );
      }
    }
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
      gates: this.gateModels.filter((g) => g.visible).length,
      pickups: [...this.pickupModels.values()].filter((g) => g.visible).length,
      solids: this.meshes.length,
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
