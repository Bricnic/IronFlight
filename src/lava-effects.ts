import * as T from "three";
import { PARTS } from "./damage";
import { flameMaterial } from "./materials";
import { TruckFireView } from "./truck-fire";
import type { Simulation } from "./simulation";

/** Fire remains at the exposed part/lava interface; smoke rises above the pool. */
export class LavaPartEffects extends T.Group {
  private effects = new Map<
    string,
    { fire: T.Group; smoke: TruckFireView["smoke"] }
  >();
  reset() {
    this.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.Points) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.dispose();
      }
    });
    this.clear();
    this.effects.clear();
  }
  update(sim: Simulation) {
    for (const def of PARTS) {
      const state = sim.parts.get(def.id)!;
      const lava = state.lava;
      if (!lava) continue;
      let effect = this.effects.get(def.id);
      if (!effect) {
        const fire = new T.Group();
        const material = flameMaterial();
        for (let i = 0; i < 3; i++) {
          const flame = new T.Mesh(new T.PlaneGeometry(1.1, 1.8), material);
          flame.position.y = 0.7;
          flame.rotation.y = (i * Math.PI) / 3;
          fire.add(flame);
        }
        const smoke = new TruckFireView().smoke;
        smoke.name = `lava-smoke-${def.id}`;
        smoke.scale.setScalar(0.5);
        fire.name = `lava-fire-${def.id}`;
        this.add(fire, smoke);
        effect = { fire, smoke };
        this.effects.set(def.id, effect);
      }
      const visible = lava.progress < 1;
      effect.fire.visible = effect.smoke.visible = visible;
      const p = state.body!.translation();
      effect.fire.position.set(p.x, Math.max(lava.surface, p.y), p.z);
      effect.smoke.position.copy(effect.fire.position);
      // Ease in on contact and fade as the last exposed metal slips below lava.
      const strength = Math.min(1, lava.progress * 12, (1 - lava.progress) * 8);
      effect.fire.scale.setScalar(0.4 + strength * 0.6);
      for (const flame of effect.fire.children)
        ((flame as T.Mesh).material as T.ShaderMaterial).uniforms.time.value =
          sim.time;
      effect.smoke.material.uniforms.time.value = sim.time;
      effect.smoke.material.uniforms.strength.value = strength * 0.38;
    }
  }
  inspect() {
    return [...this.effects].map(([id, effect]) => ({
      id,
      fire: effect.fire.visible,
      smoke: effect.smoke.visible,
      strength: effect.smoke.material.uniforms.strength.value as number,
    }));
  }
}
