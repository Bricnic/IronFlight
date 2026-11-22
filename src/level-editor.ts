import { partitionListKinds } from "./editor-list";
import { isPermanentNight } from "./weather";
import { prefabLightSettings } from "./prefab-lights";
import { degreesToRadians, radiansToDegrees } from "./editor-angles";
import { commonProperty, editableProperties, objectKindKey, objectKindLabel, type SelectedObject } from "./editor-properties";
import { EditorStore, selectionKey, type EditorSelection } from "./editor-state";
import { createEditorViewport } from "./editor-viewport";
import { defaultTextureFor } from "./course-view";
import { clipUnsupported, intersectRects, solidLabel, solidRect, validRect, type ClipRect } from "./editor-clip";
import {
  TEXTURE_IDS,
  PREFAB_KINDS,
  PROP_PREFAB_KINDS,
  COLLECTIBLE_KINDS,
  SOLID_KINDS,
  customTrackIds,
  toTrack,
  validateCustomLevel,
  type CustomCheckpoint,
  type CustomLevel,
  type SolidKind,
} from "./custom-level";
import {
  listLevels,
  saveLevel,
  loadLevel,
} from "./level-store";
import { officialFileTracks } from "./official-levels";
import {
  RANDOM_DEFAULTS,
  generateRandomLevel,
  nextAvailableName,
  type RandomLevelParams,
} from "./level-random";
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text = "",
) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text) node.textContent = text;
  return node;
}
function numberField(
  props: HTMLElement,
  label: string,
  prop: string,
  value: number | undefined,
  onCommit: (n: number) => void,
  mixed = false,
) {
  const angular = ["yaw", "angle", "roll"].includes(prop);
  const display = (n: number) => angular ? radiansToDegrees(n) : n;
  const row = el("label", { class: "prop-row" }, `${label}${angular ? " (°)" : ""} `);
  const input = el("input", {
    type: "number",
    step: "any",
    "data-prop": prop,
  }) as HTMLInputElement;
  if (mixed) input.placeholder = "(various)";
  else if (value !== undefined) input.value = String(display(value));
  input.addEventListener("change", () => {
    const n = parseFloat(input.value);
    if (Number.isFinite(n)) onCommit(angular ? degreesToRadians(n) : n);
    else input.value = value === undefined ? "" : String(display(value));
  });
  row.append(input);
  props.append(row);
  return input;
}
/** Traditional wireframe editing screen: list, viewport, properties. */
export function createLevelEditor(
  host: HTMLElement,
  onBack: () => void,
  onPlaytest: (id: `custom:${string}`) => void = () => {},
) {
  const store = new EditorStore("Untitled");
  const screen = el("main", { id: "level-editor" });
  screen.hidden = true;
  const top = el("div", { class: "editor-top" });
  const nameInput = el("input", {
    id: "editor-name",
    value: "Untitled",
    "aria-label": "Level name",
    maxlength: "64",
  }) as HTMLInputElement;
  const folderInput = el("input", {
    id: "editor-folder",
    value: "",
    "aria-label": "Save folder, relative to levels",
    placeholder: "Folder (optional)",
    maxlength: "200",
  }) as HTMLInputElement;
  folderInput.title =
    "Subdirectory under levels/ for this save, e.g. official/sweet-celebrations. Empty saves to the top level.";
  const levelPicker = el("select", {
    id: "editor-levels",
    "aria-label": "Open level",
  }) as HTMLSelectElement;
  const refreshLevelsButton = el(
    "button",
    {
      id: "editor-refresh-levels",
      title: "Reload the level list from disk",
      "aria-label": "Refresh levels from disk",
    },
    "Refresh",
  ) as HTMLButtonElement;
  const newButton = el("button", { id: "editor-new" }, "New");
  const saveButton = el("button", { id: "editor-save" }, "Save");
  const playtestButton = el("button", { id: "editor-playtest" }, "Playtest");
  const randomButton = el("button", { id: "editor-randomize" }, "Randomize");
  const undoButton = el("button", { id: "editor-undo" }, "Undo");
  const redoButton = el("button", { id: "editor-redo" }, "Redo");
  undoButton.addEventListener("click", () => store.undo());
  redoButton.addEventListener("click", () => store.redo());
  const backButton = el("button", { id: "editor-back" }, "Back");
  const frameButton = el("button", { id: "editor-frame-selection" }, "Frame selection");
  const toolButtons = (
    ["select", "pan", "eyedropper", "rotator", "resize", "clip", "look"] as const
  ).map((tool) => {
    const button = el(
      "button",
      { id: `editor-tool-${tool}` },
      tool[0].toUpperCase() + tool.slice(1),
    ) as HTMLButtonElement;
    if (tool === "clip") button.title = "Clip selected horizontal solids, including tiles. Shift/Ctrl click list rows to select several.";
    if (tool === "resize") button.title = "Drag the nearest edge or corner of the clicked face to resize. The opposite edge stays fixed.";
    if (tool === "look") button.title = "Point the selected prefab at the cursor. Click the viewport to finish.";
    button.addEventListener("click", () => store.setTool(tool));
    return { tool, button };
  });
  const previewButton = el(
    "button",
    { id: "editor-preview" },
    "Preview",
  ) as HTMLButtonElement;
  previewButton.addEventListener("click", () =>
    store.setPreview(!store.preview),
  );
  const status = el("span", { id: "editor-status" });
  const error = el("span", { id: "editor-error", role: "alert" });
  top.append(
    nameInput,
    folderInput,
    levelPicker,
    refreshLevelsButton,
    newButton,
    saveButton,
    playtestButton,
    randomButton,
    undoButton,
    redoButton,
    backButton,
    ...toolButtons.map(({ button }) => button),
    previewButton,
    status,
    error,
  );
  const body = el("div", { class: "editor-body" });
  const listPane = el("div", { class: "editor-list" });
  const solidKind = el("select", {
    id: "editor-solid-kind",
    "aria-label": "Solid kind",
  }) as HTMLSelectElement;
  for (const kind of SOLID_KINDS) solidKind.append(el("option", { value: kind }, kind));
  const addSolid = el("button", { id: "editor-add-solid" }, "Add solid");
  const prefabKind = el("select", {
    id: "editor-prefab-kind",
    "aria-label": "Prefab kind",
  }) as HTMLSelectElement;
  for (const kind of [...PREFAB_KINDS].sort())
    prefabKind.append(el("option", { value: kind }, kind));
  const addPrefab = el("button", { id: "editor-add-prefab" }, "Add prefab");
  const addCheckpoint = el("button", { id: "editor-add-checkpoint" }, "Add checkpoint");
  const addTarget = el("button", { id: "editor-add-target" }, "Add collectible");
  const addRing = el("button", { id: "editor-add-ring" }, "Add stunt ring");
  addRing.title = "Place a large ring to jump or drive through";
  const objects = el("ul", { id: "editor-objects" });
  const duplicateButton = el("button", { id: "editor-duplicate" }, "Duplicate");
  const groupButton = el("button", { id: "editor-group" }, "Group");
  const ungroupButton = el("button", { id: "editor-ungroup" }, "Ungroup");
  const copyButton = el("button", { id: "editor-copy" }, "Copy");
  const pasteButton = el("button", { id: "editor-paste" }, "Paste");
  copyButton.title = "Copy selected items (Ctrl+C)";
  pasteButton.title = "Paste copied items (Ctrl+V)";
  const groupActions = el("div", { class: "editor-group-actions" });
  groupActions.append(groupButton, ungroupButton, copyButton, pasteButton);
  const removeButton = el("button", { id: "editor-remove" }, "Delete selected");
  const spawnButton = el("button", { id: "editor-select-spawn" }, "Edit spawn");
  listPane.append(
    solidKind,
    addSolid,
    prefabKind,
    addPrefab,
    addCheckpoint,
    addTarget,
    addRing,
    groupActions,
    duplicateButton,
    removeButton,
    spawnButton,
    el("p", { class: "prop-hint" }, "Shift/Ctrl-click items to select several. Groups move and lock together."),
    objects,
  );
  const viewportHost = el("div", { class: "editor-viewport" });
  const props = el("div", { class: "editor-props", id: "editor-props" });
  body.append(listPane, viewportHost, props);
  const unsaved = el("div", { id: "editor-unsaved", class: "editor-modal" });
  unsaved.hidden = true;
  const unsavedBox = el("div", { class: "editor-modal-box" });
  unsavedBox.append(
    el("p", {}, "Unsaved changes. Save before leaving?"),
    el("button", { id: "editor-unsaved-save" }, "Save"),
    el("button", { id: "editor-unsaved-discard" }, "Discard"),
    el("button", { id: "editor-unsaved-cancel" }, "Cancel"),
  );
  unsaved.append(unsavedBox);
  const randomModal = el("div", { id: "editor-random-modal", class: "editor-modal" });
  randomModal.hidden = true;
  const randomBox = el("div", { class: "editor-modal-box column" });
  const randomField = (
    label: string,
    id: string,
    type: string,
    value: string,
    extra: Record<string, string> = {},
  ) => {
    const row = el("label", { class: "prop-row" }, `${label} `);
    const input = el("input", { id, type, value, ...extra }) as HTMLInputElement;
    row.append(input);
    randomBox.append(row);
    return input;
  };
  const randomCheckpoints = randomField("Checkpoints", "editor-random-checkpoints", "number", String(RANDOM_DEFAULTS.checkpoints), { min: "1", max: "20" });
  const randomLethals = randomField("Lethal prefabs", "editor-random-lethals", "number", String(RANDOM_DEFAULTS.lethals), { min: "0", max: "100" });
  const randomBlocking = randomField("Blocking path %", "editor-random-blocking", "number", String(RANDOM_DEFAULTS.blockingPercent), { min: "0", max: "100" });
  const randomDecor = randomField("Decor prefabs", "editor-random-decor", "number", String(RANDOM_DEFAULTS.decor), { min: "0", max: "100" });
  const themeRow = el("label", { class: "prop-row" }, "Theme ");
  const randomTheme = el("select", { id: "editor-random-theme" }) as HTMLSelectElement;
  for (const [value, label] of [
    ["random", "Random"],
    ["toys", "Toys"],
    ["christmas", "Christmas"],
    ["ice", "Ice"],
    ["carnival", "Carnival"],
    ["dungeon", "Dungeon"],
  ])
    randomTheme.append(el("option", { value }, label));
  randomTheme.value = RANDOM_DEFAULTS.theme;
  themeRow.append(randomTheme);
  randomBox.append(themeRow);
  const randomWidth = randomField("Width", "editor-random-width", "number", String(RANDOM_DEFAULTS.width), { min: "150", max: "1000" });
  const randomLength = randomField("Length", "editor-random-length", "number", String(RANDOM_DEFAULTS.length), { min: "150", max: "1000" });
  const randomName = randomField("Name", "editor-random-name", "text", RANDOM_DEFAULTS.name, { maxlength: "64" });
  const randomError = el("span", { id: "editor-random-error", role: "alert" });
  const randomActions = el("div", { class: "editor-modal-actions" });
  const randomGenerate = el("button", { id: "editor-random-generate" }, "Generate");
  const randomCancel = el("button", { id: "editor-random-cancel" }, "Cancel");
  randomActions.append(randomGenerate, randomCancel);
  randomBox.append(randomError, randomActions);
  randomModal.append(randomBox);
  screen.append(top, body, unsaved, randomModal);
  host.append(screen);
  const viewport = createEditorViewport(viewportHost, store);
  top.append(frameButton);
  frameButton.addEventListener("click", () => viewport.frameSelection());
  const showError = (message: string) => {
    error.textContent = message;
  };
  const showStatus = (message: string) => {
    status.textContent = message;
    if (message) showError("");
  };
  function refreshLevels() {
    return listLevels()
      .then((names) => {
        // Picker order is its own concern: the store union is disk-first,
        // the dropdown reads a-z like the object list, grouped by folder
        // at any depth (generalized recursive subdirectories).
        const sorted = [...names].sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
        );
        const selected = levelPicker.value;
        levelPicker.innerHTML = "";
        levelPicker.append(el("option", { value: "" }, "Open level…"));
        const groups = new Map<string, string[]>();
        for (const name of sorted) {
          const slash = name.lastIndexOf("/");
          const folder = slash < 0 ? "" : name.slice(0, slash);
          if (!groups.has(folder)) groups.set(folder, []);
          groups.get(folder)!.push(name);
        }
        const orderedFolders = [...groups.keys()].sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
        );
        // Top-level entries stay ungrouped; every nested folder gets its own group.
        for (const name of groups.get("") ?? [])
          levelPicker.append(el("option", { value: name }, name));
        for (const folder of orderedFolders) {
          if (!folder) continue;
          const group = document.createElement("optgroup");
          group.label = folder;
          for (const name of groups.get(folder)!)
            group.append(el("option", { value: name }, name.slice(folder.length + 1)));
          levelPicker.append(group);
        }
        if (sorted.includes(selected)) levelPicker.value = selected;
      })
      .catch((e: Error) => showError(e.message));
  }
  function refreshClipProps() {
    const session = store.clip!;
    props.append(
      el("h3", {}, "Clip solids"),
      el(
        "p",
        {},
        "Draw a rectangle in the viewport (Shift adds a cutter). Numeric bounds are in world metres. Click list rows to include layers. Escape cancels.",
      ),
    );
    const source = store.level.solids.find((s) => session.targets.includes(s.id));
    const fallback = source
      ? {
          minX: source.x - source.w / 4,
          maxX: source.x + source.w / 4,
          minZ: source.z - source.d / 4,
          maxZ: source.z + source.d / 4,
        }
      : { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
    const bounds = session.cutters.at(-1) ?? fallback;
    const fields = {} as Record<keyof ClipRect, HTMLInputElement>;
    for (const key of ["minX", "maxX", "minZ", "maxZ"] as const) {
      const label = el("label", { class: "prop-row" }, key);
      const input = el("input", {
        id: `editor-clip-${key}`,
        type: "number",
        step: "any",
        "aria-label": `Clip ${key}`,
      }) as HTMLInputElement;
      input.value = String(bounds[key]);
      fields[key] = input;
      label.append(input);
      props.append(label);
    }
    const commitBounds = (append: boolean) => {
      const r = Object.fromEntries(
        Object.entries(fields).map(([k, input]) => [
          k,
          input.value === "" ? NaN : Number(input.value),
        ]),
      ) as ClipRect;
      if (!validRect(r)) {
        showError("Enter finite bounds with minX < maxX and minZ < maxZ");
        return;
      }
      store.setClipCutters(
        append ? [...session.cutters, r] : [...session.cutters.slice(0, -1), r],
      );
    };
    const numeric = el("button", { id: "editor-clip-preview" }, "Preview bounds");
    numeric.addEventListener("click", () => commitBounds(false));
    const append = el("button", { id: "editor-clip-add-cutter" }, "Add cutter");
    append.addEventListener("click", () => commitBounds(true));
    props.append(numeric, append);
    const cutter = el("select", {
      id: "editor-clip-object",
      "aria-label": "Cutter object",
    }) as HTMLSelectElement;
    for (const s of store.level.solids) {
      if ((s.yaw ?? 0) || (s.angle ?? 0) || (s.roll ?? 0)) continue;
      cutter.append(el("option", { value: s.id }, s.name ?? s.id));
    }
    cutter.value =
      session.cutterId ??
      (store.selection?.kind === "solid"
        ? store.selection.id
        : (cutter.options[0]?.value ?? ""));
    const use = el(
      "button",
      { id: "editor-clip-use-object" },
      "Use selected object as cutter",
    );
    use.addEventListener("click", () => {
      const s = store.level.solids.find((s) => s.id === cutter.value);
      if (!s || !validRect(solidRect(s))) {
        showError(
          "Choose an axis-aligned cutter with finite positive dimensions",
        );
        return;
      }
      store.setClipCutters([solidRect(s)], s.id);
    });
    props.append(
      cutter,
      use,
      el(
        "p",
        {},
        "The cutter object stays intact. A through-cut opens collision space at every selected height; no pit bottom is added.",
      ),
    );
    const result = store.clipPreview();
    props.append(
      el(
        "p",
        { id: "editor-clip-summary", role: "status" },
        `${session.cutters.length} cutters · ${result?.affected.length ?? 0} affected solids · ${result?.retained.length ?? 0} retained pieces`,
      ),
    );
    if (result?.slivers)
      props.append(
        el("p", {}, `Warning: ${result.slivers} slivers narrower than 1 cm`),
      );
    for (const issue of result?.issues ?? [])
      props.append(el("p", { class: "clip-issue" }, issue));
    props.append(el("h3", {}, "Overlapping layers"));
    const layers = el("div", { id: "editor-clip-layers" });
    for (const s of store.level.solids) {
      // Rotated solids are listed as unsupported, never subtracted by bounds.
      if (
        !session.targets.includes(s.id) &&
        !session.cutters.some((c) => intersectRects(solidRect(s), c)) &&
        !((s.yaw || s.angle || s.roll) && session.cutters.length)
      )
        continue;
      const row = el("label", { class: "clip-layer" });
      const input = el("input", {
        type: "checkbox",
        "aria-label": `Clip target ${s.name ?? s.id}`,
      }) as HTMLInputElement;
      input.checked = session.targets.includes(s.id);
      const reason = clipUnsupported(s);
      input.disabled = !!reason || session.cutterId === s.id;
      input.addEventListener("change", () =>
        store.setClipTarget(s.id, input.checked),
      );
      row.append(
        input,
        document.createTextNode(
          `${s.name ?? s.id} · Y ${s.y} · ${session.cutterId === s.id ? "cutter (kept)" : (reason ?? (input.checked ? "will cut" : "not selected — remains in place"))}`,
        ),
      );
      layers.append(row);
    }
    props.append(layers);
    const auto = store.autoClipPreview();
    if (auto) {
      const names = auto.order.map(
        (id) => solidLabel(store.level.solids.find((s) => s.id === id)!),
      );
      props.append(
        el(
          "p",
          { id: "editor-clip-auto-summary", role: "status" },
          `Auto clip (${names.join(" → ")}): ${auto.affected.length} affected solids · ${auto.retained.length} retained pieces`,
        ),
      );
      for (const issue of auto.issues)
        props.append(el("p", { class: "clip-issue" }, issue));
      const autoButton = el(
        "button",
        { id: "editor-clip-auto" },
        "Auto clip",
      ) as HTMLButtonElement;
      autoButton.disabled = !auto.affected.length || !!auto.issues.length;
      autoButton.title = auto.issues.length
        ? auto.issues[0]
        : !auto.affected.length
          ? "Selected solids do not overlap"
          : "Clip the selected solids against each other in name order";
      autoButton.addEventListener("click", () => {
        if (!store.applyAutoClip())
          showError(auto.issues[0] ?? "Selected solids do not overlap");
      });
      props.append(autoButton);
    }
    const apply = el(
      "button",
      { id: "editor-clip-apply" },
      "Apply",
    ) as HTMLButtonElement;
    apply.disabled = !result?.affected.length || !!result.issues.length;
    apply.addEventListener("click", () => store.applyClip());
    const cancel = el("button", { id: "editor-clip-cancel" }, "Cancel");
    cancel.addEventListener("click", () => store.cancelClip());
    props.append(apply, cancel);
  }
  function selectionControls(current: SelectedObject) {
    const entries = store.selectedEntries();
    const allLocked = entries.every(s => store.isLocked(s));
    const actions = el("div", { class: "editor-selection-actions" });
    const lock = el("button", { id: "editor-selection-lock" }, allLocked ? "Unlock selected" : "Lock selected");
    lock.addEventListener("click", () => store.setSelectionLocked(!allLocked));
    const selectKind = el("button", { id: "editor-select-kind", title: `Select all ${objectKindLabel(objectKindKey(current))}` }, "Select all of this kind");
    selectKind.addEventListener("click", () => store.selectAllOfKind());
    actions.append(lock, selectKind); props.append(actions);
  }
  function bulkProps(selected: SelectedObject[]) {
    props.append(el("h3", {}, `${selected.length} objects selected`));
    const kinds = new Set(selected.map(objectKindKey));
    props.append(el("p", { class: "prop-hint", "data-selection-kind": "" }, `Kind: ${kinds.size === 1 ? objectKindKey(selected[0]).split(":").at(-1) : "(various)"}`));
    const locked = store.selectedEntries().some(s => store.isLocked(s));
    const group = store.selectedGroup(), center = group && viewport.groupCenter(group.name);
    if (group && center) {
      props.append(el("h3", {}, "Group location"));
      props.append(el("p", { class: "prop-hint" }, "Center of the whole group. Position changes move every member together."));
      for (const axis of ["x", "y", "z"] as const)
        numberField(props, axis.toUpperCase(), axis, center[axis], value => {
          const current = viewport.groupCenter(group.name);
          if (current && store.selectedGroup()?.name === group.name) store.moveSelectedGroup({ [axis]: value - current[axis] });
        }).disabled = locked;
    }
    for (const field of editableProperties(selected, store.level.mode)) {
      if (center && ["x", "y", "z"].includes(field.key)) continue;
      const { value, mixed } = commonProperty(selected, field.key, store.level);
      const commit = (value: unknown) => store.updateSelectionProperties({ [field.key]: value });
      if (!field.type) {
        numberField(props, field.label, field.key, mixed ? undefined : value as number | undefined, commit, mixed).disabled = locked;
        continue;
      }
      const row = el("label", { class: "prop-row" }, `${field.label} `);
      if (field.type === "text") {
        const input = el("input", { type: "text", "data-prop": field.key, "aria-label": "Group name", maxlength: "80" }) as HTMLInputElement;
        input.value = mixed ? "" : String(value ?? ""); input.placeholder = mixed ? "(various)" : "(none)"; input.disabled = locked;
        input.addEventListener("change", () => commit(input.value.trim() || undefined)); row.append(input);
      } else if (field.type === "choice" || field.type === "boolean") {
        const select = el("select", { "data-prop": field.key }) as HTMLSelectElement;
        if (mixed) select.append(el("option", { value: "__various__", disabled: "" }, "(various)"));
        if (field.type === "boolean") {
          select.append(el("option", { value: "false" }, "No"), el("option", { value: "true" }, "Yes"));
        } else {
          if (field.key === "texture") select.append(el("option", { value: "" }, "(default)"));
          for (const option of field.options ?? []) select.append(el("option", { value: option }, option));
        }
        select.value = mixed ? "__various__" : String(value ?? "");
        select.disabled = locked;
        select.addEventListener("change", () => commit(field.type === "boolean" ? select.value === "true" : select.value || undefined));
        row.append(select);
      } else {
        const input = el("input", { type: "text", "data-prop": field.key, "aria-label": "Color", placeholder: "(various)" }) as HTMLInputElement;
        const hex = typeof value === "number" ? `#${value.toString(16).padStart(6, "0")}` : "#ffffff";
        input.value = mixed ? "" : hex; input.disabled = locked;
        input.addEventListener("change", () => {
          if (/^#[0-9a-f]{6}$/i.test(input.value)) commit(parseInt(input.value.slice(1), 16));
          else input.value = mixed ? "" : hex;
        });
        const picker = el("input", { type: "color", "aria-label": "Choose color for selection", value: hex }) as HTMLInputElement;
        picker.disabled = locked; picker.addEventListener("change", () => commit(parseInt(picker.value.slice(1), 16)));
        const controls = el("span", { class: "editor-bulk-color" }); controls.append(input, picker); row.append(controls);
      }
      props.append(row);
    }
  }
  const openSettings = new Set<string>();
  function settingsPanel(title: string, id: string) {
    const details = el("details", { id, class: "editor-settings" });
    details.open = openSettings.has(id);
    details.append(el("summary", {}, title));
    details.addEventListener("toggle", () => {
      if (!details.isConnected) return;
      if (details.open) openSettings.add(id); else openSettings.delete(id);
    });
    props.append(details); return details;
  }
  function refreshProps() {
    props.innerHTML = "";
    if (store.clip) { refreshClipProps(); return; }
    const level = store.level;
    const section = (title: string) => {
      props.append(el("h3", {}, title));
    };
    const levelProps = settingsPanel("Level", "editor-level-settings");
    const modeRow = el("label", { class: "prop-row" }, "Mode ");
    const mode = el("select", { "data-prop": "mode" }) as HTMLSelectElement;
    for (const m of ["race", "arena", "demolition"])
      mode.append(el("option", { value: m }, m));
    mode.value = level.mode;
    mode.addEventListener("change", () =>
      store.updateLevel({ mode: mode.value as CustomLevel["mode"] }),
    );
    modeRow.append(mode);
    levelProps.append(modeRow);
    numberField(levelProps, "Gold", "gold", level.medals.gold, (n) =>
      store.updateLevel({ gold: n }),
    );
    numberField(levelProps, "Silver", "silver", level.medals.silver, (n) =>
      store.updateLevel({ silver: n }),
    );
    numberField(levelProps, "Bronze", "bronze", level.medals.bronze, (n) =>
      store.updateLevel({ bronze: n }),
    );
    numberField(levelProps, "Limit", "limit", level.limit, (n) =>
      store.updateLevel({ limit: n }),
    );
    const clearLimit = el("button", { id: "editor-clear-limit" }, "No limit");
    clearLimit.addEventListener("click", () =>
      store.updateLevel({ limit: Number.NaN }),
    );
    levelProps.append(clearLimit);
    const undergroundRow = el("label", { class: "prop-row" }, "Underground ");
    const underground = el("input", {
      type: "checkbox",
      "data-prop": "underground",
    }) as HTMLInputElement;
    underground.checked = !!level.underground;
    underground.addEventListener("change", () =>
      store.updateLevel({ underground: underground.checked }),
    );
    undergroundRow.append(underground);
    levelProps.append(undergroundRow);
    for (const [key, label, checked] of [
      ["previewGameLighting", "Preview game lighting", !!level.previewGameLighting],
      ["forceNight", "Force night", isPermanentNight(level.backgroundTemplate, level.forceNight)],
    ] as const) {
      const row = el("label", { class: "prop-row" }, label + " ");
      const input = el("input", { type: "checkbox", "data-prop": key }) as HTMLInputElement;
      input.checked = checked;
      input.addEventListener("change", () => store.updateLevel({ [key]: input.checked }));
      row.append(input); levelProps.append(row);
    }
    const worldProps = settingsPanel("World grid", "editor-world-settings");
    const spacingRow = el("label", { class: "prop-row" }, "Spacing ");
    const spacing = el("input", { id: "editor-grid-spacing", type: "number", min: "0.01", step: "any", value: String(store.grid.spacing) }) as HTMLInputElement;
    spacing.addEventListener("change", () => { store.updateGrid({ spacing: Number(spacing.value) }); spacing.value = String(store.grid.spacing); });
    spacingRow.append(spacing); worldProps.append(spacingRow);
    for (const [key, label] of [["show", "Show world grid"], ["snap", "Snap to world grid"], ["x", "Draw X lines (red)"], ["y", "Draw Y lines (green)"], ["z", "Draw Z lines (blue)"]] as const) {
      const row = el("label", { class: "prop-row" }, label + " ");
      const input = el("input", { id: `editor-grid-${key}`, type: "checkbox" }) as HTMLInputElement;
      input.checked = store.grid[key]; input.addEventListener("change", () => store.updateGrid({ [key]: input.checked }));
      row.append(input); worldProps.append(row);
    }
    const snappable = store.selectedEntries().some(s => (s.kind === "solid" || s.kind === "prefab") && !store.isLocked(s));
    if (snappable) {
      const buttons = el("div", { class: "editor-group-actions" });
      for (const [key, label, axes] of [["all", "Snap XYZ", ["x", "y", "z"]], ["x", "Snap X", ["x"]], ["y", "Snap Y", ["y"]], ["z", "Snap Z", ["z"]]] as const) {
        const button = el("button", { id: `editor-snap-${key}` }, label);
        button.addEventListener("click", () => store.snapSelectedToGrid([...axes])); buttons.append(button);
      }
      props.append(buttons);
    }
    const current = store.selectedItem();
    if (!current) {
      props.append(el("p", { class: "prop-hint" }, "Select an object to edit it."));
      return;
    }
    selectionControls(current);
    const selected = store.selectedEntries().map(s => store.selectedItem(s)!).filter(Boolean);
    if (selected.length > 1 || store.selectedGroup()) { bulkProps(selected); return; }
    if (current.item.group) {
      const groupRow = el("label", { class: "prop-row" }, "Group ");
      const groupName = el("input", { type: "text", "aria-label": "Group name", maxlength: "80" });
      groupName.value = current.item.group;
      groupName.disabled = !!store.selection && store.isLocked(store.selection);
      groupName.addEventListener("change", () => {
        try { store.renameGroup(groupName.value); } catch (e) { showError((e as Error).message); }
      });
      groupRow.append(groupName); props.append(groupRow);
      props.append(el("p", { class: "prop-hint" }, `${store.selectedEntries().length} selected items move, rotate, copy and delete together.`));
    }
    section(
      current.kind === "solid"
        ? `Solid ${current.item.id}`
        : current.kind === "prefab"
          ? `Prefab ${current.item.id}`
          : current.kind === "spawn"
            ? "Spawn"
            : current.kind === "target"
              ? level.mode === "demolition"
                ? "Demolition target"
                : (current.item as { kind?: string }).kind === "chest"
                  ? "Treasure chest"
                  : "Ring collectible"
              : current.kind === "ring"
                ? "Ring"
                : "Checkpoint",
    );
    const item = current.item as Record<
      string,
      number | string | boolean | undefined
    >;
    if (current.kind === "solid") props.append(el("p", { class: "prop-hint" }, `Kind: ${current.item.kind}`));
    const commit = (prop: string) => (n: number) =>
      store.updateSelected({ [prop]: n });
    const objectControlsStart = props.children.length;
    const objectNameRow = el("label", { class: "prop-row" }, "Name ");
    const objectName = el("input", { type: "text", "data-prop": "name", "aria-label": "Object name", maxlength: "80" });
    objectName.value = current.item.name ?? ("id" in current.item ? current.item.id : "");
    objectName.placeholder = "Automatic name";
    objectName.addEventListener("change", () => store.renameSelected(objectName.value));
    objectNameRow.append(objectName); props.append(objectNameRow);
    for (const key of ["x", "y", "z"]) {
      // Optional heights have their own field below, even when already set.
      if (
        key === "y" && ["prefab", "checkpoint", "target"].includes(current.kind)
      ) continue;
      if (!(key in item)) continue;
      numberField(props, key.toUpperCase(), key, item[key] as number, commit(key));
    }
    if (current.kind === "spawn")
      numberField(props, "Yaw", "yaw", item.yaw as number, commit("yaw"));
    if (current.kind === "solid") {
      for (const key of ["w", "h", "d"])
        numberField(props, key.toUpperCase(), key, item[key] as number, commit(key));
      numberField(props, "Yaw", "yaw", item.yaw as number | undefined, commit("yaw"));
      numberField(props, "Pitch", "angle", item.angle as number | undefined, commit("angle"));
      numberField(props, "Roll", "roll", item.roll as number | undefined, commit("roll"));
      const colorRow = el("label", { class: "prop-row" }, "Color ");
      const color = el("input", {
        type: "color",
        "data-prop": "color",
        value: `#${(item.color as number).toString(16).padStart(6, "0")}`,
      }) as HTMLInputElement;
      color.addEventListener("change", () =>
        store.updateSelected({ color: parseInt(color.value.slice(1), 16) }),
      );
      colorRow.append(color);
      props.append(colorRow);
      const texRow = el("label", { class: "prop-row" }, "Texture ");
      const tex = el("select", { "data-prop": "texture" }) as HTMLSelectElement;
      const fallback =
        item.texture == null
          ? defaultTextureFor(`custom:${store.level.name}`, current.item)
          : undefined;
      tex.append(
        el("option", { value: "" }, fallback ? `(default: ${fallback})` : "(none)"),
      );
      for (const id of TEXTURE_IDS) tex.append(el("option", { value: id }, id));
      tex.value = (item.texture as string | undefined) ?? "";
      tex.addEventListener("change", () =>
        store.updateSelected({ texture: tex.value || undefined }),
      );
      texRow.append(tex);
      props.append(texRow);
    }
    if (current.kind === "prefab" || current.kind === "solid") {
      const light = prefabLightSettings(current.item);
      const lumens = numberField(props, "Light (lumens)", "lightLumens", light.lumens, commit("lightLumens"));
      lumens.min = "0";
      const lightRow = el("label", { class: "prop-row" }, "Light color ");
      const lightColor = el("input", { type: "color", "data-prop": "lightColor", value: `#${light.color.toString(16).padStart(6, "0")}` }) as HTMLInputElement;
      lightColor.addEventListener("change", () => store.updateSelected({ lightColor: parseInt(lightColor.value.slice(1), 16) }));
      lightRow.append(lightColor); props.append(lightRow);
    }
    if (current.kind === "prefab") {
      numberField(props, "Size", "resizeScale", (item.resizeScale as number | undefined) ?? 1, commit("resizeScale"));
      props.append(el("p", { class: "prop-hint" }, "Prefab resizing preserves proportions and updates gameplay size."));
      props.append(
        el("p", { class: "prop-hint" }, `Kind: ${current.item.kind}`),
      );
      numberField(props, "Y", "y", item.y as number | undefined, commit("y"));
      const isProp = (PROP_PREFAB_KINDS as readonly string[]).includes(
        current.item.kind,
      );
      // Every prefab kind carries an editable yaw; pitch/roll stay prop-only.
      numberField(
        props,
        "Yaw",
        "yaw",
        item.yaw as number | undefined,
        commit("yaw"),
      );
      if (isProp) {
        numberField(
          props,
          "Pitch",
          "angle",
          item.angle as number | undefined,
          commit("angle"),
        );
        numberField(
          props,
          "Roll",
          "roll",
          item.roll as number | undefined,
          commit("roll"),
        );
      }
    }
    if (current.kind === "checkpoint" || current.kind === "target") {
      const defaultY = current.kind === "checkpoint" ? 2 : level.mode === "demolition" ? 1.5 : 1.7;
      numberField(props, "Y", "y", (item.y as number | undefined) ?? defaultY, commit("y"));
    }
    if (current.kind === "checkpoint") {
      const yaw = numberField(props, "Yaw", "yaw", item.yaw as number | undefined, commit("yaw"));
      yaw.placeholder = "Automatic (route direction)";
    }
    if (current.kind === "target" && level.mode !== "demolition") {
      const typeRow = el("label", { class: "prop-row" }, "Type ");
      const type = el("select", { "data-prop": "kind" }) as HTMLSelectElement;
      for (const kind of COLLECTIBLE_KINDS)
        type.append(el("option", { value: kind }, kind));
      type.value = (item.kind as string | undefined) ?? "ring";
      type.addEventListener("change", () =>
        store.updateSelected({ kind: type.value }),
      );
      typeRow.append(type);
      props.append(typeRow);
    }
    if (current.kind === "ring") {
      numberField(
        props,
        "Radius",
        "radius",
        item.radius as number,
        commit("radius"),
      );
      const goalRow = el("label", { class: "prop-row" }, "Goal ");
      const goal = el("input", {
        type: "checkbox",
        "data-prop": "goal",
      }) as HTMLInputElement;
      goal.checked = item.goal as boolean;
      goal.addEventListener("change", () =>
        store.updateSelected({ goal: goal.checked }),
      );
      goalRow.append(goal);
      props.append(goalRow);
    }
    if (store.selection && store.isLocked(store.selection)) {
      for (const row of Array.from(props.children).slice(objectControlsStart)) row.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select").forEach(input => input.disabled = true);
    }
  }
  const expandedGroups = new Set<string>();
  const expandedKinds = new Set<string>();
  function refreshList() {
    objects.innerHTML = "";
    const level = store.level;
    const rows: { li: HTMLLIElement; name: string; key: string; kindKey?: string; count: number }[] = [];
    const selectedKeys = new Set(store.selectedEntries().map(selectionKey));
    const groups = new Map<string, { selection: NonNullable<EditorSelection>; rows: typeof rows; count: number; locked: boolean; selected: boolean; groupName: string; kindKey: string }>();
    const row = (
      label: string,
      selected: boolean,
      selection: EditorSelection,
      key: string,
    ) => {
      const item = store.selectedItem(selection)?.item;
      const locked = !!item?.locked;
      label = item?.name ?? label;
      let bucket: ReturnType<typeof groups.get>;
      if (item?.group && selection && !store.clip) {
        const kindKey = objectKindKey(store.selectedItem(selection)!);
        const bucketKey = `${item.group}:${kindKey}`;
        bucket = groups.get(bucketKey);
        if (!bucket) {
          bucket = { selection, rows: [], count: 0, locked: false, selected: false, groupName: item.group, kindKey };
          groups.set(bucketKey, bucket);
        }
        bucket.count++; bucket.locked ||= locked;
        bucket.selected ||= selectedKeys.has(selectionKey(selection));
        if (!expandedGroups.has(item.group)) return;
      }
      if (!store.clip) selected = !!selection && selectedKeys.has(selectionKey(selection));
      const onPick = (event: MouseEvent | KeyboardEvent) => {
        if (store.clip) {
          if (selection?.kind === "solid") store.setClipTarget(selection.id, !store.clip.targets.includes(selection.id));
        } else store.select(selection, event.shiftKey || event.ctrlKey || event.metaKey);
      };
      const li = el(
        "li",
        { "data-key": key, "data-locked": String(locked), class: selected ? "selected" : "" },
      );
      li.append(el("span", {}, label));
      const lock = el("button", {
        class: "editor-lock",
        "aria-label": `${locked ? "Unlock" : "Lock"} ${label}`,
      }, locked ? "Unlock" : "Lock");
      lock.addEventListener("click", (event) => {
        event.stopPropagation();
        store.setLocked(selection, !locked);
      });
      lock.disabled = !!store.clip;
      li.append(lock);
      li.tabIndex = locked ? -1 : 0;
      li.addEventListener("click", onPick);
      li.addEventListener("keydown", (e) => {
        if (e.target !== li) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick(e);
        }
      });
      (bucket?.rows ?? rows).push({ li, name: label, key, kindKey: selection ? objectKindKey(store.selectedItem(selection)!) : undefined, count: 1 });
    };
    for (const s of level.solids)
      row(
        `${s.id} · ${s.kind}`,
        store.clip ? store.clip.targets.includes(s.id) : store.solidSelection.includes(s.id) || (store.selection?.kind === "solid" && store.selection.id === s.id),
        { kind: "solid", id: s.id },
        `solid:${s.id}`,
      );
    for (const p of level.prefabs)
      row(
        `${p.id} · ${p.kind}`,
        store.selection?.kind === "prefab" &&
          (store.selection as { id: string }).id === p.id,
        { kind: "prefab", id: p.id },
        `prefab:${p.id}`,
      );
    level.checkpoints.forEach((c, i) =>
      row(
        `Checkpoint ${i + 1} (${c.x}, ${c.z})`,
        store.selection?.kind === "checkpoint" &&
          (store.selection as { index: number }).index === i,
        { kind: "checkpoint", index: i },
        `checkpoint:${i}`,
      ),
    );
    store.targetList().forEach((t, i) =>
      row(
        `${level.mode === "demolition" ? "Demolition target" : t.kind === "chest" ? "Treasure chest" : "Collectible"} ${i + 1} (${t.x}, ${t.z})`,
        store.selection?.kind === "target" &&
          (store.selection as { index: number }).index === i,
        { kind: "target", index: i },
        `target:${i}`,
      ),
    );
    (level.rings ?? []).forEach((r, i) =>
      row(
        `Ring ${i + 1} (${r.x}, ${r.z})`,
        store.selection?.kind === "ring" &&
          (store.selection as { index: number }).index === i,
        { kind: "ring", index: i },
        `ring:${i}`,
      ),
    );
    row(
      "Spawn",
      store.selection?.kind === "spawn",
      { kind: "spawn" },
      "spawn",
    );
    for (const bucket of groups.values()) {
      const name = bucket.groupName;
      const labelName = [...groups.values()].some(other => other !== bucket && other.groupName === name) ? `${name} · ${objectKindLabel(bucket.kindKey)}` : name;
      const li = el("li", { class: `editor-group${bucket.selected ? " selected" : ""}`, "data-group": name, "data-locked": String(bucket.locked) });
      const header = el("div", { class: "editor-group-header" });
      const toggle = el("button", { "aria-label": `${expandedGroups.has(name) ? "Collapse" : "Expand"} ${labelName}`, "aria-expanded": String(expandedGroups.has(name)) }, expandedGroups.has(name) ? "▾" : "▸");
      toggle.addEventListener("click", () => {
        if (expandedGroups.has(name)) expandedGroups.delete(name); else expandedGroups.add(name);
        refreshList();
      });
      const label = el("button", { class: "editor-group-name" }, `${labelName} (${bucket.count})`);
      label.addEventListener("click", event => store.select(bucket.selection, event.shiftKey || event.ctrlKey || event.metaKey));
      const lock = el("button", { class: "editor-lock", "aria-label": `${bucket.locked ? "Unlock" : "Lock"} ${name}` }, bucket.locked ? "Unlock" : "Lock");
      lock.addEventListener("click", () => store.setLocked(bucket.selection, !bucket.locked));
      header.append(toggle, label, lock); li.append(header);
      if (expandedGroups.has(name)) {
        const children = el("ul", { class: "editor-group-children" });
        children.append(...bucket.rows.map(r => r.li)); li.append(children);
      }
      rows.push({ li, name, key: `group:${name}`, kindKey: bucket.kindKey, count: bucket.count });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }) || a.key.localeCompare(b.key));
    for (const section of partitionListKinds(rows)) {
      if (!section.kindKey) { objects.append(...section.rows.map(row => row.li)); continue; }
      const key = section.kindKey, label = objectKindLabel(key), expanded = expandedKinds.has(key);
      const holder = el("li", { class: "editor-kind-section", "data-kind": key });
      const toggle = el("button", { class: "editor-kind-toggle", "aria-label": `${expanded ? "Collapse" : "Expand"} ${label}`, "aria-expanded": String(expanded) }, `${expanded ? "▾" : "▸"} ${label} (${section.count})`);
      toggle.addEventListener("click", () => { if (expandedKinds.has(key)) expandedKinds.delete(key); else expandedKinds.add(key); refreshList(); });
      const children = el("ul", { class: "editor-kind-children" }); children.hidden = !expanded;
      children.append(...section.rows.map(row => row.li)); holder.append(toggle, children); objects.append(holder);
    }
  }
  function refresh() {
    groupButton.disabled = !!store.clip || store.selectedEntries().length < 2;
    ungroupButton.disabled = !!store.clip || !store.selectedEntries().some(s => store.selectedItem(s)?.item.group);
    copyButton.disabled = !!store.clip || !store.selectedEntries().some(s => s.kind !== "spawn");
    pasteButton.disabled = !!store.clip || !store.canPaste;
    for (const button of [saveButton, playtestButton, randomButton, addSolid, addPrefab, addCheckpoint, addTarget, addRing, duplicateButton, removeButton, spawnButton]) button.disabled = !!store.clip;
    nameInput.disabled = !!store.clip;
    folderInput.disabled = !!store.clip;
    if (document.activeElement !== nameInput) nameInput.value = store.level.name;
    if (!store.dirty) unsaved.hidden = true;
    showStatus(store.dirty ? "Unsaved changes" : "Saved");
    for (const { tool, button } of toolButtons) {
      button.classList.toggle("selected", store.tool === tool);
      if (tool === "look") button.disabled = store.selection?.kind !== "prefab";
    }
    previewButton.classList.toggle("selected", store.preview);
    addTarget.textContent =
      store.level.mode === "demolition"
        ? "Add demolition target"
        : "Add collectible";
    addTarget.title =
      store.level.mode === "demolition"
        ? "Place a destructible demolition target"
        : "Place a collectible: a ring like Scrapyard Sweep, or a treasure chest";
    refreshList();
    viewport.render(store.level, store.selection, store.preview);
    refreshProps();
  }
  store.onChange(refresh);
  nameInput.addEventListener("input", () => store.updateName(nameInput.value));
  refreshLevelsButton.addEventListener("click", () => void refreshLevels());
  const folderForPath = (path: string | undefined) => {
    if (!path) return "";
    const slash = path.lastIndexOf("/");
    return slash < 0 ? "" : path.slice(0, slash);
  };
  levelPicker.addEventListener("change", () => {
    const name = levelPicker.value;
    if (!name) return;
    loadLevel(undefined, name)
      .then((level) => {
        expandedKinds.clear(); expandedGroups.clear();
        store.openLevel(level);
        folderInput.value = folderForPath(level.sourcePath);
        viewport.frameSpawn(store.level);
        showStatus(`Opened ${name}`);
        levelPicker.value = "";
      })
      .catch((e: Error) => showError(e.message));
  });
  newButton.addEventListener("click", () => {
    expandedKinds.clear(); expandedGroups.clear();
    store.openBlank(nameInput.value.trim() || "Untitled");
    // Fresh levels default to the top level; nesting is opt-in per save,
    // so a previously opened folder must not silently capture them.
    folderInput.value = "";
    viewport.frameSpawn(store.level);
    showStatus("New level");
  });
  function doSave(after: () => void) {
    try {
      const valid = validateCustomLevel(store.level);
      const folder = folderInput.value.trim().replace(/^\/+|\/+$/g, "");
      const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/;
      if (folder && !folder.split("/").every((p) => SEGMENT.test(p))) {
        showError(
          "Folder must be slash-separated names of letters, numbers, spaces, - or _",
        );
        return;
      }
      if (valid.sourcePath) {
        // Renames keep their file: only an edited folder moves the save,
        // preserving the filename while the display name stays slash-free.
        const currentFolder = folderForPath(valid.sourcePath);
        if (folder !== currentFolder) {
          const file = valid.sourcePath.slice(currentFolder ? currentFolder.length + 1 : 0);
          valid.sourcePath = folder ? `${folder}/${file}` : file;
        }
      } else {
        valid.sourcePath = folder ? `${folder}/${valid.name}` : valid.name;
      }
      saveLevel(undefined, valid)
        .then((saved) => {
          store.level.sourcePath = saved.sourcePath;
          folderInput.value = folderForPath(saved.sourcePath);
          store.markSaved();
          const where = saved.sourcePath ?? valid.name;
          showStatus(
            where === valid.name ? `Saved ${valid.name}` : `Saved ${valid.name} (${where})`,
          );
          return refreshLevels();
        })
        .then(after)
        .catch((e: Error) => showError(e.message));
    } catch (e) {
      showError(e instanceof Error ? e.message : "Invalid level");
    }
  }
  saveButton.addEventListener("click", () => doSave(() => {}));
  async function takenNamesAndIds() {
    const names = await listLevels().catch(() => [] as string[]);
    const ids = [...officialFileTracks.map((t) => t.id), ...customTrackIds()];
    return { names, ids };
  }
  randomButton.addEventListener("click", () => {
    randomError.textContent = "";
    randomModal.hidden = false;
    takenNamesAndIds()
      .then(({ names, ids }) => {
        randomName.value = nextAvailableName(RANDOM_DEFAULTS.name, names, ids);
      })
      .catch(() => {
        randomName.value = RANDOM_DEFAULTS.name;
      });
  });
  randomCancel.addEventListener("click", () => {
    randomModal.hidden = true;
  });
  randomGenerate.addEventListener("click", () => {
    const readInt = (input: HTMLInputElement, label: string, min: number, max: number) => {
      const n = Number(input.value);
      if (!Number.isInteger(n) || n < min || n > max)
        throw new Error(`${label} must be an integer from ${min} to ${max}`);
      return n;
    };
    (async () => {
      try {
        const theme = randomTheme.value as RandomLevelParams["theme"];
        if (!["toys", "christmas", "ice", "carnival", "dungeon", "random"].includes(theme))
          throw new Error("Unknown theme");
        const params = {
          checkpoints: readInt(randomCheckpoints, "Checkpoints", 1, 20),
          lethals: readInt(randomLethals, "Lethal prefabs", 0, 100),
          blockingPercent: readInt(randomBlocking, "Blocking path %", 0, 100),
          decor: readInt(randomDecor, "Decor prefabs", 0, 100),
          theme,
          width: readInt(randomWidth, "Width", 150, 1000),
          length: readInt(randomLength, "Length", 150, 1000),
          name: randomName.value.trim() || RANDOM_DEFAULTS.name,
        };
        const { names, ids } = await takenNamesAndIds();
        const name = nextAvailableName(params.name, names, ids);
        const level = generateRandomLevel(
          { ...params, name },
          (Math.random() * 0x7fffffff) | 0,
        );
        expandedKinds.clear(); expandedGroups.clear();
        store.openLevel(level);
        folderInput.value = folderForPath(level.sourcePath);
        viewport.frameSpawn(store.level);
        randomModal.hidden = true;
        showStatus(`Generated ${name}`);
      } catch (e) {
        randomError.textContent =
          e instanceof Error ? e.message : "Invalid parameters";
      }
    })();
  });
  playtestButton.addEventListener("click", () => {
    let valid: CustomLevel;
    try {
      valid = validateCustomLevel(store.level);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Invalid level");
      return;
    }
    const folder = folderInput.value.trim().replace(/^\/+|\/+$/g, "");
    if (valid.sourcePath) {
      const currentFolder = folderForPath(valid.sourcePath);
      if (folder !== currentFolder) {
        const file = valid.sourcePath.slice(currentFolder ? currentFolder.length + 1 : 0);
        valid.sourcePath = folder ? `${folder}/${file}` : file;
      }
    } else {
      valid.sourcePath = folder ? `${folder}/${valid.name}` : valid.name;
    }
    saveLevel(undefined, valid)
      .then((saved) => {
        store.level.sourcePath = saved.sourcePath;
        folderInput.value = folderForPath(saved.sourcePath);
        store.markSaved();
        const where = saved.sourcePath ?? saved.name;
        showStatus(
          where === saved.name ? `Saved ${saved.name}` : `Saved ${saved.name} (${where})`,
        );
        onPlaytest(toTrack(saved).id as `custom:${string}`);
      })
      .catch((e: Error) => showError(e.message));
  });
  backButton.addEventListener("click", () => {
    if (!store.dirty) {
      onBack();
      return;
    }
    unsaved.hidden = false;
  });
  unsaved.querySelector("#editor-unsaved-save")!.addEventListener("click", () =>
    doSave(() => {
      unsaved.hidden = true;
      onBack();
    }),
  );
  unsaved
    .querySelector("#editor-unsaved-discard")!
    .addEventListener("click", () => {
      unsaved.hidden = true;
      onBack();
    });
  unsaved
    .querySelector("#editor-unsaved-cancel")!
    .addEventListener("click", () => {
      unsaved.hidden = true;
    });
  addSolid.addEventListener("click", () =>
    store.addSolid(solidKind.value as SolidKind, viewport.cameraTarget()),
  );
  addPrefab.addEventListener("click", () =>
    store.addPrefab(prefabKind.value, viewport.cameraTarget()),
  );
  addCheckpoint.addEventListener("click", () => store.addCheckpoint());
  addTarget.addEventListener("click", () => {
    if (!store.addTarget()) showError("Targets need a level mode");
  });
  addRing.addEventListener("click", () => store.addRing());
  duplicateButton.addEventListener("click", () => store.duplicateSelected());
  groupButton.addEventListener("click", () => store.groupSelected());
  ungroupButton.addEventListener("click", () => store.ungroupSelected());
  copyButton.addEventListener("click", () => { store.copySelected(); refresh(); });
  pasteButton.addEventListener("click", () => store.paste());
  removeButton.addEventListener("click", () => store.deleteSelected());
  spawnButton.addEventListener("click", () => store.select({ kind: "spawn" }));
  // Rebuilding the property panel can remove the focused button. Escape must
  // still cancel when the browser has consequently moved focus to the body.
  document.addEventListener("keydown", (e) => {
    if (!screen.hidden && !store.clip && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLSelectElement) && !(e.target instanceof HTMLElement && e.target.isContentEditable) && (e.ctrlKey || e.metaKey) && !e.altKey) {
      const key = e.key.toLowerCase();
      if (key === "c" || key === "v") {
        e.preventDefault(); e.stopPropagation();
        if (!e.repeat) {
          if (key === "c") { store.copySelected(); refresh(); } else store.paste();
        }
        return;
      }
    }
    if (!screen.hidden && e.key === "Escape" && store.clip) {
      e.preventDefault(); store.cancelClip();
    }
  });
  screen.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && store.clip) { e.preventDefault(); store.cancelClip(); return; }
    if (store.clip) return;
    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      !(e.target instanceof HTMLInputElement) &&
      !(e.target instanceof HTMLSelectElement) &&
      !(e.target instanceof HTMLTextAreaElement)
    ) {
      e.preventDefault();
      store.deleteSelected();
    }
  });
  refresh();
  return {
    isVisible() { return !screen.hidden; },
    show() {
      screen.hidden = false;
      host.classList.add("at-level-select");
      void refreshLevels();
      refresh();
      viewport.resize();
      viewport.frameSpawn(store.level);
    },
    /** Adopt an externally-saved level (e.g. after in-game placement). */
    syncStore(level: CustomLevel) {
      store.openLevel(structuredClone(level));
      folderInput.value = folderForPath(level.sourcePath);
      refresh();
    },
    hide() {
      store.cancelClip();
      screen.hidden = true;
      host.classList.remove("at-level-select");
    },
    projectViewport(point: { x: number; y: number; z: number }) {
      return viewport.project(point);
    },
    inspectPreview() {
      return viewport.inspectPreview();
    },
    probe() {
      const targets = store.targetList().length;
      return {
        name: store.level.name,
        solids: store.level.solids.length,
        prefabs: store.level.prefabs.length,
        checkpoints: store.level.checkpoints.length,
        targets,
        rings: (store.level.rings ?? []).length,
        selection:
          store.selection === null
            ? null
            : store.selection.kind === "solid" || store.selection.kind === "prefab"
              ? `${store.selection.kind}:${store.selection.id}`
              : store.selection.kind === "spawn"
                ? "spawn"
                : `${store.selection.kind}:${store.selection.index}`,
        tool: store.tool,
        selectedObject: store.selectedItem()?.item as Record<string, unknown> | undefined,
        preview: store.preview,
        dirty: store.dirty,
        cameraTarget: viewport.cameraTarget(),
        levels: Array.from(levelPicker.options)
          .map((o) => o.value)
          .filter(Boolean),
      };
    },
  };
}
