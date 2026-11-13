import * as T from "three";
import {
  FRAGILE_ICE_SIZE,
  FRAGILE_ICE_WATER_Y,
  type FragileIce,
} from "./fragile-ice";

// Sheets render instanced (one draw call per part for the whole field) so
// thousand-tile lakes stay cheap; per-tile state flips individual instances.
const SHEET_Y = -0.13;
const CRACK_Y = 0.03;
const CRACK_TILTS = [0.3, 1.35, 2.4];
const CRACK_LENS = [3.6, 2.9, 2.2];
const SHARD_COUNT = 6;

const _m = new T.Matrix4();
const _p = new T.Vector3();
const _q = new T.Quaternion();
const _s = new T.Vector3();
const _e = new T.Euler();
const ZERO = new T.Vector3(0, 0, 0);
const ONE = new T.Vector3(1, 1, 1);

function shardLocal(i: number, half: number) {
  const a = (i / SHARD_COUNT) * Math.PI * 2 + 0.4;
  return {
    pos: new T.Vector3(Math.cos(a) * (half - 0.5), 0.1, Math.sin(a) * (half - 0.5)),
    rot: new T.Euler(i * 1.3, a, i * 0.7),
  };
}

export class FragileIceView extends T.Group {
  private source?: FragileIce;
  private key = "";
  private order: string[] = [];
  private base: { x: number; y: number; z: number }[] = [];
  private shattered: boolean[] = [];
  sheets?: T.InstancedMesh;
  waters?: T.InstancedMesh;
  cracks?: T.InstancedMesh;
  shards?: T.InstancedMesh;
  /** Live editing: rebuild around the sim's tile set. */
  removeModel(_id: string) {
    if (this.source) this.rebuild(this.source);
  }
  /** Live editing: rebuild around the sim's moved tile. */
  moveModel(_id: string, _dx: number, _dy: number, _dz: number) {
    if (this.source) this.rebuild(this.source);
  }
  tileIndex(id: string) {
    return this.order.indexOf(id);
  }
  get tileCount() {
    return this.order.length;
  }
  private disposeAll() {
    this.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.dispose();
      }
    });
    this.clear();
    this.sheets = this.waters = this.cracks = this.shards = undefined;
  }
  private rebuild(source: FragileIce) {
    this.disposeAll();
    this.source = source;
    this.order = source.tiles.map((t) => t.h.id);
    this.base = source.tiles.map((t) => ({ x: t.h.x, y: t.h.y ?? 0, z: t.h.z }));
    this.shattered = source.tiles.map((t) => t.shattered);
    this.key = this.order.join(",");
    const n = this.order.length;
    if (n === 0) return;
    const instanced = (
      geometry: T.BufferGeometry,
      material: T.Material,
      count: number,
    ) => {
      const mesh = new T.InstancedMesh(geometry, material, count);
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.add(mesh);
      return mesh;
    };
    this.sheets = instanced(
      new T.BoxGeometry(FRAGILE_ICE_SIZE - 0.02, 0.3, FRAGILE_ICE_SIZE - 0.02),
      // Opaque medium ice-blue: readable against white snow in day and
      // night lighting (translucent pale sheets blew out to snow-white).
      new T.MeshStandardMaterial({
        color: 0x3f8fd2,
        transparent: false,
        roughness: 0.35,
        metalness: 0.05,
      }),
      n,
    );
    this.sheets.castShadow = true;
    this.sheets.receiveShadow = true;
    this.waters = instanced(
      new T.PlaneGeometry(FRAGILE_ICE_SIZE - 0.1, FRAGILE_ICE_SIZE - 0.1).rotateX(-Math.PI / 2),
      new T.MeshStandardMaterial({
        color: 0x1a5f8a,
        transparent: true,
        opacity: 0.88,
        roughness: 0.1,
        metalness: 0.2,
        emissive: 0x0a2f47,
        emissiveIntensity: 0.5,
      }),
      n,
    );
    this.cracks = instanced(
      new T.BoxGeometry(1, 0.02, 0.09),
      new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
      n * 3,
    );
    this.shards = instanced(
      new T.TetrahedronGeometry(0.45),
      new T.MeshStandardMaterial({
        color: 0xd8f1ff,
        roughness: 0.25,
        emissive: 0x3fa7ff,
        emissiveIntensity: 0.25,
      }),
      n * SHARD_COUNT,
    );
    // Pit basins render as shared level solids, not here.
    for (let i = 0; i < n; i++) {
      this.writeSheet(i, !this.shattered[i]);
      this.writeWater(i, 0);
      this.writeShards(i, this.shattered[i]);
    }
  }
  private writeSheet(i: number, visible: boolean) {
    const b = this.base[i];
    _p.set(b.x, b.y + SHEET_Y, b.z);
    _q.identity();
    _m.compose(_p, _q, visible ? ONE : ZERO);
    this.sheets!.setMatrixAt(i, _m);
    for (let k = 0; k < 3; k++) {
      _p.set(b.x, b.y + CRACK_Y, b.z);
      _e.set(0, CRACK_TILTS[k], 0);
      _q.setFromEuler(_e);
      _s.set(CRACK_LENS[k], 1, 1);
      if (!visible) _s.set(0, 0, 0);
      _m.compose(_p, _q, _s);
      this.cracks!.setMatrixAt(i * 3 + k, _m);
    }
    this.sheets!.instanceMatrix.needsUpdate = true;
    this.cracks!.instanceMatrix.needsUpdate = true;
  }
  private writeWater(i: number, time: number) {
    const b = this.base[i];
    _p.set(
      b.x,
      b.y + FRAGILE_ICE_WATER_Y + Math.sin(time * 2 + b.x * 0.7 + b.z) * 0.04,
      b.z,
    );
    _q.identity();
    _m.compose(_p, _q, ONE);
    this.waters!.setMatrixAt(i, _m);
  }
  private writeShards(i: number, visible: boolean) {
    const b = this.base[i];
    const half = FRAGILE_ICE_SIZE / 2;
    for (let k = 0; k < SHARD_COUNT; k++) {
      const { pos, rot } = shardLocal(k, half);
      _p.set(b.x + pos.x, b.y + pos.y, b.z + pos.z);
      _q.setFromEuler(rot);
      _m.compose(_p, _q, visible ? ONE : ZERO);
      this.shards!.setMatrixAt(i * SHARD_COUNT + k, _m);
    }
    this.shards!.instanceMatrix.needsUpdate = true;
  }
  update(source: FragileIce, time: number) {
    if (source !== this.source || source.tiles.map((t) => t.h.id).join(",") !== this.key)
      this.rebuild(source);
    if (this.order.length === 0) return;
    for (let i = 0; i < source.tiles.length; i++) {
      const t = source.tiles[i];
      this.writeWater(i, time);
      if (t.shattered !== this.shattered[i]) {
        this.shattered[i] = t.shattered;
        this.writeSheet(i, !t.shattered);
        this.writeShards(i, t.shattered);
      }
    }
    this.waters!.instanceMatrix.needsUpdate = true;
  }
}
