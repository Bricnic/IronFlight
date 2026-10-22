import * as T from "three";
import { courseSolids } from "./course";
import type { Simulation } from "./simulation";
export class CourseView extends T.Group {
  private key = "";
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
  update(sim: Simulation) {
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
      this.pickupModels.clear();
      this.meshes = [];
      if (run) {
        const track = run.track;
        if (!track.legacy)
          for (const s of courseSolids(track)) {
            const mat = new T.MeshStandardMaterial({
              color: s.color,
              roughness: s.kind === "container" ? 0.65 : 0.95,
              metalness: s.kind === "container" ? 0.3 : 0,
            });
            const mesh = new T.Mesh(new T.BoxGeometry(s.w, s.h, s.d), mat);
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
    this.gateModels.forEach((g, i) => {
      g.visible = i >= run.checkpoint;
      g.scale.setScalar(1);
    });
    for (const p of run.track.collectibles) {
      const g = this.pickupModels.get(p.id)!;
      g.visible = !run.collected.has(p.id);
      g.position.y = p.y + Math.sin(sim.time * 3) * 0.2;
      g.children[0].rotation.y = sim.time;
    }
  }
  inspect() {
    return {
      key: this.key,
      gates: this.gateModels.filter((g) => g.visible).length,
      pickups: [...this.pickupModels.values()].filter((g) => g.visible).length,
      solids: this.meshes.length,
    };
  }
}
