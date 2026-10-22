import * as T from "three";
import { Destructibles, type PropState } from "./destructibles";
import { flameMaterial } from "./materials";
export class PropView extends T.Group {
  private source?: Destructibles;
  private models = new Map<
    PropState,
    { root: T.Group; fire: T.Group; trash: T.Mesh[] }
  >();
  update(source: Destructibles, time: number) {
    if (source !== this.source) {
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
      this.models.clear();
      this.source = source;
      for (const prop of source.props) this.build(prop);
    }
    for (const [prop, model] of this.models) {
      model.root.position.copy(prop.body.translation());
      model.root.quaternion.copy(prop.body.rotation());
      const lid = model.root.getObjectByName("trash-lid");
      if (lid) lid.visible = !prop.spilled;
      model.fire.visible = prop.burningUntil > time;
      model.fire.position.copy(prop.body.translation());
      for (const child of model.fire.children)
        ((child as T.Mesh).material as T.ShaderMaterial).uniforms.time.value =
          time;
      while (model.trash.length < prop.pieces.length) {
        const p = prop.pieces[model.trash.length];
        const m = new T.Mesh(
          p.lid
            ? new T.CylinderGeometry(0.51, 0.51, 0.08, 24)
            : new T.BoxGeometry(...(p.size as [number, number, number])),
          new T.MeshStandardMaterial({ color: p.color, roughness: 1 }),
        );
        m.castShadow = true;
        this.add(m);
        model.trash.push(m);
      }
      prop.pieces.forEach((p, i) => {
        model.trash[i].position.copy(p.body.translation());
        model.trash[i].quaternion.copy(p.body.rotation());
      });
    }
  }
  private build(prop: PropState) {
    const root = new T.Group(),
      fire = new T.Group();
    root.name = prop.definition.id;
    fire.name = `${prop.definition.id}-flames`;
    this.add(root, fire);
    const material = new T.MeshStandardMaterial({
      color: prop.definition.kind === "barrel" ? 0xa13d21 : 0x526c59,
      metalness: 0.5,
      roughness: 0.7,
    });
    const mesh = (
      geometry: T.BufferGeometry,
      mat: T.Material = material,
      parent: T.Object3D = root,
    ) => {
      const m = new T.Mesh(geometry, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    if (prop.definition.kind === "sign") {
      const pole = mesh(
        new T.BoxGeometry(0.13, 3.2, 0.13),
        new T.MeshStandardMaterial({
          color: 0x8b9697,
          metalness: 0.65,
          roughness: 0.5,
        }),
      );
      const board = mesh(
        new T.BoxGeometry(1.8, 0.9, 0.16),
        new T.MeshStandardMaterial({ color: 0xe2b746 }),
      );
      board.position.y = 1;
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#edc45e";
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = "#22292b";
      ctx.font = "900 42px Arial";
      ctx.textAlign = "center";
      ctx.fillText("STUNTS", 128, 56);
      ctx.font = "bold 25px Arial";
      ctx.fillText("SLOW DOWN", 128, 99);
      const map = new T.CanvasTexture(canvas);
      map.colorSpace = T.SRGBColorSpace;
      const label = new T.MeshBasicMaterial({ map, side: T.DoubleSide });
      for (const side of [-1, 1]) {
        const face = mesh(new T.PlaneGeometry(1.75, 0.85), label);
        face.position.set(0, 1, side * 0.085);
        if (side < 0) face.rotation.y = Math.PI;
      }
      const base = mesh(
        new T.BoxGeometry(0.6, 0.2, 0.6),
        new T.MeshStandardMaterial({ color: 0x6f716b, roughness: 1 }),
        this,
      );
      base.position.set(
        prop.definition.x,
        prop.definition.ground + 0.05,
        prop.definition.z,
      );
      // A short stump stays in the concrete socket after the post snaps.
      const stump = mesh(
        new T.BoxGeometry(0.14, 0.22, 0.14),
        new T.MeshStandardMaterial({ color: 0x717b7c }),
        this,
      );
      stump.position.set(
        prop.definition.x,
        prop.definition.ground + 0.2,
        prop.definition.z,
      );
    } else {
      const h = prop.definition.kind === "trash" ? 1.3 : 1.4,
        r = prop.definition.kind === "trash" ? 0.48 : 0.5;
      mesh(new T.CylinderGeometry(r, r, h, 24));
      const dark = new T.MeshStandardMaterial({
        color: 0x293431,
        metalness: 0.65,
        roughness: 0.6,
      });
      for (const y of [-h * 0.35, h * 0.35]) {
        const ring = mesh(new T.TorusGeometry(r + 0.015, 0.035, 8, 24), dark);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = y;
      }
      if (prop.definition.kind === "trash") {
        const lid = mesh(new T.CylinderGeometry(0.51, 0.51, 0.08, 24), dark);
        lid.position.y = h / 2;
        lid.name = "trash-lid";
      } else {
        const band = mesh(
          new T.CylinderGeometry(r + 0.005, r + 0.005, 0.23, 24),
          new T.MeshStandardMaterial({ color: 0xd5b869 }),
        );
        band.position.y = 0;
      }
    }
    const flame = flameMaterial();
    for (let i = 0; i < 5; i++) {
      const f = mesh(new T.PlaneGeometry(1.9, 4.6), flame, fire);
      f.position.y = 1.6;
      f.castShadow = false;
      f.receiveShadow = false;
      f.rotation.y = (i * Math.PI) / 5;
    }
    fire.visible = false;
    this.models.set(prop, { root, fire, trash: [] });
  }
}
