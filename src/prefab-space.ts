import R from "@dimforge/rapier3d-compat";
import { Vector3 } from "three";
import { prefabY, toTrack, type CustomPrefab } from "./custom-level";
import type { Simulation } from "./simulation";
import type { Track } from "./tracks";

/** Uniform authoring space keeps joints, moving parts and hazard algorithms coherent. */
export class PrefabSpace {
  readonly factor: number;
  readonly origin: Vector3;
  readonly colliders = new Set<number>();
  private bodies = new WeakMap<R.RigidBody, R.RigidBody>();
  private shapes = new WeakMap<R.Collider, R.Collider>();
  private originals = new WeakMap<object, object>();
  constructor(readonly prefab: CustomPrefab) {
    this.factor = prefab.resizeScale ?? 1;
    this.origin = new Vector3(prefab.x, prefabY(prefab), prefab.z);
  }
  toWorld(p: R.Vector) { return new Vector3(p.x, p.y, p.z).sub(this.origin).multiplyScalar(this.factor).add(this.origin); }
  toLocal(p: R.Vector) { return new Vector3(p.x, p.y, p.z).sub(this.origin).divideScalar(this.factor).add(this.origin); }
  vector(p: R.Vector, factor = this.factor) { return new Vector3(p.x, p.y, p.z).multiplyScalar(factor); }
  unwrap<T>(value: T): T { return (value && typeof value === "object" ? this.originals.get(value) ?? value : value) as T; }
  scaleShape(shape: R.Shape): R.Shape {
    const s = this.factor;
    if (shape instanceof R.Cuboid) return new R.Cuboid(shape.halfExtents.x * s, shape.halfExtents.y * s, shape.halfExtents.z * s);
    if (shape instanceof R.Ball) return new R.Ball(shape.radius * s);
    if (shape instanceof R.Cylinder) return new R.Cylinder(shape.halfHeight * s, shape.radius * s);
    if (shape instanceof R.Cone) return new R.Cone(shape.halfHeight * s, shape.radius * s);
    if (shape instanceof R.Capsule) return new R.Capsule(shape.halfHeight * s, shape.radius * s);
    if (shape instanceof R.ConvexPolyhedron) return new R.ConvexPolyhedron(shape.vertices.map(n => n * s), shape.indices);
    if (shape instanceof R.TriMesh) return new R.TriMesh(shape.vertices.map(n => n * s), shape.indices);
    if (shape instanceof R.RoundCuboid) return new R.RoundCuboid(shape.halfExtents.x * s, shape.halfExtents.y * s, shape.halfExtents.z * s, shape.borderRadius * s);
    throw new Error(`Unsupported prefab collider shape ${shape.type}`);
  }
  body(body: R.RigidBody): R.RigidBody {
    const cached = this.bodies.get(body); if (cached) return cached;
    const space = this;
    const proxy = new Proxy(body, { get(target, key) {
      if (key === "translation" || key === "nextTranslation" || key === "worldCom") return () => space.toLocal((target[key] as () => R.Vector).call(target));
      if (key === "linvel") return () => space.vector(target.linvel(), 1 / space.factor);
      if (key === "setTranslation" || key === "setNextKinematicTranslation") return (p: R.Vector, wake?: boolean) => (target[key] as (p: R.Vector, wake?: boolean) => void).call(target, space.toWorld(p), wake);
      if (["setLinvel", "applyImpulse", "addForce"].includes(String(key))) return (v: R.Vector, wake?: boolean) => (Reflect.get(target, key) as (v: R.Vector, wake?: boolean) => void).call(target, space.vector(v), wake);
      if (key === "applyImpulseAtPoint" || key === "addForceAtPoint") return (v: R.Vector, point: R.Vector, wake: boolean) => target[key](space.vector(v), space.toWorld(point), wake);
      if (key === "collider") return (i: number) => space.collider(target.collider(i));
      const value = Reflect.get(target, key, target); return typeof value === "function" ? value.bind(target) : value;
    }});
    this.bodies.set(body, proxy); this.originals.set(proxy, body); return proxy;
  }
  collider(collider: R.Collider): R.Collider {
    const cached = this.shapes.get(collider); if (cached) return cached;
    const space = this;
    const proxy = new Proxy(collider, { get(target, key) {
      if (key === "translation") return () => space.toLocal(target.translation());
      if (key === "setTranslation") return (p: R.Vector) => target.setTranslation(space.toWorld(p));
      if (key === "setTranslationWrtParent") return (p: R.Vector) => target.setTranslationWrtParent(space.vector(p));
      if (key === "setShape") return (shape: R.Shape) => target.setShape(space.scaleShape(shape));
      if (key === "setHalfExtents") return (size: R.Vector) => target.setHalfExtents(space.vector(size));
      if (key === "halfExtents") return () => space.vector(target.halfExtents(), 1 / space.factor);
      if (key === "setRadius" || key === "setHalfHeight") return (n: number) => target[key](n * space.factor);
      if (key === "radius" || key === "halfHeight") return () => target[key]() / space.factor;
      if (key === "parent") return () => { const parent = target.parent(); return parent ? space.body(parent) : null; };
      const value = Reflect.get(target, key, target); return typeof value === "function" ? value.bind(target) : value;
    }});
    this.shapes.set(collider, proxy); this.originals.set(proxy, collider); return proxy;
  }
  world(world: R.World): R.World {
    const space = this;
    return new Proxy(world, { get(target, key) {
      if (key === "createRigidBody") return (desc: R.RigidBodyDesc) => {
        const copy = Object.assign(Object.create(Object.getPrototypeOf(desc)), desc) as R.RigidBodyDesc;
        copy.translation = space.toWorld(desc.translation); copy.linvel = space.vector(desc.linvel);
        return space.body(target.createRigidBody(copy));
      };
      if (key === "createCollider") return (desc: R.ColliderDesc, parent?: R.RigidBody) => {
        const copy = Object.assign(Object.create(Object.getPrototypeOf(desc)), desc) as R.ColliderDesc;
        copy.shape = space.scaleShape(desc.shape);
        copy.translation = parent ? space.vector(desc.translation) : space.toWorld(desc.translation);
        const collider = target.createCollider(copy, parent ? space.unwrap(parent) : undefined);
        space.colliders.add(collider.handle); return space.collider(collider);
      };
      if (key === "createImpulseJoint") return (desc: R.JointData, a: R.RigidBody, b: R.RigidBody, wake: boolean) => {
        const copy = Object.assign(Object.create(Object.getPrototypeOf(desc)), desc) as R.JointData;
        copy.anchor1 = space.vector(desc.anchor1); copy.anchor2 = space.vector(desc.anchor2);
        copy.length = desc.length * space.factor;
        if (desc.limitsEnabled) copy.limits = desc.limits.map(n => n * space.factor);
        return target.createImpulseJoint(copy, space.unwrap(a), space.unwrap(b), wake);
      };
      if (key === "getRigidBody") return (handle: number) => space.body(target.getRigidBody(handle));
      if (key === "getCollider") return (handle: number) => space.collider(target.getCollider(handle));
      if (key === "contactPairsWith") return (collider: R.Collider, callback: (other: R.Collider) => void) => target.contactPairsWith(space.unwrap(collider), other => callback(space.collider(other)));
      if (key === "contactPair") return (a: R.Collider, b: R.Collider, callback: (m: R.TempContactManifold, flipped: boolean) => void) => target.contactPair(space.unwrap(a), space.unwrap(b), (manifold, flipped) => {
        const wrapped = new Proxy(manifold, { get(m, k) {
          if (k === "localContactPoint1" || k === "localContactPoint2") return (i: number) => { const point = m[k](i); return point ? space.vector(point, 1 / space.factor) : null; };
          if (k === "solverContactPoint") return (i: number) => space.toLocal(m.solverContactPoint(i));
          if (k === "contactDist" || k === "solverContactDist") return (i: number) => m[k](i) / space.factor;
          const v = Reflect.get(m, k, m); return typeof v === "function" ? v.bind(m) : v;
        }});
        callback(wrapped, flipped);
      });
      if (key === "castRay" || key === "castRayAndGetNormal") return (ray: R.Ray, ...args: unknown[]) => {
        const mapped = new R.Ray(space.toWorld(ray.origin), space.vector(ray.dir));
        return (Reflect.get(target, key) as (...args: unknown[]) => unknown).call(target, mapped, ...args.map(a => space.unwrap(a)));
      };
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? (...args: unknown[]) => value.apply(target, args.map(a => space.unwrap(a))) : value;
    }});
  }
  simulation(source: Simulation, track: Track, components: Partial<Simulation>): Simulation {
    const space = this, world = this.world(source.world);
    let runSource: Simulation["trackRun"], runProxy: Simulation["trackRun"];
    return new Proxy(source, { get(target, key, receiver) {
      if (key in components) return Reflect.get(components, key);
      if (key === "world") return world;
      if (key === "courseTrack") return track;
      if (key === "trackRun") {
        if (!target.trackRun) return undefined;
        if (runSource !== target.trackRun) { runSource = target.trackRun; runProxy = new Proxy(runSource, { get(r, k) { const v = Reflect.get(r, k, r); return k === "track" ? track : typeof v === "function" ? v.bind(r) : v; } }); }
        return runProxy;
      }
      if (key === "body") return space.body(target.body);
      if (key === "previousPosition") return space.toLocal(target.previousPosition);
      if (key === "wheelPositions") return () => target.wheelPositions().map(p => space.toLocal(p));
      if (key === "partDefs") return target.partDefs.map(def => ({ ...def, pos: def.pos.map(n => n / space.factor), size: def.size.map(n => n / space.factor) }));
      if (key === "partBounds") return new Map([...target.partBounds].map(([id, bounds]) => [id, { min: bounds.min.clone().divideScalar(space.factor), max: bounds.max.clone().divideScalar(space.factor) }]));
      if (key === "parts") return new Map([...target.parts].map(([id, state]) => [id, new Proxy(state, { get(p, k) {
        if (k === "body" && p.body) return space.body(p.body);
        if (k === "collider" && p.collider) return space.collider(p.collider);
        return Reflect.get(p, k, p);
      } })]));
      if (["damage", "fireDamage", "breakRandomPart", "setVehicle"].includes(String(key))) return Reflect.get(target, key, target).bind(target);
      const value = Reflect.get(target, key, receiver);
      // Simulation methods intentionally execute in this prefab's coordinate space.
      return typeof value === "function" ? value.bind(receiver) : value;
    }});
  }
}

const baseCache = new WeakMap<Track, Track>();
export function basePrefabTrack(track: Track): Track {
  if (!track.custom?.prefabs.some(p => p.resizeScale !== undefined && p.resizeScale !== 1)) return track;
  let base = baseCache.get(track);
  if (!base) { base = { ...track, ...toTrack({ ...track.custom, prefabs: track.custom.prefabs.filter(p => p.kind === "checkpoint" || p.resizeScale === undefined || p.resizeScale === 1) }) }; baseCache.set(track, base); }
  return base;
}

const simulationCache = new WeakMap<Simulation, { track?: Track; proxy: Simulation }>();
export function basePrefabSimulation(source: Simulation): Simulation {
  const track = source.courseTrack;
  if (!track || basePrefabTrack(track) === track) return source;
  const cached = simulationCache.get(source); if (cached?.track === track) return cached.proxy;
  let runSource: Simulation["trackRun"], runProxy: Simulation["trackRun"];
  const proxy = new Proxy(source, { get(target, key) {
    if (key === "courseTrack") return basePrefabTrack(track);
    if (key === "trackRun" && target.trackRun) {
      if (runSource !== target.trackRun) { runSource = target.trackRun; runProxy = new Proxy(runSource, { get(r, k) { const value = Reflect.get(r, k, r); return k === "track" ? basePrefabTrack(track) : typeof value === "function" ? value.bind(r) : value; } }); }
      return runProxy;
    }
    const value = Reflect.get(target, key, target); return typeof value === "function" ? value.bind(target) : value;
  }});
  simulationCache.set(source, { track, proxy }); return proxy;
}
