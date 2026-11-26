import {
  blankLevel,
  groundHeightAt,
  orderCheckpoints,
  PREFAB_HOVER_HEIGHT,
  prefabY,
  solidDefaults,
  type CustomCheckpoint,
  type CustomLevel,
  type CustomPrefab,
  type CustomPoint,
  type CustomRing,
  type CustomSolid,
  type SolidKind,
} from "./custom-level";
import { autoClipOrder, previewAutoClip, previewClip, type ClipRect } from "./editor-clip";
import { editableProperties, objectKindKey, propertyValue } from "./editor-properties";
import { Euler, Quaternion, Vector3 } from "three";
import { DEFAULT_EDITOR_GRID, snapCoordinate, type EditorGridSettings, type GridAxis } from "./editor-grid";
import { validPrefabLightPatch } from "./prefab-lights";
export type EditorSelection =
  | { kind: "solid"; id: string }
  | { kind: "prefab"; id: string }
  | { kind: "checkpoint"; index: number }
  | { kind: "target"; index: number }
  | { kind: "ring"; index: number }
  | { kind: "spawn" }
  | null;
export type EditorTool = "select" | "pan" | "eyedropper" | "rotator" | "resize" | "clip" | "look";
type Selection = NonNullable<EditorSelection>;
export const selectionKey = (s: Selection) => `${s.kind}:${"id" in s ? s.id : "index" in s ? s.index : ""}`;
type Snapshot = { level: CustomLevel; selection: EditorSelection; solidSelection: string[]; selections: Selection[]; selectionKindFilter?: string };
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
  selections: Selection[] = [];
  private selectionKindFilter?: string;
  private clipboard: { kind: Selection["kind"]; item: NonNullable<ReturnType<EditorStore["selectedItem"]>>["item"] }[] = [];
  private pasteCount = 0;
  clip: { targets: string[]; cutters: ClipRect[]; cutterId?: string } | null = null;
  tool: EditorTool = "select";
  preview = false;
  grid = { ...DEFAULT_EDITOR_GRID };
  dirty = false;
  private listeners = new Set<() => void>();
  private past: Snapshot[] = [];
  private future: Snapshot[] = [];
  private gesture: {
    snapshot: Snapshot;
    dirty: boolean;
  } | null = null;
  private checkpointMoved = false;
  constructor(name: string) {
    this.level = blankLevel(name);
  }
  updateGrid(patch: Partial<EditorGridSettings>) {
    if (patch.spacing !== undefined && (!Number.isFinite(patch.spacing) || patch.spacing <= 0)) return;
    Object.assign(this.grid, patch); this.emit(false);
  }
  selectionPositions(entries = this.selectedEntries()) {
    return entries.map(selection => {
      const object = this.selectedItem(selection)!;
      return { selection, hasY: object.item.y !== undefined, x: object.item.x, y: object.item.y ?? (object.kind === "prefab" ? prefabY(object.item) : object.kind === "checkpoint" ? 2 : object.kind === "target" ? this.level.mode === "demolition" ? 1.5 : 1.7 : 0), z: object.item.z };
    });
  }
  /** Apply absolute drag positions from the grab snapshot, avoiding cumulative rounding drift. */
  moveSelectedFrom(origins: ReturnType<EditorStore["selectionPositions"]>, delta: { x: number; y?: number; z: number }, snap: boolean, snapAxes: GridAxis[] = ["x", "y", "z"]) {
    if (origins.some(p => this.isLocked(p.selection))) return;
    const changes = origins.map(p => {
      const object = this.selectedItem(p.selection)!;
      const position = { x: p.x + delta.x, y: p.y + (delta.y ?? 0), z: p.z + delta.z };
      const snapping = snap && (object.kind === "solid" || object.kind === "prefab");
      if (snapping)
        for (const axis of snapAxes) position[axis] = snapCoordinate(position[axis], this.grid.spacing);
      return { item: object.item, position: { ...position, y: snapping && snapAxes.includes("y") || p.hasY || delta.y !== undefined ? position.y : undefined } };
    }).filter(({ item, position }) => item.x !== position.x || item.y !== position.y || item.z !== position.z);
    if (!changes.length) return;
    if (changes.some(({ item }) => this.level.checkpoints.includes(item as CustomCheckpoint)))
      this.checkpointMoved = true;
    this.pushHistory(); for (const { item, position } of changes) Object.assign(item, position);
    this.emit();
  }
  snapSelectedToGrid(axes: GridAxis[] = ["x", "y", "z"]) {
    const changes = this.selectionPositions().filter(p => (p.selection.kind === "solid" || p.selection.kind === "prefab") && !this.isLocked(p.selection)).map(p => {
      const item = this.selectedItem(p.selection)!.item;
      const patch = Object.fromEntries(axes.map(axis => [axis, snapCoordinate(p[axis], this.grid.spacing)]));
      return { item, patch };
    }).filter(({ item, patch }) => Object.entries(patch).some(([axis, value]) => item[axis as GridAxis] !== value));
    if (!changes.length) return;
    this.pushHistory(); for (const { item, patch } of changes) Object.assign(item, patch);
    this.emit();
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
      selections: structuredClone(this.selections),
      selectionKindFilter: this.selectionKindFilter,
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
    // Renumber inside the closing gesture so drag + reorder undo together.
    if (this.checkpointMoved && this.gesture) this.renumberCheckpoints();
    this.checkpointMoved = false;
    this.gesture = null;
  }
  /** Reorder checkpoints by the auto-numbering chain, keeping selection. */
  renumberCheckpoints() {
    const before = this.level.checkpoints;
    if (before.length < 2) return;
    const ordered = orderCheckpoints(this.level);
    if (ordered.every((c, i) => c === before[i])) return;
    this.level.checkpoints = ordered;
    const remap = (sel: EditorSelection): EditorSelection =>
      sel?.kind === "checkpoint"
        ? { kind: "checkpoint", index: Math.max(0, ordered.indexOf(before[sel.index])) }
        : sel;
    this.selection = remap(this.selection);
    this.selections = this.selections.map(remap) as Selection[];
    this.emit();
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
    this.selections = prev.selections;
    this.selectionKindFilter = prev.selectionKindFilter;
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
    this.selections = next.selections;
    this.selectionKindFilter = next.selectionKindFilter;
    this.emit();
    return true;
  }
  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }
  private emit(touch = true) {
    if (!this.selection) this.selections = [];
    else if (!this.selections.some(s => selectionKey(s) === selectionKey(this.selection!))) {
      this.selections = [this.selection];
      this.selectionKindFilter = undefined;
    }
    this.selections = this.selections.filter(s => this.selectedItem(s));
    const selectedGroups = new Set(this.selections.map(s => this.selectedItem(s)?.item.group).filter(Boolean));
    if (selectedGroups.size) {
      const selectedKeys = new Set(this.selections.map(selectionKey));
      const items = this.allItems();
      this.selections = this.allEntries().filter((s, i) => selectedKeys.has(selectionKey(s)) || (!!items[i].group && selectedGroups.has(items[i].group)));
    }
    if (this.selectionKindFilter) this.selections = this.selections.filter(s => objectKindKey(this.selectedItem(s)!) === this.selectionKindFilter);
    this.solidSelection = this.selectedEntries().filter(s => s.kind === "solid").map(s => (s as { id: string }).id);
    if (touch) this.dirty = true;
    for (const listener of this.listeners) listener();
  }
  openBlank(name: string) {
    this.selections = []; this.selectionKindFilter = undefined;
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
    this.selections = []; this.selectionKindFilter = undefined;
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
  select(selection: EditorSelection, additive = false, includeLocked = false) {
    if (selection && this.isLocked(selection) && !includeLocked) return;
    this.selectionKindFilter = undefined;
    const members = selection ? this.membersOf(selection) : [];
    const keys = new Set(members.map(selectionKey));
    if (additive && selection) {
      this.selections = this.isSelected(selection)
        ? this.selectedEntries().filter(s => !keys.has(selectionKey(s)))
        : [...this.selectedEntries(), ...members];
      this.selection = this.selections.some(s => selectionKey(s) === selectionKey(selection)) ? selection : this.selections.at(-1) ?? null;
    } else {
      this.selections = members;
      this.selection = selection;
    }
    this.emit(false);
  }
  allEntries(): Selection[] {
    return [
      ...this.level.solids.map(s => ({ kind: "solid" as const, id: s.id })),
      ...this.level.prefabs.map(p => ({ kind: "prefab" as const, id: p.id })),
      ...this.level.checkpoints.map((_, index) => ({ kind: "checkpoint" as const, index })),
      ...this.targetList().map((_, index) => ({ kind: "target" as const, index })),
      ...(this.level.rings ?? []).map((_, index) => ({ kind: "ring" as const, index })),
      { kind: "spawn" },
    ];
  }
  private allItems() {
    return [...this.level.solids, ...this.level.prefabs, ...this.level.checkpoints, ...this.targetList(), ...(this.level.rings ?? []), this.level.spawn];
  }
  membersOf(selection: Selection): Selection[] {
    const group = this.selectedItem(selection)?.item.group;
    if (!group) return [selection];
    const items = this.allItems();
    return this.allEntries().filter((_, i) => items[i].group === group);
  }
  selectedEntries(): Selection[] {
    return this.selections.length ? this.selections : this.selection ? [this.selection] : [];
  }
  selectedGroup() {
    const entries = this.selectedEntries(), name = entries[0] && this.selectedItem(entries[0])?.item.group;
    if (!name || entries.some(s => this.selectedItem(s)?.item.group !== name)) return null;
    return { name, members: this.allEntries().filter(s => this.selectedItem(s)?.item.group === name) };
  }
  moveSelectedGroup(delta: Partial<{ x: number; y: number; z: number }>) {
    const group = this.selectedGroup();
    if (!group || Object.values(delta).some(value => !Number.isFinite(value))) return;
    this.moveSelectedFrom(this.selectionPositions(group.members), { x: delta.x ?? 0, y: delta.y, z: delta.z ?? 0 }, false);
    // Panel nudges run outside gestures: renumber now under the move's push.
    if (this.checkpointMoved && !this.gesture) this.renumberCheckpoints();
    this.checkpointMoved = false;
  }
  isSelected(selection: Selection) {
    return this.selectedEntries().some(s => selectionKey(s) === selectionKey(selection));
  }
  selectAllOfKind() {
    const current = this.selectedItem();
    if (!current) return;
    const key = objectKindKey(current);
    this.selectionKindFilter = key;
    const lockedGroups = new Set(this.allItems().filter(item => item.locked && item.group).map(item => item.group));
    this.selections = this.allEntries().filter(s => {
      const object = this.selectedItem(s)!;
      return !object.item.locked && !lockedGroups.has(object.item.group) && objectKindKey(object) === key;
    });
    this.selection = this.selections.find(s => selectionKey(s) === (this.selection && selectionKey(this.selection))) ?? this.selections[0] ?? null;
    this.emit(false);
  }
  setSelectionLocked(locked: boolean) {
    const selected = this.selectedEntries(), keys = new Set(selected.map(selectionKey));
    const groups = new Set(selected.map(s => this.selectedItem(s)?.item.group).filter(Boolean));
    const entries = this.allEntries().filter(s => keys.has(selectionKey(s)) || !!this.selectedItem(s)?.item.group && groups.has(this.selectedItem(s)!.item.group));
    if (!entries.length || entries.every(s => !!this.selectedItem(s)?.item.locked === locked)) return;
    this.pushHistory();
    for (const s of entries) this.selectedItem(s)!.item.locked = locked;
    this.emit();
  }
  /** Inspector edits assign the value to each object; viewport gestures retain relative transforms. */
  updateSelectionProperties(patch: Record<string, unknown>) {
    if (!validPrefabLightPatch(patch)) return;
    const entries = this.selectedEntries();
    if (!entries.length || entries.some(s => this.isLocked(s))) return;
    const objects = entries.map(s => this.selectedItem(s)!);
    const allowed = new Set(editableProperties(objects, this.level.mode).map(p => p.key));
    const changes = Object.fromEntries(Object.entries(patch).filter(([key, value]) => allowed.has(key) && (key !== "group" || value === undefined || typeof value === "string" && value.trim().length > 0 && value.length <= 80) && (typeof value !== "number" || Number.isFinite(value)) && objects.some(object => !Object.is(propertyValue(object, key, this.level), value))));
    if (!Object.keys(changes).length) return;
    this.pushHistory();
    for (const object of objects) {
      if (object.kind === "solid" && object.item.footprint) {
        const { w, d } = object.item;
        object.item.footprint = object.item.footprint.map(p => ({ x: p.x * (typeof changes.w === "number" ? changes.w / w : 1), z: p.z * (typeof changes.d === "number" ? changes.d / d : 1) }));
      }
      Object.assign(object.item, changes);
    }
    if (this.selectionKindFilter && this.selectedItem()) this.selectionKindFilter = objectKindKey(this.selectedItem()!);
    this.emit();
  }
  isLocked(selection: Selection) {
    const item = this.selectedItem(selection)?.item;
    return !!item?.locked || (!!item?.group && this.allItems().some(s => s.group === item.group && s.locked));
  }
  private uniqueGroup(base: string) {
    const taken = new Set(this.allItems().map(s => s.group));
    let name = base, n = 2;
    while (taken.has(name)) name = `${base.slice(0, 70)} ${n++}`;
    return name;
  }
  groupSelected(name = "Group") {
    const entries = this.selectedEntries();
    if (entries.length < 2 || entries.some(s => this.isLocked(s))) return;
    if (!name.trim() || name.length > 80) throw new Error("Group names must be 1-80 characters");
    const group = this.uniqueGroup(name.trim());
    this.pushHistory();
    for (const s of entries) this.selectedItem(s)!.item.group = group;
    this.emit();
    return group;
  }
  ungroupSelected() {
    const entries = this.selectedEntries();
    if (!entries.some(s => this.selectedItem(s)?.item.group) || entries.some(s => this.isLocked(s))) return;
    this.pushHistory();
    for (const s of entries) delete this.selectedItem(s)!.item.group;
    this.emit();
  }
  renameGroup(name: string) {
    name = name.trim();
    const group = this.selectedItem()?.item.group;
    if (!group || !name.trim() || name.length > 80 || name === group) return;
    if (this.allItems().some(s => s.group === name)) throw new Error("A group with this name already exists");
    this.pushHistory();
    for (const item of this.allItems()) if (item.group === group) item.group = name.trim();
    this.emit();
  }
  setLocked(selection: EditorSelection, locked: boolean) {
    const current = this.selectedItem(selection);
    if (!current || !selection) return;
    const entries = this.membersOf(selection);
    if (entries.every(s => !!this.selectedItem(s)?.item.locked === locked)) return;
    this.pushHistory();
    if (locked && entries.some(s => this.isSelected(s)))
      this.selection = null;
    for (const s of entries) this.selectedItem(s)!.item.locked = locked;
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
    const ids = this.selectedEntries().filter(s => s.kind === "solid").map(s => (s as { id: string }).id);
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
    this.selectionKindFilter = undefined;
    this.selections = result.retained.map(s => ({ kind: "solid", id: s.id }));
    this.selection = result.retained[0] ? { kind: "solid", id: result.retained[0].id } : null;
    this.clip = null; this.tool = "select"; this.emit();
    return true;
  }
  /**
   * Auto-clip candidates: 2+ shift-selected solids while the clip tool is
   * active, none belonging to a group. Sorted alphabetically (cutter order).
   */
  autoClipTargets(): CustomSolid[] | null {
    if (!this.clip) return null;
    const entries = this.selectedEntries();
    if (entries.some((s) => this.selectedItem(s)?.item.group)) return null;
    const solids = entries
      .filter((s) => s.kind === "solid")
      .map((s) => this.level.solids.find((x) => x.id === (s as { id: string }).id))
      .filter((s): s is CustomSolid => !!s);
    return solids.length >= 2 ? autoClipOrder(solids) : null;
  }
  autoClipPreview() {
    const targets = this.autoClipTargets();
    return targets
      ? previewAutoClip(this.level.solids, targets.map((s) => s.id))
      : null;
  }
  applyAutoClip() {
    const result = this.autoClipPreview();
    if (!result?.affected.length || result.issues.length) return false;
    this.pushHistory();
    this.level.solids = result.solids;
    this.solidSelection = result.retained.map((s) => s.id);
    this.selectionKindFilter = undefined;
    this.selections = result.retained.map(s => ({ kind: "solid", id: s.id }));
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
  addSolid(kind: SolidKind, placement: number | { x: number; y: number; z: number } = 0, z = 0): CustomSolid {
    this.pushHistory();
    const defaults = solidDefaults(kind);
    const taken = new Set(this.level.solids.map((s) => s.id));
    const nudge = this.level.solids.length * 2;
    const solid: CustomSolid = {
      id: this.nextId(kind, taken),
      kind,
      x: typeof placement === "number" ? placement + nudge : placement.x,
      y: typeof placement === "number" ? kind === "ground" ? -defaults.h / 2 : defaults.h / 2 : placement.y,
      z: typeof placement === "number" ? z : placement.z,
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
  addPrefab(kind: string, placement: number | { x: number; y: number; z: number } = 0, z = 0): CustomPrefab {
    this.pushHistory();
    const taken = new Set(this.level.prefabs.map((p) => p.id));
    // Explicit view-center placements land on the ground or road below them
    // instead of floating at the orbit height; hovering kinds keep their offset.
    const snappedY = typeof placement === "number" ? undefined
      : groundHeightAt(this.level, placement.x, placement.z) + (PREFAB_HOVER_HEIGHT[kind] ?? 0);
    const prefab: CustomPrefab = {
      id: this.nextId(kind, taken),
      kind,
      x: typeof placement === "number" ? placement : placement.x,
      z: typeof placement === "number" ? z : placement.z,
      ...(snappedY === undefined ? {} : { y: snappedY }),
      ...(kind === "birthday-candle" ? { resizeScale: 3 } : {}),
    };
    this.level.prefabs.push(prefab);
    this.selection = { kind: "prefab", id: prefab.id };
    this.emit();
    return prefab;
  }
  addCheckpoint(x = 0, z = 0): CustomCheckpoint {
    this.pushHistory();
    // New checkpoints start without a heading: yaw stays undefined
    // (automatic route direction) until the user sets it explicitly.
    // Auto-numbering: the new checkpoint is #1; the rest shift down.
    const point: CustomCheckpoint = { x, z };
    this.level.checkpoints.unshift(point);
    this.selection = { kind: "checkpoint", index: 0 };
    this.emit();
    return point;
  }
  /** Exclusive finish-line flag: setting one clears the previous designee. */
  setCheckpointFinish(index: number, value: boolean) {
    const target = this.level.checkpoints[index];
    if (!target) return;
    this.pushHistory();
    for (const c of this.level.checkpoints) delete c.finish;
    if (value) {
      target.finish = true;
      delete target.order;
    }
    this.renumberCheckpoints();
    this.selection = { kind: "checkpoint", index: this.level.checkpoints.indexOf(target) };
    this.emit();
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
  updateSelected(patch: Record<string, unknown>) {
    if (!validPrefabLightPatch(patch)) return;
    const current = this.selectedItem();
    if (!current || (this.selection && this.isLocked(this.selection))) return;
    this.pushHistory();
    const entries = this.selectedEntries();
    const old = { ...current.item };
    const dx = typeof patch.x === "number" ? patch.x - old.x : 0;
    const dy = typeof patch.y === "number" ? patch.y - (old.y ?? 0) : 0;
    const dz = typeof patch.z === "number" ? patch.z - old.z : 0;
    for (const s of entries) {
      const item = this.selectedItem(s)!.item;
      if (item === current.item) continue;
      item.x += dx; item.z += dz;
      if (dy) item.y = (item.y ?? 0) + dy;
    }
    // Rotate the whole selection about the primary object's origin.
    const orientation = (item: object) => { const p = item as { yaw?: number; angle?: number; roll?: number }; return new Quaternion().setFromEuler(new Euler(p.angle ?? 0, p.yaw ?? 0, p.roll ?? 0, "YXZ")); };
    if (["yaw", "angle", "roll"].some(k => typeof patch[k] === "number")) {
      const delta = orientation({ ...old, ...patch }).multiply(orientation(old).invert());
      for (const s of entries) {
        const item = this.selectedItem(s)!.item;
        if (item === current.item) continue;
        const v = new Vector3(item.x - old.x - dx, (item.y ?? 0) - (old.y ?? 0) - dy, item.z - old.z - dz).applyQuaternion(delta);
        item.x = old.x + dx + v.x; item.y = (old.y ?? 0) + dy + v.y; item.z = old.z + dz + v.z;
        if (s.kind === "solid" || s.kind === "prefab" || s.kind === "spawn" || s.kind === "checkpoint") {
          const e = new Euler().setFromQuaternion(delta.clone().multiply(orientation(item)), "YXZ");
          Object.assign(item, { yaw: e.y, angle: e.x, roll: e.z });
        }
      }
    }
    Object.assign(current.item, patch);
    if (
      (typeof patch.x === "number" || typeof patch.z === "number" || "order" in patch) &&
      entries.some((s) => s.kind === "checkpoint")
    )
      this.renumberCheckpoints();
    this.emit();
  }
  /** Uniform group scaling keeps articulated prefabs and relative placement intact. */
  scaleSelected(factor: number, pivot: { x: number; y: number; z: number }) {
    const selections = this.selectedEntries();
    if (!Number.isFinite(factor) || factor <= 0 || selections.some(s => this.isLocked(s))) return;
    for (const s of selections) {
      const current = this.selectedItem(s)!;
      if (current.kind === "prefab") factor = Math.max(0.01 / (current.item.resizeScale ?? 1), Math.min(factor, 100 / (current.item.resizeScale ?? 1)));
    }
    this.pushHistory();
    for (const s of selections) {
      const current = this.selectedItem(s)!, item = current.item;
      const y = current.kind === "prefab" ? prefabY(current.item) : item.y ?? (current.kind === "checkpoint" ? 2 : current.kind === "target" ? this.level.mode === "demolition" ? 1.5 : 1.7 : 0);
      item.x = pivot.x + (item.x - pivot.x) * factor;
      item.y = pivot.y + (y - pivot.y) * factor;
      item.z = pivot.z + (item.z - pivot.z) * factor;
      if (current.kind === "solid") {
        current.item.w *= factor; current.item.h *= factor; current.item.d *= factor;
        if (current.item.footprint) current.item.footprint = current.item.footprint.map(p => ({ x: p.x * factor, z: p.z * factor }));
      } else if (current.kind === "prefab") current.item.resizeScale = (current.item.resizeScale ?? 1) * factor;
      else if (current.kind === "ring") current.item.radius *= factor;
    }
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
      Pick<CustomLevel, "mode" | "limit" | "underground" | "forceNight" | "previewGameLighting"> & {
        gold: number;
        silver: number;
        bronze: number;
      }
    >,
  ) {
    this.pushHistory();
    if (patch.mode) this.level.mode = patch.mode;
    if (patch.underground !== undefined)
      this.level.underground = patch.underground;
    if (patch.forceNight !== undefined) this.level.forceNight = patch.forceNight;
    if (patch.previewGameLighting !== undefined) this.level.previewGameLighting = patch.previewGameLighting;
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
    const entries = this.selectedEntries().filter(s => s.kind !== "spawn");
    if (!entries.length || entries.some(s => this.isLocked(s))) return;
    this.pushHistory();
    const keys = new Set(entries.map(selectionKey));
    this.level.solids = this.level.solids.filter(s => !keys.has(`solid:${s.id}`));
    this.level.prefabs = this.level.prefabs.filter(s => !keys.has(`prefab:${s.id}`));
    this.level.checkpoints = this.level.checkpoints.filter((_, i) => !keys.has(`checkpoint:${i}`));
    if (this.level.rings) this.level.rings = this.level.rings.filter((_, i) => !keys.has(`ring:${i}`));
    const targets = this.targetList().filter((_, i) => !keys.has(`target:${i}`));
    if (this.level.mode === "demolition") this.level.demolish = targets;
    else this.level.collectibles = targets;
    this.selection = null;
    this.emit();
  }
  copySelected() {
    const entries = this.selectedEntries().filter(s => s.kind !== "spawn");
    if (!entries.length) return false;
    this.clipboard = entries.map(s => ({ kind: s.kind, item: structuredClone(this.selectedItem(s)!.item) }));
    this.pasteCount = 0;
    return true;
  }
  get canPaste() { return this.clipboard.length > 0; }
  private pasteItems(source: typeof this.clipboard, dx: number, dz: number) {
    if (!source.length || this.clip) return;
    this.pushHistory();
    const groups = new Map<string, string>();
    const selections: Selection[] = [];
    for (const entry of source) {
      const copy = structuredClone(entry.item);
      copy.x += dx; copy.z += dz;
      if (copy.group) {
        if (!groups.has(copy.group)) groups.set(copy.group, this.uniqueGroup(copy.group));
        copy.group = groups.get(copy.group)!;
      }
      let selection: Selection;
      if (entry.kind === "solid" || entry.kind === "prefab") {
        const list = entry.kind === "solid" ? this.level.solids : this.level.prefabs;
        const object = copy as CustomSolid | CustomPrefab;
        object.id = this.nextId(object.kind, new Set(list.map(s => s.id)));
        if (entry.kind === "solid") this.level.solids.push(object as CustomSolid);
        else this.level.prefabs.push(object as CustomPrefab);
        selection = { kind: entry.kind, id: object.id };
      } else if (entry.kind === "checkpoint" || entry.kind === "target" || entry.kind === "ring") {
        const list = entry.kind === "checkpoint" ? this.level.checkpoints : entry.kind === "ring" ? (this.level.rings ??= []) : this.targetList();
        list.push(copy as CustomRing);
        selection = { kind: entry.kind, index: list.length - 1 };
      } else continue;
      selections.push(selection);
    }
    this.selectionKindFilter = undefined;
    this.selections = selections;
    this.selection = selections[0] ?? null;
    this.emit();
    return this.selectedItem()?.item;
  }
  paste() {
    if (!this.canPaste || this.clip) return;
    this.pasteCount++;
    return this.pasteItems(this.clipboard, 2 * this.pasteCount, 2 * this.pasteCount);
  }
  duplicateSelected(): CustomSolid | CustomPrefab | CustomPoint | CustomRing | undefined {
    const entries = this.selectedEntries().filter(s => s.kind !== "spawn");
    if (entries.some(s => this.isLocked(s))) return;
    return this.pasteItems(entries.map(s => ({ kind: s.kind, item: this.selectedItem(s)!.item })), 2, 0);
  }
}
