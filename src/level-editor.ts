import { EditorStore } from "./editor-state";
import { createEditorViewport } from "./editor-viewport";
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
  removeLevel,
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
  const deleteButton = el("button", { id: "editor-delete" }, "Delete");
  const backButton = el("button", { id: "editor-back" }, "Back");
  const toolButtons = (
    ["select", "pan", "eyedropper", "rotator"] as const
  ).map((tool) => {
    const button = el(
      "button",
      { id: `editor-tool-${tool}` },
      tool[0].toUpperCase() + tool.slice(1),
    ) as HTMLButtonElement;
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
    deleteButton,
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
  for (const kind of PREFAB_KINDS)
    prefabKind.append(el("option", { value: kind }, kind));
  const addPrefab = el("button", { id: "editor-add-prefab" }, "Add prefab");
  const addCheckpoint = el("button", { id: "editor-add-checkpoint" }, "Add checkpoint");
  const addTarget = el("button", { id: "editor-add-target" }, "Add target");
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
  function refreshProps() {
    props.innerHTML = "";
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
              ? "Target"
              : "Checkpoint",
    );
    const item = current.item as Record<string, number | string | undefined>;
    const commit = (prop: string) => (n: number) =>
      store.updateSelected({ [prop]: n });
    for (const key of ["x", "y", "z"]) {
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
      tex.append(el("option", { value: "" }, "(none)"));
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
      if (
        (PROP_PREFAB_KINDS as readonly string[]).includes(current.item.kind)
      )
        numberField(
          props,
          "Yaw",
          "yaw",
          item.yaw as number | undefined,
          commit("yaw"),
        );
    }
    if (current.kind === "checkpoint" || current.kind === "target")
      numberField(props, "Y", "y", item.y as number | undefined, commit("y"));
  }
  function refreshList() {
    objects.innerHTML = "";
    const level = store.level;
    const row = (
      label: string,
      selected: boolean,
      onPick: () => void,
      key: string,
    ) => {
      const li = el(
        "li",
        { "data-key": key, class: selected ? "selected" : "" },
        label,
      );
      li.tabIndex = 0;
      li.addEventListener("click", onPick);
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      });
      objects.append(li);
    };
    for (const s of level.solids)
      row(
        `${s.id} · ${s.kind}`,
        store.selection?.kind === "solid" &&
          (store.selection as { id: string }).id === s.id,
        () => store.select({ kind: "solid", id: s.id }),
        `solid:${s.id}`,
      );
    for (const p of level.prefabs)
      row(
        `${p.id} · ${p.kind}`,
        store.selection?.kind === "prefab" &&
          (store.selection as { id: string }).id === p.id,
        () => store.select({ kind: "prefab", id: p.id }),
        `prefab:${p.id}`,
      );
    level.checkpoints.forEach((c, i) =>
      row(
        `Checkpoint ${i + 1} (${c.x}, ${c.z})`,
        store.selection?.kind === "checkpoint" &&
          (store.selection as { index: number }).index === i,
        () => store.select({ kind: "checkpoint", index: i }),
        `checkpoint:${i}`,
      ),
    );
    store.targetList().forEach((t, i) =>
      row(
        `Target ${i + 1} (${t.x}, ${t.z})`,
        store.selection?.kind === "target" &&
          (store.selection as { index: number }).index === i,
        () => store.select({ kind: "target", index: i }),
        `target:${i}`,
      ),
    );
    row(
      "Spawn",
      store.selection?.kind === "spawn",
      () => store.select({ kind: "spawn" }),
      "spawn",
    );
  }
  function refresh() {
    if (document.activeElement !== nameInput) nameInput.value = store.level.name;
    if (!store.dirty) unsaved.hidden = true;
    showStatus(store.dirty ? "Unsaved changes" : "Saved");
    for (const { tool, button } of toolButtons)
      button.classList.toggle("selected", store.tool === tool);
    previewButton.classList.toggle("selected", store.preview);
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
  deleteButton.addEventListener("click", () => {
    const name = store.level.name;
    removeLevel(undefined, name)
      .then(() => {
        store.openBlank("Untitled");
        showStatus(`Deleted ${name}`);
        return refreshLevels();
      })
      .catch((e: Error) => showError(e.message));
  });
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
    if (!store.addTarget()) showError("Targets need arena or demolition mode");
  });
  duplicateButton.addEventListener("click", () => store.duplicateSelected());
  removeButton.addEventListener("click", () => store.deleteSelected());
  spawnButton.addEventListener("click", () => store.select({ kind: "spawn" }));
  screen.addEventListener("keydown", (e) => {
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
        levels: Array.from(levelPicker.options)
          .map((o) => o.value)
          .filter(Boolean),
      };
    },
  };
}
