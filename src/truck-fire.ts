import * as T from "three";
import { PARTS } from "./damage";
import type { Simulation } from "./simulation";
type BurnMaterial = T.MeshStandardMaterial | T.MeshBasicMaterial;
/** Shared materials are cached once; decals, glass, lamps, and detached pieces char too. */
export class TruckFireView {
  private originals = new Map<
    BurnMaterial,
    {
      part?: string;
      slot?: "primaryColor" | "secondaryColor";
      selectedColor?: number;
      amount?: number;
      color: T.Color;
      emissive?: T.Color;
      metalness?: number;
      roughness?: number;
      clearcoat?: number;
      envMapIntensity?: number;
      specularIntensity?: number;
    }
  >();
  private lastScorch = -1;
  readonly smoke: T.Points<T.BufferGeometry, T.ShaderMaterial>;
  constructor() {
    const geometry = new T.BufferGeometry();
    const positions: number[] = [],
      phases: number[] = [];
    for (let i = 0; i < 48; i++) {
      positions.push(Math.sin(i * 2.4) * 1.2, 0.6, Math.cos(i * 3.7) * 1.8);
      phases.push(i / 48);
    }
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("phase", new T.Float32BufferAttribute(phases, 1));
    const material = new T.ShaderMaterial({
      uniforms: { time: { value: 0 }, strength: { value: 0 } },
      vertexShader: `attribute float phase; uniform float time; varying float age; varying float seed;
      void main(){ seed=phase; age=mod(time+phase*2.6,2.6); vec3 p=position;
        p.x+=age*(0.4+sin(phase*59.0)*0.25)+sin(age*2.0+phase*29.0)*age*0.15;
        p.z+=cos(phase*31.0)*age*0.3; p.y+=age*1.7;
        vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp((0.8+age*1.2)*550.0/max(1.0,-mv.z),1.0,180.0); }`,
      fragmentShader: `uniform float strength; varying float age; varying float seed;
      void main(){vec2 uv=gl_PointCoord-0.5; float r=length(uv);
        float edge=1.0-smoothstep(0.08,0.5,r);
        float wisps=0.78+0.22*sin(uv.x*17.0+sin(uv.y*13.0+seed*40.0));
        float alpha=edge*edge*wisps*smoothstep(0.0,0.22,age)*(1.0-smoothstep(1.5,2.6,age))*strength;
        gl_FragColor=vec4(vec3(0.13+seed*0.08),alpha); }`,
      transparent: true,
      depthWrite: false,
    });
    this.smoke = new T.Points(geometry, material);
    this.smoke.name = "truck-smolder-smoke";
    this.smoke.frustumCulled = false;
    this.smoke.renderOrder = 3;
  }
  reset(truck: T.Object3D) {
    this.originals.clear();
    this.lastScorch = -1;
    this.smoke.visible = false;
    // Materials are shared across the procedural model. Give each part its own
    // copies so a door in lava cannot blacken an untouched door on dry ground.
    const copies = new Map<string, Map<T.Material, T.Material>>();
    const sourceMaterials = new Set<T.Material>();
    truck.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      let owner: T.Object3D | null = o;
      while (owner && !PARTS.some((p) => p.id === owner!.name))
        owner = owner.parent;
      const part = owner?.name ?? "truck";
      if (!copies.has(part)) copies.set(part, new Map());
      const cache = copies.get(part)!;
      const clone = (m: T.Material) => {
        if (!cache.has(m)) {
          const copy = m.clone();
          // The metal's source diffuse map is green. Preserve its weathering
          // luminance while letting the selected trim color define its hue.
          if (copy.userData.truckColorSlot === "secondaryColor") {
            copy.onBeforeCompile = (shader) => {
              shader.fragmentShader = shader.fragmentShader.replace(
                "#include <map_fragment>",
                T.ShaderChunk.map_fragment.replace(
                  "diffuseColor *= sampledDiffuseColor;",
                  "sampledDiffuseColor.rgb = vec3(dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))); diffuseColor *= sampledDiffuseColor;",
                ),
              );
            };
            copy.customProgramCacheKey = () => "truck-secondary-tint-v1";
          }
          cache.set(m, copy);
          sourceMaterials.add(m);
        }
        return cache.get(m)!;
      };
      o.material = Array.isArray(o.material)
        ? o.material.map(clone)
        : clone(o.material);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (
          !(
            m instanceof T.MeshStandardMaterial ||
            m instanceof T.MeshBasicMaterial
          ) ||
          this.originals.has(m)
        )
          continue;
        this.originals.set(m, {
          part,
          slot: m.userData.truckColorSlot,
          color: m.color.clone(),
          ...(m instanceof T.MeshStandardMaterial
            ? {
                emissive: m.emissive.clone(),
                metalness: m.metalness,
                roughness: m.roughness,
                envMapIntensity: m.envMapIntensity,
                specularIntensity:
                  m instanceof T.MeshPhysicalMaterial
                    ? m.specularIntensity
                    : undefined,
                clearcoat:
                  m instanceof T.MeshPhysicalMaterial ? m.clearcoat : undefined,
              }
            : {}),
        });
      }
    });
    for (const material of sourceMaterials) material.dispose();
  }
  update(sim: Simulation, position: T.Vector3) {
    for (const [m, base] of this.originals) {
      if (base.slot && base.selectedColor !== sim.tuning[base.slot]) {
        base.selectedColor = sim.tuning[base.slot];
        base.color.setHex(base.selectedColor);
        base.amount = undefined;
      }
      const amount = Math.max(
        sim.scorch,
        sim.parts.get(base.part ?? "")?.lava?.scorch ?? 0,
      );
      if (amount === base.amount) continue;
      base.amount = amount;
      m.color.copy(base.color).multiplyScalar((1 - amount) ** 2);
      if (m instanceof T.MeshStandardMaterial) {
        m.emissive.copy(base.emissive!).multiplyScalar(1 - amount);
        m.envMapIntensity = base.envMapIntensity! * (1 - amount);
        m.metalness = base.metalness! * (1 - amount);
        m.roughness = base.roughness! + (1 - base.roughness!) * amount;
        if (m instanceof T.MeshPhysicalMaterial) {
          m.clearcoat = base.clearcoat! * (1 - amount);
          m.specularIntensity = base.specularIntensity! * (1 - amount);
        }
      }
    }
    this.lastScorch = sim.scorch;
    this.smoke.visible = sim.smoking;
    this.smoke.position.copy(position);
    this.smoke.material.uniforms.time.value = sim.time;
    this.smoke.material.uniforms.strength.value =
      (sim.inFlames ? 0.28 : 0.22) * sim.smokeStrength;
  }
  inspect() {
    return {
      palette: {
        primary: [...this.originals.keys()]
          .find((m) => m.userData.truckColorSlot === "primaryColor")
          ?.color.getHexString(),
        secondary: [...this.originals.keys()]
          .find((m) => m.userData.truckColorSlot === "secondaryColor")
          ?.color.getHexString(),
      },
      scorch: this.lastScorch,
      smokeVisible: this.smoke.visible,
      smokeStrength: this.smoke.material.uniforms.strength.value,
      smokeParticles: this.smoke.visible ? 48 : 0,
      paintColor: [...this.originals.keys()]
        .find((m) => m instanceof T.MeshPhysicalMaterial && !m.transparent)
        ?.color.toArray(),
    };
  }
}
