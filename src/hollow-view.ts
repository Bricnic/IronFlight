import * as T from "three";
import { SPIDER } from "./dungeon-hazards";
import type { DungeonPhysics } from "./dungeon-physics";

type Mech = DungeonPhysics["mechanisms"][number];
type XYZ = [number, number, number];

const mesh = (
  parent: T.Group,
  geometry: T.BufferGeometry,
  material: T.Material,
  at: XYZ,
) => {
  const piece = new T.Mesh(geometry, material);
  piece.position.set(...at);
  piece.castShadow = piece.receiveShadow = true;
  parent.add(piece);
  return piece;
};
const plastic = (color: number) =>
  new T.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 });
const oval = (
  parent: T.Group,
  material: T.Material,
  at: XYZ,
  size: XYZ,
  detail = 12,
) => {
  const piece = mesh(
    parent,
    new T.SphereGeometry(1, detail, Math.max(6, detail - 2)),
    material,
    at,
  );
  piece.scale.set(...size);
  return piece;
};
const link = (
  parent: T.Group,
  material: T.Material,
  start: XYZ,
  end: XYZ,
  base: number,
  tip: number,
) => {
  const a = new T.Vector3(...start), b = new T.Vector3(...end);
  const at = a.clone().lerp(b, 0.5);
  const piece = mesh(
    parent,
    new T.CylinderGeometry(tip, base, a.distanceTo(b), 8),
    material,
    [at.x, at.y, at.z],
  );
  piece.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    b.sub(a).normalize(),
  );
  return piece;
};

/** Hollow spider: dark hunter on a giant sticky radial web. */
export function buildSpider(root: T.Group) {
  const hide = plastic(0x241a2e);
  const belly = plastic(0x3a2350);
  const fangMat = plastic(0xd8cfc0);
  const eyeMat = new T.MeshStandardMaterial({
    color: 0x550000,
    emissive: 0xff2222,
    emissiveIntensity: 1.6,
    roughness: 0.3,
  });
  const bodyG = new T.Group();
  bodyG.position.y = 1.7;
  root.add(bodyG);
  oval(bodyG, hide, [0, 0.2, -1.6], [1.5, 1.3, 2.1], 14);
  oval(bodyG, belly, [0, 0, 0.9], [1.0, 0.85, 1.1], 12);
  const stripe = mesh(bodyG, new T.BoxGeometry(0.5, 0.3, 2.4), fangMat, [0, 1.35, -1.6]);
  stripe.rotation.x = 0.15;
  for (const side of [-1, 1]) {
    oval(bodyG, eyeMat, [side * 0.35, 0.45, 1.75], [0.16, 0.2, 0.12], 8);
    oval(bodyG, eyeMat, [side * 0.62, 0.2, 1.55], [0.11, 0.13, 0.09], 8);
  }
  const fangs = new T.Group();
  fangs.position.set(0, -0.45, 1.5);
  bodyG.add(fangs);
  for (const side of [-1, 1]) {
    const fang = mesh(fangs, new T.ConeGeometry(0.16, 0.9, 6), fangMat, [side * 0.3, -0.3, 0]);
    fang.rotation.x = Math.PI;
    fang.rotation.z = side * -0.15;
  }
  const legs: T.Group[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = 1.1 - i * 0.85;
      const leg = new T.Group();
      leg.position.set(side * 1.0, 0.1, z);
      bodyG.add(leg);
      const knee: XYZ = [side * 2.6, 1.1, z * 1.5];
      const foot: XYZ = [side * 3.9, -1.55, z * 2.0];
      link(leg, hide, [0, 0, 0], [knee[0] - side * 1.0, knee[1] - 0.1, knee[2] - z], 0.22, 0.15);
      link(leg, hide, [knee[0] - side * 1.0, knee[1] - 0.1, knee[2] - z], [foot[0] - side * 1.0, foot[1] - 0.1, foot[2] - z], 0.15, 0.05);
      legs.push(leg);
    }
  }
  // The web stays pinned to the prefab while the spider roams: the anchor is
  // counter-positioned every frame (radially symmetric, so no counter-turn).
  const webAnchor = new T.Group();
  root.add(webAnchor);
  const R = SPIDER.webRadius;
  const pts: number[] = [];
  const spokes = 12, rings = 5;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    pts.push(0, 0.15, 0, Math.cos(a) * R, 0.15, Math.sin(a) * R);
  }
  for (let r = 1; r <= rings; r++) {
    const rad = (r / rings) * R;
    const segs = spokes * 3;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
      const sag = 0.15 + 0.5 * (1 - r / rings);
      pts.push(
        Math.cos(a0) * rad, sag, Math.sin(a0) * rad,
        Math.cos(a1) * rad, sag, Math.sin(a1) * rad,
      );
    }
  }
  const webGeo = new T.BufferGeometry();
  webGeo.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
  const web = new T.LineSegments(
    webGeo,
    new T.LineBasicMaterial({ color: 0xf2f5f7, transparent: true, opacity: 0.85 }),
  );
  webAnchor.add(web);
  const hub = mesh(webAnchor, new T.CylinderGeometry(1.4, 1.4, 0.2, 12), hide, [0, 0.2, 0]);
  hub.userData.animate = true;
  return { bodyG, fangs, legs, webAnchor };
}

export function poseSpider(
  model: ReturnType<typeof buildSpider>,
  root: T.Group,
  hx: number,
  hz: number,
  sp: NonNullable<Mech["spider"]>,
  now: number,
) {
  root.position.set(sp.pos.x, root.position.y, sp.pos.z);
  root.rotation.y = sp.yaw;
  model.webAnchor.position.set(hx - sp.pos.x, 0, hz - sp.pos.z);
  const hunting = sp.hunting;
  const freq = hunting ? 9 : 2.2;
  const amp = hunting ? 0.5 : 0.12;
  model.legs.forEach((leg, i) => {
    leg.rotation.x = Math.sin(now * freq + i * 1.7) * amp;
    leg.rotation.z = Math.sin(now * freq * 0.5 + i) * amp * 0.3;
  });
  model.bodyG.position.y = 1.7 + (hunting ? Math.abs(Math.sin(now * 9)) * 0.25 : Math.sin(now * 2.2) * 0.06);
  model.fangs.position.y = -0.45 - (hunting ? 0.25 : 0);
  model.fangs.rotation.x = hunting ? 0.35 : 0;
}
