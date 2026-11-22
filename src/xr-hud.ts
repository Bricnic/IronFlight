import * as T from "three";

/** Plain snapshot the XR dashboard renders; main.ts fills it per frame. */
export interface XRHudData {
  speedMph: number;
  timeText: string;
  progressText: string;
  starsText: string;
  badgeText: string;
}

const W = 512;
const H = 256;
const FONT = '"Barlow Condensed", Impact, sans-serif';

/**
 * Minimal in-headset dashboard: a canvas-texture quad parented to the XR
 * camera (lower view, like a dash readout) plus a center flash line for
 * checkpoint/star/dream celebrations. DOM HUD is invisible in-headset, so
 * this is the only instrumentation while presenting. Hidden otherwise.
 */
export class XRHud {
  readonly group = new T.Group();
  private canvas: HTMLCanvasElement;
  private texture: T.CanvasTexture;
  private flashText = "";
  private flashSub = "";
  private flashUntil = -Infinity;
  private lastKey = "";

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.texture = new T.CanvasTexture(this.canvas);
    this.texture.colorSpace = T.SRGBColorSpace;
    const material = new T.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
    });
    const quad = new T.Mesh(new T.PlaneGeometry(1.1, 0.55), material);
    quad.renderOrder = 999;
    quad.frustumCulled = false;
    this.group.add(quad);
    this.group.position.set(0, -0.5, -1.7);
    this.group.visible = false;
    this.group.renderOrder = 999;
  }

  /** Show a center celebration line until the given sim-time. */
  flash(text: string, subtext: string, untilTime: number) {
    this.flashText = text;
    this.flashSub = subtext;
    this.flashUntil = untilTime;
  }

  /** Redraw when visible; pass sim time so pauses freeze the flash. */
  update(data: XRHudData, now: number) {
    if (!this.group.visible) return;
    const flashing = now < this.flashUntil;
    if (!flashing) {
      this.flashText = "";
      this.flashSub = "";
    }
    const key = flashing
      ? `F${this.flashText}|${this.flashSub}`
      : `D${data.speedMph}|${data.timeText}|${data.progressText}|${data.starsText}|${data.badgeText}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const ctx = this.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "center";
    if (flashing) {
      ctx.fillStyle = "rgba(8,10,14,0.72)";
      ctx.fillRect(56, 48, W - 112, 160);
      ctx.fillStyle = "#ffd700";
      ctx.font = `800 64px ${FONT}`;
      ctx.fillText(this.flashText, W / 2, 122);
      if (this.flashSub) {
        ctx.fillStyle = "#f6edde";
        ctx.font = `700 34px ${FONT}`;
        ctx.fillText(this.flashSub, W / 2, 172);
      }
    } else {
      ctx.fillStyle = "rgba(8,10,14,0.62)";
      ctx.fillRect(56, 96, W - 112, 128);
      ctx.fillStyle = "#f6edde";
      ctx.font = `800 72px ${FONT}`;
      ctx.fillText(String(data.speedMph), W / 2 - 130, 190);
      ctx.font = `700 30px ${FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(data.timeText, W / 2 - 40, 138);
      ctx.fillText(data.progressText, W / 2 - 40, 172);
      ctx.fillStyle = "#ffd700";
      ctx.fillText(data.starsText, W / 2 - 40, 206);
      if (data.badgeText) {
        ctx.fillStyle = "#7ec8e3";
        ctx.textAlign = "right";
        ctx.fillText(data.badgeText, W - 70, 138);
      }
    }
    this.texture.needsUpdate = true;
  }
}
