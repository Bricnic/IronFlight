import * as T from "three";
import { LOOSE_BLOCK_SIZE, type LooseBlock, type LooseBlocks } from "./loose-blocks";

/** Pastel cube faces with a dark letter, like the toy blocks. */
const FACE_COLORS = ["#f2ede4", "#dcefe8", "#e4e9f7", "#f7e8e4", "#eef3da"];
const LETTER_COLORS = ["#c0392b", "#2471a3", "#1e8449", "#7d3c98", "#b7950b"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function hashId(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Deterministic letter per block so replays and tests agree. */
export function blockLetter(id: string) {
  return LETTERS[hashId(id) % LETTERS.length];
}

function letterTexture(id: string) {
  const h = hashId(id);
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = FACE_COLORS[h % FACE_COLORS.length];
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = LETTER_COLORS[h % LETTER_COLORS.length];
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 112, 112);
  ctx.fillStyle = LETTER_COLORS[h % LETTER_COLORS.length];
  ctx.font = "bold 84px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(blockLetter(id), 64, 100);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

export function buildLooseBlockModel(h: LooseBlock) {
  const root = new T.Group();
  root.name = h.id;
  const mesh = new T.Mesh(
    new T.BoxGeometry(LOOSE_BLOCK_SIZE, LOOSE_BLOCK_SIZE, LOOSE_BLOCK_SIZE),
    new T.MeshStandardMaterial({ map: letterTexture(h.id), roughness: 0.9 }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
  const triangles =
    (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) /
    3;
  return { root, triangles };
}

export class LooseBlocksView extends T.Group {
  private source?: LooseBlocks;
  private models = new Map<object, T.Group>();
  /** Live editing: drop one block model by definition id. */
  removeModel(id: string) {
    for (const [block, root] of this.models) {
      if ((block as { h: LooseBlock }).h.id !== id) continue;
      root.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            if (
              m instanceof T.MeshStandardMaterial &&
              m.map instanceof T.CanvasTexture
            )
              m.map.dispose();
            m.dispose();
          }
        }
      });
      root.removeFromParent();
      this.models.delete(block);
      return;
    }
  }
  /** Live editing: shift one block model by delta. */
  moveModel(id: string, dx: number, dy: number, dz: number) {
    for (const [block, root] of this.models) {
      if ((block as { h: LooseBlock }).h.id !== id) continue;
      root.position.x += dx;
      root.position.y += dy;
      root.position.z += dz;
      return;
    }
  }
  update(source: LooseBlocks) {
    if (source !== this.source) {
      this.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            if (
              m instanceof T.MeshStandardMaterial &&
              m.map instanceof T.CanvasTexture
            )
              m.map.dispose();
            m.dispose();
          }
        }
      });
      this.clear();
      this.models.clear();
      this.source = source;
      for (const block of source.blocks) {
        const model = buildLooseBlockModel(block.h);
        this.models.set(block, model.root);
        this.add(model.root);
      }
    }
    for (const block of source.blocks) {
      if (this.models.has(block)) continue;
      const model = buildLooseBlockModel(block.h);
      this.models.set(block, model.root);
      this.add(model.root);
    }
    for (const [block, root] of this.models) {
      const state = block as LooseBlocks["blocks"][number];
      root.position.copy(state.body.translation());
      root.quaternion.copy(state.body.rotation());
    }
  }
}
