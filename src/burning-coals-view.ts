import * as T from "three";
import { BURNING_COAL_SIZE, type BurningCoal, type BurningCoals } from "./burning-coals";

export function buildBurningCoalModel(h: BurningCoal) {
  const root = new T.Group();
  root.name = h.id;
  const mesh = new T.Mesh(
    new T.BoxGeometry(BURNING_COAL_SIZE, BURNING_COAL_SIZE, BURNING_COAL_SIZE),
    new T.MeshStandardMaterial({
      color: 0x2a1210,
      emissive: 0xff5a1f,
      emissiveIntensity: 1.2,
      roughness: 0.95,
    }),
  );
  mesh.castShadow = true;
  root.add(mesh);
  const triangles =
    (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) /
    3;
  return { root, triangles };
}

export class BurningCoalsView extends T.Group {
  private source?: BurningCoals;
  private models = new Map<object, T.Group>();
  /** Live editing: drop one coal model by definition id. */
  removeModel(id: string) {
    for (const [coal, root] of this.models) {
      if ((coal as { h: BurningCoal }).h.id !== id) continue;
      root.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material])
            m.dispose();
        }
      });
      root.removeFromParent();
      this.models.delete(coal);
      return;
    }
  }
  /** Live editing: shift one coal model by delta. */
  moveModel(id: string, dx: number, dy: number, dz: number) {
    for (const [coal, root] of this.models) {
      if ((coal as { h: BurningCoal }).h.id !== id) continue;
      root.position.x += dx;
      root.position.y += dy;
      root.position.z += dz;
      return;
    }
  }
  update(source: BurningCoals, time: number) {
    if (source !== this.source) {
      this.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material])
            m.dispose();
        }
      });
      this.clear();
      this.models.clear();
      this.source = source;
      for (const coal of source.coals) {
        const model = buildBurningCoalModel(coal.h);
        this.models.set(coal, model.root);
        this.add(model.root);
      }
    }
    for (const coal of source.coals) {
      if (this.models.has(coal)) continue;
      const model = buildBurningCoalModel(coal.h);
      this.models.set(coal, model.root);
      this.add(model.root);
    }
    let i = 0;
    for (const [coal, root] of this.models) {
      const state = coal as BurningCoals["coals"][number];
      root.position.copy(state.body.translation());
      root.quaternion.copy(state.body.rotation());
      const flicker = 1.1 + 0.35 * Math.sin(time * 9 + i * 2.1);
      root.traverse((o) => {
        if (o instanceof T.Mesh) {
          const mat = o.material as T.MeshStandardMaterial;
          mat.emissiveIntensity = flicker;
        }
      });
      i++;
    }
  }
}
