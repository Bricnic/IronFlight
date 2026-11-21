import * as T from "three";
import { COMIC_PREFAB_KINDS, DUNGEON_PREFAB_KINDS, PROP_PREFAB_KINDS, blankLevel, prefabY, toTrack, type CustomPrefab } from "./custom-level";
import { buildDungeonModel } from "./dungeon-view";
import { buildComicModel } from "./comic-view";
import type { ComicKind } from "./comic-hazards";
import { buildPropModel } from "./prop-view";
import { propHeight, type PropKind } from "./destructibles";
import { buildCarousel, buildArena, buildArenaXL, buildBalloon, buildBumper } from "./fairground-view";
import { buildAxeMesh, buildHammerMesh, buildCheckpointFrame, buildBoostPadMesh, buildGoldStar, buildGhostMeshes, buildTrampolineMesh, buildLampPost, buildGrandstand } from "./course-view";
import { buildDragonStatue } from "./loop-view";
import { buildLooseBlockModel } from "./loose-blocks-view";
import { buildBurningCoalModel } from "./burning-coals-view";
import type { LooseBlock } from "./loose-blocks";
import { courseSolids } from "./course";
import type { DungeonKind } from "./dungeon-hazards";

/** Same model builders as the game, frozen at their authored resting pose. */
export function buildEditorPrefab(p: CustomPrefab, preview: boolean): T.Group {
  const root = new T.Group();
  root.name = p.id;
  root.userData.pick = { kind: "prefab", id: p.id };
  root.userData.locked = !!p.locked;
  const local = { ...p, x: 0, y: 0, z: 0, yaw: 0, angle: 0, roll: 0 };
  if ((DUNGEON_PREFAB_KINDS as readonly string[]).includes(p.kind)) {
    root.add(buildDungeonModel({ ...local, kind: p.kind as DungeonKind, phase: 0 }).root);
  } else if ((COMIC_PREFAB_KINDS as readonly string[]).includes(p.kind)) {
    root.add(buildComicModel({ ...local, kind: p.kind as ComicKind, phase: 0 }).root);
  } else if ((PROP_PREFAB_KINDS as readonly string[]).includes(p.kind)) {
    const model = buildPropModel({ id: p.id, kind: p.kind as PropKind, x: 0, z: 0, ground: 0, scale: p.scale });
    model.root.position.y = propHeight(p.kind) * (p.scale ?? 1);
    root.add(model.scene);
  } else if (p.kind === "gold-star") root.add(buildGoldStar(p.scale ?? 1));
  else if (p.kind === "carousel") root.add(buildCarousel());
  else if (p.kind === "bumper-arena" || p.kind === "bumper-arena-xl") {
    root.add(p.kind === "bumper-arena" ? buildArena() : buildArenaXL());
    for (let i = 0; i < 6; i++) { const bumper = buildBumper(i); bumper.position.set(((i % 3) - 1) * 13, 1.2, i < 3 ? -10 : 10); root.add(bumper); }
  } else if (p.kind === "hot-air-balloon") root.add(buildBalloon());
  else if (p.kind === "ghost") root.add(buildGhostMeshes(1));
  else if (p.kind === "trampoline") root.add(buildTrampolineMesh());
  else if (p.kind === "boost-pad") root.add(buildBoostPadMesh());
  else if (p.kind === "lamp") { const model = buildLampPost(); model.position.y = 12.5; root.add(model); }
  else if (p.kind === "grandstand") { const model = buildGrandstand(); model.position.y = 2.2; root.add(model); }
  else if (p.kind === "axe") { const axe = buildAxeMesh(); axe.position.y = 9; root.add(axe); }
  else if (p.kind === "dragon") {
    const material = (color: number) => new T.MeshStandardMaterial({ color });
    const model = buildDragonStatue(material(0x626b66), material(0x8e6b37), material(0xe2d5b8), material(0x73f5bc));
    model.rotation.y = -Math.PI / 2; root.add(model);
  } else if (p.kind === "loose-blocks" || p.kind === "glass-pane") {
    const model = buildLooseBlockModel({ ...local, kind: p.kind } as LooseBlock).root;
    model.position.y = p.kind === "glass-pane" ? 0.25 : 0.75; root.add(model);
  } else if (p.kind === "burning-coals") {
    const model = buildBurningCoalModel(local).root; model.position.y = 0.45; root.add(model);
  } else if (p.kind === "fragile-ice") {
    const ice = new T.Mesh(new T.BoxGeometry(4.98, 0.3, 4.98), new T.MeshStandardMaterial({ color: 0x3f8fd2, roughness: 0.35, metalness: 0.05 }));
    ice.position.y = -0.13; root.add(ice);
    for (const [i, length] of [3.6, 2.9, 2.2].entries()) { const crack = new T.Mesh(new T.BoxGeometry(length, 0.02, 0.09), new T.MeshStandardMaterial({ color: 0xffffff })); crack.rotation.y = [0.3, 1.35, 2.4][i]; crack.position.y = 0.03; root.add(crack); }
  } else if (p.kind === "checkpoint") { const frame = buildCheckpointFrame(); frame.position.y = -2; root.add(frame); }
  else if (p.kind === "hammer") {
    root.add(buildHammerMesh(p.y ?? 3.5).root);
  } else if (p.kind !== "loop") throw new Error(`Missing editor prefab model: ${p.kind}`);
  // Shared course geometry supplies the loop, gantries and boarding ramps.
  if (["loop", "axe", "carousel"].includes(p.kind)) {
    const level = blankLevel("Prefab geometry"); level.solids = []; level.prefabs = [local];
    for (const s of courseSolids(toTrack(level))) {
      const mesh = new T.Mesh(new T.BoxGeometry(s.w, s.h, s.d), new T.MeshStandardMaterial({ color: s.color }));
      mesh.position.set(s.x, s.y, s.z); mesh.rotation.set(s.angle ?? 0, s.yaw ?? 0, s.roll ?? 0, "YXZ"); root.add(mesh);
    }
  }
  root.position.add(new T.Vector3(p.x, prefabY(p), p.z));
  root.rotation.set(p.angle ?? 0, p.yaw ?? 0, p.roll ?? 0, "YXZ");
  root.scale.setScalar(p.resizeScale ?? 1);
  if (!preview) root.traverse(o => {
    if (o instanceof T.Sprite || o instanceof T.Light) o.visible = false;
    if (o instanceof T.Mesh) {
      const multiple = Array.isArray(o.material);
      const old = Array.isArray(o.material) ? o.material : [o.material];
      const materials = old.map(() => new T.MeshBasicMaterial({ color: 0x9adfe8, wireframe: true, side: T.DoubleSide }));
      o.material = multiple ? materials : materials[0];
      old.forEach(m => m.dispose());
    }
  });
  return root;
}

/** Large ice fields share geometry; selected tiles remain ordinary editable models. */
export function buildEditorIceBatch(prefabs: CustomPrefab[], preview: boolean) {
  const batch = new T.Group();
  if (!prefabs.length) return batch;
  const template = buildEditorPrefab({ id: "ice-template", kind: "fragile-ice", x: 0, y: 0, z: 0 }, preview);
  template.updateMatrixWorld(true);
  const picks = prefabs.map(p => ({ pick: { kind: "prefab", id: p.id }, locked: !!p.locked }));
  template.traverse(o => {
    if (!(o instanceof T.Mesh)) return;
    const mesh = new T.InstancedMesh(o.geometry, o.material, prefabs.length);
    mesh.userData.instancePicks = picks;
    const matrix = new T.Matrix4(), rotation = new T.Quaternion(), position = new T.Vector3(), size = new T.Vector3();
    prefabs.forEach((p, i) => {
      position.set(p.x, prefabY(p), p.z);
      rotation.setFromEuler(new T.Euler(p.angle ?? 0, p.yaw ?? 0, p.roll ?? 0, "YXZ"));
      size.setScalar(p.resizeScale ?? 1);
      matrix.compose(position, rotation, size).multiply(o.matrixWorld);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox(); mesh.computeBoundingSphere();
    batch.add(mesh);
  });
  return batch;
}
