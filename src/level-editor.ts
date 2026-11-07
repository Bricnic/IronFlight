import { EditorStore, type EditorSelection } from "./editor-state";
import { createEditorViewport } from "./editor-viewport";
import { defaultTextureFor } from "./course-view";
import { clipUnsupported, intersectRects, solidRect, validRect, type ClipRect } from "./editor-clip";
import {
  TEXTURE_IDS,
  PREFAB_KINDS,
  PROP_PREFAB_KINDS,
  SOLID_KINDS,
  toTrack,
  validateCustomLevel,
  type CustomLevel,
  type SolidKind,
} from "./custom-level";
import {
  listLevels,
  saveLevel,
  loadLevel,
} from "./level-store";
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
) {
  const row = el("label", { class: "prop-row" }, `${label} `);
  const input = el("input", {
    type: "number",
    step: "any",
    "data-prop": prop,
  }) as HTMLInputElement;
  if (value !== undefined) input.value = String(value);
  input.addEventListener("change", () => {
    const n = parseFloat(input.value);
    if (Number.isFinite(n)) onCommit(n);
    else input.value = value === undefined ? "" : String(value);
  });
  row.append(input);
  props.append(row);
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
  const levelPicker = el("select", {
    id: "editor-levels",
    "aria-label": "Open level",
  }) as HTMLSelectElement;
  const newButton = el("button", { id: "editor-new" }, "New");
  const saveButton = el("button", { id: "editor-save" }, "Save");
  const playtestButton = el("button", { id: "editor-playtest" }, "Playtest");
  const undoButton = el("button", { id: "editor-undo" }, "Undo");
  const redoButton = el("button", { id: "editor-redo" }, "Redo");
  undoButton.addEventListener("click", () => store.undo());
  redoButton.addEventListener("click", () => store.redo());
  const backButton = el("button", { id: "editor-back" }, "Back");
  const toolButtons = (
    ["select", "pan", "eyedropper", "rotator", "clip"] as const
  ).map((tool) => {
    const button = el(
      "button",
      { id: `editor-tool-${tool}` },
      tool[0].toUpperCase() + tool.slice(1),
    ) as HTMLButtonElement;
    if (tool === "clip") button.title = "Clip selected ground/road solids. Shift/Ctrl click list rows to select several.";
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
    levelPicker,
    newButton,
    saveButton,
    playtestButton,
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
    objects,
    duplicateButton,
    removeButton,
    spawnButton,
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
  screen.append(top, body, unsaved);
  host.append(screen);
  const viewport = createEditorViewport(viewportHost, store);
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
        levelPicker.innerHTML = "";
        levelPicker.append(el("option", { value: "" }, "Open level…"));
        for (const name of names)
          levelPicker.append(el("option", { value: name }, name));
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
  function refreshProps() {
    props.innerHTML = "";
    if (store.clip) { refreshClipProps(); return; }
    const level = store.level;
    const section = (title: string) => {
      props.append(el("h3", {}, title));
    };
    section("Level");
    const modeRow = el("label", { class: "prop-row" }, "Mode ");
    const mode = el("select", { "data-prop": "mode" }) as HTMLSelectElement;
    for (const m of ["race", "arena", "demolition"])
      mode.append(el("option", { value: m }, m));
    mode.value = level.mode;
    mode.addEventListener("change", () =>
      store.updateLevel({ mode: mode.value as CustomLevel["mode"] }),
    );
    modeRow.append(mode);
    props.append(modeRow);
    numberField(props, "Gold", "gold", level.medals.gold, (n) =>
      store.updateLevel({ gold: n }),
    );
    numberField(props, "Silver", "silver", level.medals.silver, (n) =>
      store.updateLevel({ silver: n }),
    );
    numberField(props, "Bronze", "bronze", level.medals.bronze, (n) =>
      store.updateLevel({ bronze: n }),
    );
    numberField(props, "Limit", "limit", level.limit, (n) =>
      store.updateLevel({ limit: n }),
    );
    const clearLimit = el("button", { id: "editor-clear-limit" }, "No limit");
    clearLimit.addEventListener("click", () =>
      store.updateLevel({ limit: Number.NaN }),
    );
    props.append(clearLimit);
    const current = store.selectedItem();
    if (!current) {
      props.append(el("p", { class: "prop-hint" }, "Select an object to edit it."));
      return;
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
                : "Ring collectible"
              : current.kind === "ring"
                ? "Ring"
                : "Checkpoint",
    );
    const item = current.item as Record<
      string,
      number | string | boolean | undefined
    >;
    const commit = (prop: string) => (n: number) =>
      store.updateSelected({ [prop]: n });
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
    if (current.kind === "prefab") {
      props.append(
        el("p", { class: "prop-hint" }, `Kind: ${current.item.kind}`),
      );
      numberField(props, "Y", "y", item.y as number | undefined, commit("y"));
      const isProp = (PROP_PREFAB_KINDS as readonly string[]).includes(
        current.item.kind,
      );
      if (isProp || current.item.kind === "dragon")
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
  }
  function refreshList() {
    objects.innerHTML = "";
    const level = store.level;
    const rows: { li: HTMLLIElement; name: string; key: string }[] = [];
    const row = (
      label: string,
      selected: boolean,
      selection: EditorSelection,
      key: string,
    ) => {
      const item = store.selectedItem(selection)?.item;
      const locked = !!item?.locked;
      label = item?.name ?? label;
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
      rows.push({ li, name: label, key });
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
        `${level.mode === "demolition" ? "Demolition target" : "Collectible"} ${i + 1} (${t.x}, ${t.z})`,
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
    rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }) || a.key.localeCompare(b.key));
    objects.append(...rows.map((row) => row.li));
  }
  function refresh() {
    for (const button of [saveButton, playtestButton, addSolid, addPrefab, addCheckpoint, addTarget, addRing, duplicateButton, removeButton, spawnButton]) button.disabled = !!store.clip;
    nameInput.disabled = !!store.clip;
    if (document.activeElement !== nameInput) nameInput.value = store.level.name;
    if (!store.dirty) unsaved.hidden = true;
    showStatus(store.dirty ? "Unsaved changes" : "Saved");
    for (const { tool, button } of toolButtons)
      button.classList.toggle("selected", store.tool === tool);
    previewButton.classList.toggle("selected", store.preview);
    addTarget.textContent =
      store.level.mode === "demolition"
        ? "Add demolition target"
        : "Add collectible";
    addTarget.title =
      store.level.mode === "demolition"
        ? "Place a destructible demolition target"
        : "Place a ring collectible like those in Scrapyard Sweep";
    refreshList();
    refreshProps();
    viewport.render(store.level, store.selection, store.preview);
  }
  store.onChange(refresh);
  nameInput.addEventListener("input", () => store.updateName(nameInput.value));
  levelPicker.addEventListener("change", () => {
    const name = levelPicker.value;
    if (!name) return;
    loadLevel(undefined, name)
      .then((level) => {
        store.openLevel(level);
        viewport.frameSpawn(store.level);
        showStatus(`Opened ${name}`);
        levelPicker.value = "";
      })
      .catch((e: Error) => showError(e.message));
  });
  newButton.addEventListener("click", () => {
    store.openBlank(nameInput.value.trim() || "Untitled");
    viewport.frameSpawn(store.level);
    showStatus("New level");
  });
  function doSave(after: () => void) {
    try {
      const valid = validateCustomLevel(store.level);
      saveLevel(undefined, valid)
        .then(() => loadLevel(undefined, valid.name))
        .then(() => {
          store.markSaved();
          showStatus(`Saved ${valid.name}`);
          return refreshLevels();
        })
        .then(after)
        .catch((e: Error) => showError(e.message));
    } catch (e) {
      showError(e instanceof Error ? e.message : "Invalid level");
    }
  }
  saveButton.addEventListener("click", () => doSave(() => {}));
  playtestButton.addEventListener("click", () => {
    let valid: CustomLevel;
    try {
      valid = validateCustomLevel(store.level);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Invalid level");
      return;
    }
    saveLevel(undefined, valid)
      .then((saved) => {
        store.markSaved();
        showStatus(`Saved ${saved.name}`);
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
    store.addSolid(solidKind.value as SolidKind),
  );
  addPrefab.addEventListener("click", () =>
    store.addPrefab(prefabKind.value),
  );
  addCheckpoint.addEventListener("click", () => store.addCheckpoint());
  addTarget.addEventListener("click", () => {
    if (!store.addTarget()) showError("Targets need a level mode");
  });
  addRing.addEventListener("click", () => store.addRing());
  duplicateButton.addEventListener("click", () => store.duplicateSelected());
  removeButton.addEventListener("click", () => store.deleteSelected());
  spawnButton.addEventListener("click", () => store.select({ kind: "spawn" }));
  // Rebuilding the property panel can remove the focused button. Escape must
  // still cancel when the browser has consequently moved focus to the body.
  document.addEventListener("keydown", (e) => {
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
