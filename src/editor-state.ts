import {
  blankLevel,
  type CustomLevel,
  type CustomPrefab,
  type CustomPoint,
  type CustomSolid,
  type SolidKind,
} from "./custom-level";
export type EditorSelection =
  | { kind: "solid"; id: string }
  | { kind: "prefab"; id: string }
  | { kind: "checkpoint"; index: number }
  | { kind: "target"; index: number }
  | { kind: "spawn" }
  | null;
const SOLID_DEFAULTS: Record<
  SolidKind,
  { w: number; h: number; d: number; color: number; angle?: number }
> = {
  ground: { w: 200, h: 1.2, d: 200, color: 0x6d817c },
  road: { w: 24, h: 0.03, d: 100, color: 0x303e49 },
  container: { w: 8, h: 5.2, d: 16, color: 0xac623f },
  barrier: { w: 6, h: 1.6, d: 5, color: 0xe6c16a },
  ramp: { w: 16, h: 0.35, d: 12, color: 0x8a8f96, angle: -0.124 },
  support: { w: 2, h: 8, d: 2, color: 0x555c60 },
  lava: { w: 20, h: 0.5, d: 20, color: 0xff5a1f },
};
/** Mutable level-editing state with dirty tracking. The DOM screen observes it. */
export class EditorStore {
  level: CustomLevel;
  selection: EditorSelection = null;
  dirty = false;
  private listeners = new Set<() => void>();
  constructor(name: string) {
    this.level = blankLevel(name);
  }
  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }
  private emit(touch = true) {
    if (touch) this.dirty = true;
    for (const listener of this.listeners) listener();
  }
  openBlank(name: string) {
    this.level = blankLevel(name);
    this.selection = null;
    this.dirty = false;
    for (const listener of this.listeners) listener();
  }
  openLevel(level: CustomLevel) {
    this.level = level;
    this.selection = null;
    this.dirty = false;
    for (const listener of this.listeners) listener();
  }
  markSaved() {
    this.dirty = false;
    for (const listener of this.listeners) listener();
  }
  updateName(name: string) {
    this.level.name = name;
    this.emit();
  }
  select(selection: EditorSelection) {
    this.selection = selection;
    this.emit(false);
  }
  private nextId(prefix: string, taken: Set<string>) {
    let n = taken.size + 1;
    while (taken.has(`${prefix}-${n}`)) n++;
    return `${prefix}-${n}`;
  }
  addSolid(kind: SolidKind, x = 0, z = 0): CustomSolid {
    const defaults = SOLID_DEFAULTS[kind];
    const taken = new Set(this.level.solids.map((s) => s.id));
    const nudge = this.level.solids.length * 2;
    const solid: CustomSolid = {
      id: this.nextId(kind, taken),
      kind,
      x: x + nudge,
      y: kind === "ground" ? -defaults.h / 2 : defaults.h / 2,
      z,
      w: defaults.w,
      h: defaults.h,
      d: defaults.d,
      color: defaults.color,
      ...(defaults.angle === undefined ? {} : { angle: defaults.angle }),
    };
    this.level.solids.push(solid);
    this.selection = { kind: "solid", id: solid.id };
    this.emit();
    return solid;
  }
  addPrefab(kind: string, x = 0, z = 0): CustomPrefab {
    const taken = new Set(this.level.prefabs.map((p) => p.id));
    const prefab: CustomPrefab = {
      id: this.nextId(kind, taken),
      kind,
      x,
      z,
    };
    this.level.prefabs.push(prefab);
    this.selection = { kind: "prefab", id: prefab.id };
    this.emit();
    return prefab;
  }
  addCheckpoint(x = 0, z = 0): CustomPoint {
    const point = { x, z };
    this.level.checkpoints.push(point);
    this.selection = {
      kind: "checkpoint",
      index: this.level.checkpoints.length - 1,
    };
    this.emit();
    return point;
  }
  /** Arena collectibles and demolition targets share one list UI. */
  targetList(): CustomPoint[] {
    if (this.level.mode === "arena")
      return (this.level.collectibles ??= []);
    if (this.level.mode === "demolition")
      return (this.level.demolish ??= []);
    return [];
  }
  addTarget(x = 0, z = 0): CustomPoint | undefined {
    const list = this.targetList();
    if (this.level.mode !== "arena" && this.level.mode !== "demolition")
      return undefined;
    const point = { x, z };
    list.push(point);
    this.selection = { kind: "target", index: list.length - 1 };
    this.emit();
    return point;
  }
  selectedItem():
    | { kind: "solid"; item: CustomSolid }
    | { kind: "prefab"; item: CustomPrefab }
    | { kind: "checkpoint"; item: CustomPoint }
    | { kind: "target"; item: CustomPoint }
    | { kind: "spawn"; item: CustomLevel["spawn"] }
    | null {
    const sel = this.selection;
    if (!sel) return null;
    if (sel.kind === "solid") {
      const item = this.level.solids.find((s) => s.id === sel.id);
      return item ? { kind: "solid", item } : null;
    }
    if (sel.kind === "prefab") {
      const item = this.level.prefabs.find((p) => p.id === sel.id);
      return item ? { kind: "prefab", item } : null;
    }
    if (sel.kind === "checkpoint") {
      const item = this.level.checkpoints[sel.index];
      return item ? { kind: "checkpoint", item } : null;
    }
    if (sel.kind === "target") {
      const item = this.targetList()[sel.index];
      return item ? { kind: "target", item } : null;
    }
    return { kind: "spawn", item: this.level.spawn };
  }
  updateSelected(patch: Record<string, number | string | undefined>) {
    const current = this.selectedItem();
    if (!current) return;
    Object.assign(current.item, patch);
    this.emit();
  }
  updateLevel(
    patch: Partial<
      Pick<CustomLevel, "mode" | "limit"> & {
        gold: number;
        silver: number;
        bronze: number;
      }
    >,
  ) {
    if (patch.mode) this.level.mode = patch.mode;
    if (patch.limit !== undefined) {
      if (Number.isNaN(patch.limit)) delete this.level.limit;
      else this.level.limit = patch.limit;
    }
    if (patch.gold !== undefined) this.level.medals.gold = patch.gold;
    if (patch.silver !== undefined) this.level.medals.silver = patch.silver;
    if (patch.bronze !== undefined) this.level.medals.bronze = patch.bronze;
    this.emit();
  }
  deleteSelected() {
    const sel = this.selection;
    if (!sel || sel.kind === "spawn") return;
    if (sel.kind === "solid")
      this.level.solids = this.level.solids.filter((s) => s.id !== sel.id);
    else if (sel.kind === "prefab")
      this.level.prefabs = this.level.prefabs.filter((p) => p.id !== sel.id);
    else if (sel.kind === "checkpoint")
      this.level.checkpoints.splice(sel.index, 1);
    else this.targetList().splice(sel.index, 1);
    this.selection = null;
    this.emit();
  }
  duplicateSelected(): CustomSolid | CustomPrefab | CustomPoint | undefined {
    const current = this.selectedItem();
    if (!current || current.kind === "spawn") return undefined;
    if (current.kind === "checkpoint" || current.kind === "target") {
      const copy = { ...current.item, x: current.item.x + 2 };
      const list =
        current.kind === "checkpoint"
          ? this.level.checkpoints
          : this.targetList();
      list.push(copy);
      this.selection = { kind: current.kind, index: list.length - 1 };
      this.emit();
      return copy;
    }
    if (current.kind === "solid") {
      const taken = new Set(this.level.solids.map((s) => s.id));
      const copy = {
        ...current.item,
        id: this.nextId(current.item.kind, taken),
        x: current.item.x + 2,
      };
      this.level.solids.push(copy);
      this.selection = { kind: "solid", id: copy.id };
      this.emit();
      return copy;
    }
    const taken = new Set(this.level.prefabs.map((p) => p.id));
    const copy = {
      ...current.item,
      id: this.nextId(current.item.kind, taken),
      x: current.item.x + 2,
    };
    this.level.prefabs.push(copy);
    this.selection = { kind: "prefab", id: copy.id };
    this.emit();
    return copy;
  }
}
