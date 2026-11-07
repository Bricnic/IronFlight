import {
  blankLevel,
  solidDefaults,
  type CustomLevel,
  type CustomPrefab,
  type CustomPoint,
  type CustomRing,
  type CustomSolid,
  type SolidKind,
} from "./custom-level";
import { previewClip, type ClipRect } from "./editor-clip";
export type EditorSelection =
  | { kind: "solid"; id: string }
  | { kind: "prefab"; id: string }
  | { kind: "checkpoint"; index: number }
  | { kind: "target"; index: number }
  | { kind: "ring"; index: number }
  | { kind: "spawn" }
  | null;
export type EditorTool = "select" | "pan" | "eyedropper" | "rotator" | "clip";
type Snapshot = { level: CustomLevel; selection: EditorSelection; solidSelection: string[] };
/**
 * The editor store may adopt a live session's level only when it has no
 * unsaved work of its own and both sides name the same level.
 */
export function shouldSyncFromSession(
  storeDirty: boolean,
  storeName: string,
  sessionName: string | undefined,
) {
  return !storeDirty && sessionName !== undefined && storeName === sessionName;
}
/** Mutable level-editing state with dirty tracking. The DOM screen observes it. */
export class EditorStore {
  level: CustomLevel;
  selection: EditorSelection = null;
  solidSelection: string[] = [];
  clip: { targets: string[]; cutters: ClipRect[]; cutterId?: string } | null = null;
  tool: EditorTool = "select";
  preview = false;
  dirty = false;
  private listeners = new Set<() => void>();
  private past: Snapshot[] = [];
  private future: Snapshot[] = [];
  private gesture: {
    snapshot: Snapshot;
    dirty: boolean;
  } | null = null;
  constructor(name: string) {
    this.level = blankLevel(name);
  }
  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }
  private snapshot() {
    return {
      level: structuredClone(this.level),
      selection: structuredClone(this.selection),
      solidSelection: [...this.solidSelection],
    };
  }
  private pushHistory() {
    if (this.gesture) {
      // A drag counts as one change: capture the pre-gesture state on the
      // first mutation, then ignore the in-between states.
      if (this.gesture.dirty) return;
      this.gesture.dirty = true;
      this.past.push(this.gesture.snapshot);
      if (this.past.length > 100) this.past.shift();
      this.future = [];
      return;
    }
    this.past.push(this.snapshot());
    if (this.past.length > 100) this.past.shift();
    this.future = [];
  }
  /** Open a coalescing gesture (mousedown); nested opens are ignored. */
  beginGesture() {
    if (this.gesture) return;
    this.gesture = { snapshot: this.snapshot(), dirty: false };
  }
  /** Close the gesture (mouseup); gestures with no changes leave no history. */
  endGesture() {
    this.gesture = null;
  }
  /** Restore the previous change; false when history is empty. */
  undo() {
    this.cancelClip();
    const prev = this.past.pop();
    if (!prev) return false;
    this.future.push(this.snapshot());
    if (this.future.length > 100) this.future.shift();
    this.level = prev.level;
    this.selection = prev.selection;
    this.solidSelection = prev.solidSelection;
    this.emit();
    return true;
  }
  /** Re-apply an undone change; false when there is nothing to redo. */
  redo() {
    this.cancelClip();
    const next = this.future.pop();
    if (!next) return false;
    this.past.push(this.snapshot());
    if (this.past.length > 100) this.past.shift();
    this.level = next.level;
    this.selection = next.selection;
    this.solidSelection = next.solidSelection;
    this.emit();
    return true;
  }
  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }
  private emit(touch = true) {
    if (this.selection?.kind !== "solid") this.solidSelection = [];
    else {
      this.solidSelection = this.solidSelection.filter((id) => this.level.solids.some((s) => s.id === id && !s.locked));
      if (!this.solidSelection.includes(this.selection.id)) this.solidSelection = [this.selection.id];
    }
    if (touch) this.dirty = true;
    for (const listener of this.listeners) listener();
  }
  openBlank(name: string) {
    this.clip = null; this.tool = "select"; this.solidSelection = [];
    this.level = blankLevel(name);
    this.selection = null;
    this.dirty = false;
    this.past = [];
    this.future = [];
    this.gesture = null;
    for (const listener of this.listeners) listener();
  }
  openLevel(level: CustomLevel) {
    this.clip = null; this.tool = "select"; this.solidSelection = [];
    this.level = level;
    this.selection = null;
    this.dirty = false;
    this.past = [];
    this.future = [];
    this.gesture = null;
    for (const listener of this.listeners) listener();
  }
  markSaved() {
    this.dirty = false;
    for (const listener of this.listeners) listener();
  }
  updateName(name: string) {
    this.pushHistory();
    this.level.name = name;
    this.emit();
  }
  select(selection: EditorSelection, additive = false) {
    if (this.selectedItem(selection)?.item.locked) return;
    this.selection = selection;
    if (selection?.kind === "solid") {
      this.solidSelection = additive
        ? this.solidSelection.includes(selection.id) ? this.solidSelection.filter((id) => id !== selection.id) : [...this.solidSelection, selection.id]
        : [selection.id];
      if (!this.solidSelection.includes(selection.id)) this.selection = this.solidSelection.length ? { kind: "solid", id: this.solidSelection[this.solidSelection.length - 1] } : null;
    } else this.solidSelection = [];
    this.emit(false);
  }
  setLocked(selection: EditorSelection, locked: boolean) {
    const current = this.selectedItem(selection);
    if (!current || !!current.item.locked === locked) return;
    this.pushHistory();
    if (locked && this.selectedItem()?.item === current.item)
      this.selection = null;
    current.item.locked = locked;
    this.emit();
  }
  setTool(tool: EditorTool) {
    if (tool === "clip") { this.startClip(); return; }
    this.clip = null;
    this.tool = tool;
    this.emit(false);
  }
  startClip() {
    this.endGesture();
    const ids = this.selection?.kind === "solid" ? (this.solidSelection.includes(this.selection.id) ? this.solidSelection : [this.selection.id]) : [];
    this.clip = { targets: [...ids], cutters: [] };
    this.tool = "clip";
    this.emit(false);
  }
  cancelClip() {
    if (!this.clip) return;
    this.clip = null; this.tool = "select"; this.emit(false);
  }
  setClipCutters(cutters: ClipRect[], cutterId?: string) {
    if (!this.clip) return;
    this.clip.cutters = cutters; this.clip.cutterId = cutterId ?? this.clip.cutterId;
    if (this.clip.cutterId) this.clip.targets = this.clip.targets.filter((id) => id !== this.clip!.cutterId);
    this.emit(false);
  }
  setClipTarget(id: string, enabled: boolean) {
    if (!this.clip || id === this.clip.cutterId) return;
    this.clip.targets = this.clip.targets.filter((target) => target !== id);
    if (enabled) this.clip.targets.push(id);
    this.emit(false);
  }
  clipPreview() {
    return this.clip?.cutters.length ? previewClip(this.level.solids, this.clip.targets, this.clip.cutters) : null;
  }
  applyClip() {
    const result = this.clipPreview();
    if (!result?.affected.length || result.issues.length) return false;
    this.pushHistory();
    this.level.solids = result.solids;
    this.solidSelection = result.retained.map((s) => s.id);
    this.selection = result.retained[0] ? { kind: "solid", id: result.retained[0].id } : null;
    this.clip = null; this.tool = "select"; this.emit();
    return true;
  }
  setPreview(preview: boolean) {
    this.preview = preview;
    this.emit(false);
  }
  private nextId(prefix: string, taken: Set<string>) {
    let n = taken.size + 1;
    while (taken.has(`${prefix}-${n}`)) n++;
    return `${prefix}-${n}`;
  }
  addSolid(kind: SolidKind, x = 0, z = 0): CustomSolid {
    this.pushHistory();
    const defaults = solidDefaults(kind);
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
    this.solidSelection = [solid.id];
    this.emit();
    return solid;
  }
  addPrefab(kind: string, x = 0, z = 0): CustomPrefab {
    this.pushHistory();
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
    this.pushHistory();
    const point = { x, z };
    this.level.checkpoints.push(point);
    this.selection = {
      kind: "checkpoint",
      index: this.level.checkpoints.length - 1,
    };
    this.emit();
    return point;
  }
  /** Arena/race collectibles and demolition targets share one list UI. */
  targetList(): CustomPoint[] {
    if (this.level.mode === "arena" || this.level.mode === "race")
      return (this.level.collectibles ??= []);
    if (this.level.mode === "demolition")
      return (this.level.demolish ??= []);
    return [];
  }
  addRing(x = 0, z = 0): CustomRing {
    this.pushHistory();
    const ring: CustomRing = { x, y: 4, z, radius: 6, goal: false };
    const rings = (this.level.rings ??= []);
    rings.push(ring);
    this.selection = { kind: "ring", index: rings.length - 1 };
    this.emit();
    return ring;
  }
  addTarget(x = 0, z = 0): CustomPoint | undefined {
    const list = this.targetList();
    if (
      this.level.mode !== "arena" &&
      this.level.mode !== "demolition" &&
      this.level.mode !== "race"
    )
      return undefined;
    const point = { x, y: this.level.mode === "demolition" ? 1.5 : 1.7, z };
    this.pushHistory();
    list.push(point);
    this.selection = { kind: "target", index: list.length - 1 };
    this.emit();
    return point;
  }
  selectedItem(sel: EditorSelection = this.selection):
    | { kind: "solid"; item: CustomSolid }
    | { kind: "prefab"; item: CustomPrefab }
    | { kind: "checkpoint"; item: CustomPoint }
    | { kind: "target"; item: CustomPoint }
    | { kind: "ring"; item: CustomRing }
    | { kind: "spawn"; item: CustomLevel["spawn"] }
    | null {
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
    if (sel.kind === "ring") {
      const item = (this.level.rings ?? [])[sel.index];
      return item ? { kind: "ring", item } : null;
    }
    return { kind: "spawn", item: this.level.spawn };
  }
  updateSelected(patch: Record<string, number | string | boolean | undefined>) {
    const current = this.selectedItem();
    if (!current) return;
    this.pushHistory();
    Object.assign(current.item, patch);
    this.emit();
  }
  renameSelected(value: string) {
    const current = this.selectedItem();
    if (!current || current.item.locked) return;
    const name = value.trim() || undefined;
    if (name && name.length > 80) throw new Error("Object names must be at most 80 characters");
    if (current.item.name !== name) this.updateSelected({ name });
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
    this.pushHistory();
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
    this.pushHistory();
    if (sel.kind === "solid")
      this.level.solids = this.level.solids.filter((s) => s.id !== sel.id);
    else if (sel.kind === "prefab")
      this.level.prefabs = this.level.prefabs.filter((p) => p.id !== sel.id);
    else if (sel.kind === "checkpoint")
      this.level.checkpoints.splice(sel.index, 1);
    else if (sel.kind === "ring")
      (this.level.rings ?? []).splice(sel.index, 1);
    else this.targetList().splice(sel.index, 1);
    this.selection = null;
    this.emit();
  }
  duplicateSelected():
    | CustomSolid
    | CustomPrefab
    | CustomPoint
    | CustomRing
    | undefined {
    const current = this.selectedItem();
    if (!current || current.kind === "spawn") return undefined;
    this.pushHistory();
    if (current.kind === "ring") {
      const copy = { ...current.item, x: current.item.x + 2 };
      const rings = (this.level.rings ??= []);
      rings.push(copy);
      this.selection = { kind: "ring", index: rings.length - 1 };
      this.emit();
      return copy;
    }
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
      this.solidSelection = [copy.id];
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
