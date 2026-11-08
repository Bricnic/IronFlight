import * as T from "three";
import type { CustomCheckpoint } from "./custom-level";
import { LIME_JAW } from "./dungeon-hazards";

function plastic(color: number) {
  return new T.MeshStandardMaterial({ color, roughness: 0.33, metalness: 0.13 });
}
function toyMesh(
  group: T.Group, shape: T.BufferGeometry, material: T.Material,
  x = 0, y = 0, z = 0,
) {
  const mesh = new T.Mesh(shape, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
function oval(
  group: T.Group, material: T.Material,
  x: number, y: number, z: number, w: number, h: number, d: number,
) {
  const mesh = toyMesh(group, new T.SphereGeometry(1, 24, 16), material, x, y, z);
  mesh.scale.set(w, h, d);
  return mesh;
}

/** A fixed lower jaw forms a thin tray. The upper jaw pivots above the lane. */
export function buildLimeChomper(root: T.Group) {
  const skin = plastic(0x61eb16), shade = plastic(0x267916);
  const lime = plastic(0xc6f028), teeth = plastic(0xffef87);
  const dark = plastic(0x172a13), white = plastic(0xfff9dc);
  const amber = plastic(0xe48b23);

  oval(root, shade, 0, 5, -2.8, 5.4, 5.1, 8.4);
  oval(root, skin, 0, 5.8, 2.0, 4.8, 5.9, 4.5);
  oval(root, shade, -1.2, 2.1, -10.8, 2.3, 1.8, 7.8).rotation.y = -0.25;
  for (const side of [-1, 1]) {
    oval(root, skin, side * 4.5, 2.9, -0.7, 2.2, 3, 2.8);
    oval(root, lime, side * 5.3, 0.58, 1, 2.45, 0.7, 3);
    oval(root, shade, side * 3.7, 4.6, 4.4, 1.1, 1.2, 1.8);
  }

  const jawLength = LIME_JAW.tip - LIME_JAW.back;
  const mouthCenter = (LIME_JAW.back + LIME_JAW.tip) / 2;
  oval(root, skin, 0, 0.42, 7.2, 5.9, 0.7, 5.4);
  oval(root, lime, 0, 0.03, mouthCenter, LIME_JAW.halfWidth, 0.26, jawLength / 2);
  oval(root, shade, 0, 0.23, mouthCenter, 6.9, 0.12, jawLength / 2 - 0.7);
  for (const side of [-1, 1]) {
    oval(root, skin, side * 7, 0.45, mouthCenter, 1.15, 0.66, 6.6);
    for (let i = 0; i < 5; i++)
      toyMesh(root, new T.ConeGeometry(0.64, 1.1, 9), teeth, side * 7.1, 1, 11 + i * 2.3);
  }

  const upper = new T.Group();
  upper.position.set(0, 3.2, LIME_JAW.hinge);
  root.add(upper);
  oval(upper, skin, 0, 3.2, 3.1, 6.9, 5.0, 5.6);
  oval(upper, skin, 0, 1.55, 11.2, 7.7, 2.85, 7.0);
  oval(upper, lime, 0, -0.08, 10.5, 7.5, 0.72, 6.7);
  for (const side of [-1, 1]) {
    const eye = oval(upper, white, side * 5.6, 3.95, 7.1, 1.05, 2.1, 1.75);
    eye.rotation.y = side * 0.43;
    oval(upper, amber, side * 6.24, 3.7, 7.9, 0.64, 1.22, 0.91);
    oval(upper, dark, side * 6.64, 3.72, 8.05, 0.38, 0.91, 0.48);
    oval(upper, shade, side * 5.5, 5.5, 6.7, 1.44, 0.78, 2.23).rotation.x = -0.38;
    oval(upper, dark, side * 3.1, 3.15, 16.1, 0.8, 0.35, 1.13);
    for (let i = 0; i < 6; i++) {
      const tooth = toyMesh(upper, new T.ConeGeometry(0.65, 1.75 - i * 0.09, 10), teeth,
        side * (6.4 - Math.max(0, i - 3) * 0.45), -0.95, 5.9 + i * 1.8);
      tooth.rotation.z = Math.PI;
    }
  }
  for (let i = 0; i < 4; i++) {
    const crest = toyMesh(upper, new T.ConeGeometry(0.8, 1.8, 5), shade, 0, 7.4 - i * 0.26, 0.4 + i * 2);
    crest.rotation.x = -0.34;
  }
  return upper;
}

export function buildToyCheckpoint(appearance: NonNullable<CustomCheckpoint["appearance"]>) {
  const root = new T.Group();
  const blue = appearance === "blue-tile";
  const body = plastic(blue ? 0x168dd0 : 0xfbd019);
  const accent = plastic(blue ? 0x75e1ff : 0xffeb66);
  const outline = new T.Shape();
  const opening = new T.Path();
  if (blue) {
    outline.moveTo(-13, -2.3);
    outline.lineTo(13, -2.3); outline.lineTo(15, 0.3);
    outline.lineTo(15, 19.6); outline.lineTo(13, 21.6);
    outline.lineTo(-13, 21.6); outline.lineTo(-15, 19.6);
    outline.lineTo(-15, 0.3); outline.closePath();
    opening.absellipse(0, 7.75, 10.85, 8.9, 0, Math.PI * 2, true);
  } else {
    outline.moveTo(-12, -2.4);
    outline.lineTo(12, -2.4);
    outline.quadraticCurveTo(17, -2.4, 17, 5.5);
    outline.lineTo(17, 9);
    outline.quadraticCurveTo(17, 19, 0, 19);
    outline.quadraticCurveTo(-17, 19, -17, 9);
    outline.lineTo(-17, 5.5);
    outline.quadraticCurveTo(-17, -2.4, -12, -2.4);
    outline.closePath();
    opening.moveTo(-11.5, -0.8); opening.lineTo(-11.5, 8.8);
    opening.quadraticCurveTo(-11.5, 14.8, 0, 14.8);
    opening.quadraticCurveTo(11.5, 14.8, 11.5, 8.8);
    opening.lineTo(11.5, -0.8); opening.closePath();
  }
  outline.holes.push(opening);
  const frame = new T.ExtrudeGeometry(outline, {
    depth: blue ? 1.65 : 3.2, bevelEnabled: true, bevelSize: 0.42,
    bevelThickness: 0.42, bevelSegments: 2, curveSegments: 24,
  });
  frame.translate(0, 0, blue ? -0.825 : -1.6);
  toyMesh(root, frame, body);
  if (blue) {
    for (const side of [-1, 1]) {
      for (const y of [1.0, 18.9])
        oval(root, accent, side * 12.1, y, -1.04, 0.86, 0.86, 0.3);
      toyMesh(root, new T.BoxGeometry(0.36, 16.5, 0.25), accent, side * 13.35, 9.8, -1);
    }
    toyMesh(root, new T.BoxGeometry(24, 0.44, 0.25), accent, 0, 19.9, -1);
  } else {
    for (let i = -4; i <= 4; i++) {
      const tooth = toyMesh(root, new T.ConeGeometry(0.93, 2.6, 10), accent, i * 2.12, 13.3 - 0.15 * Math.abs(i), -1.1);
      tooth.rotation.z = Math.PI;
    }
    for (const side of [-1, 1]) {
      oval(root, accent, side * 13.4, 7.4, -1.7, 1.85, 3.0, 1);
      for (let i = 0; i < 3; i++)
        toyMesh(root, new T.ConeGeometry(0.75, 1.65, 9), accent, side * (10.4 + i * 0.95), 0.9 + i * 0.7, -0.6);
    }
  }
  return root;
}
