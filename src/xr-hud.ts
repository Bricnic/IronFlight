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
 * camera in the lower right (clear of the centered car), plus a separate
 * centered flash quad for checkpoint/star/dream celebrations. DOM HUD is
 * invisible in-headset, so this is the only instrumentation while
 * presenting. Hidden otherwise.
 */
export class XRHud {
  readonly group = new T.Group();
  private dashCanvas: HTMLCanvasElement;
  private dashTexture: T.CanvasTexture;
  private flashCanvas: HTMLCanvasElement;
  private flashTexture: T.CanvasTexture;
  private flashMesh: T.Mesh;
  private flashText = "";
  private flashSub = "";
  private flashUntil = -Infinity;
  private lastDashKey = "";
  private lastFlashKey = "";

  constructor() {
    this.dashCanvas = document.createElement("canvas");
    this.dashCanvas.width = W;
    this.dashCanvas.height = H;
    this.dashTexture = new T.CanvasTexture(this.dashCanvas);
    this.dashTexture.colorSpace = T.SRGBColorSpace;
    const dash = new T.Mesh(
      new T.PlaneGeometry(1.1, 0.55),
      new T.MeshBasicMaterial({
        map: this.dashTexture,
        transparent: true,
        depthTest: false,
      }),
    );
    dash.position.set(0.7, -0.75, -1.7);
    dash.renderOrder = 999;
    dash.frustumCulled = false;
    this.flashCanvas = document.createElement("canvas");
    this.flashCanvas.width = W;
    this.flashCanvas.height = H;
    this.flashTexture = new T.CanvasTexture(this.flashCanvas);
    this.flashTexture.colorSpace = T.SRGBColorSpace;
    this.flashMesh = new T.Mesh(
      new T.PlaneGeometry(1.3, 0.65),
      new T.MeshBasicMaterial({
        map: this.flashTexture,
        transparent: true,
        depthTest: false,
      }),
    );
    this.flashMesh.position.set(0, 0.1, -1.7);
    this.flashMesh.renderOrder = 1000;
    this.flashMesh.frustumCulled = false;
    this.flashMesh.visible = false;
    this.group.add(dash, this.flashMesh);
    this.group.visible = false;
    this.group.renderOrder = 999;
  }

  /** Show a center celebration line until the given sim-time. */
  flash(text: string, subtext: string, untilTime: number) {
    this.flashText = text;
    this.flashSub = subtext;
    this.flashUntil = untilTime;
    this.flashMesh.visible = true;
  }

  /** Redraw when visible; pass sim time so pauses freeze the flash. */
  update(data: XRHudData, now: number) {
    if (!this.group.visible) return;
    const flashing = now < this.flashUntil;
    this.flashMesh.visible = flashing;
    if (!flashing) {
      this.flashText = "";
      this.flashSub = "";
      this.lastFlashKey = "";
    } else {
      const flashKey = `F${this.flashText}|${this.flashSub}`;
      if (flashKey !== this.lastFlashKey) {
        this.lastFlashKey = flashKey;
        const ctx = this.flashCanvas.getContext("2d")!;
        ctx.clearRect(0, 0, W, H);
        ctx.textAlign = "center";
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
        this.flashTexture.needsUpdate = true;
      }
    }
    const dashKey = `D${data.speedMph}|${data.timeText}|${data.progressText}|${data.starsText}|${data.badgeText}`;
    if (dashKey === this.lastDashKey) return;
    this.lastDashKey = dashKey;
    const ctx = this.dashCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(8,10,14,0.62)";
    ctx.fillRect(56, 96, W - 112, 128);
    ctx.fillStyle = "#f6edde";
    ctx.font = `800 72px ${FONT}`;
    ctx.textAlign = "center";
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
    this.dashTexture.needsUpdate = true;
  }
}
