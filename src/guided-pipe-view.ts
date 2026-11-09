import * as T from "three";
import { PIPE_CENTER_OFFSET, PIPE_RADIUS, PIPE_TUBE } from "./guided-pipe";

export function buildGuidedPipe(root: T.Group) {
  const centerline = new T.CatmullRomCurve3(PIPE_TUBE.points.map((point) =>
    point.clone().add(new T.Vector3(0, PIPE_CENTER_OFFSET, 0)),
  ));
  const amber = new T.MeshStandardMaterial({
    color: 0xda7818, transparent: true, opacity: 0.54, depthWrite: false,
    side: T.DoubleSide, roughness: 0.26, metalness: 0.08,
  });
  const gold = new T.MeshStandardMaterial({ color: 0xf5b32c, roughness: 0.34, metalness: 0.16 });
  const dark = new T.MeshStandardMaterial({ color: 0xa95613, roughness: 0.42 });
  root.add(new T.Mesh(new T.TubeGeometry(centerline, 92, PIPE_RADIUS, 36, false), amber));
  const axis = new T.Vector3(0, 0, 1);
  for (const [i, t] of [0, 0.075, 0.25, 0.42, 0.59, 0.78, 0.93, 1].entries()) {
    const end = t === 0 || t === 1;
    const hoop = new T.Mesh(new T.TorusGeometry(PIPE_RADIUS + 0.09, end ? 0.53 : 0.24, 12, 42), end ? gold : dark);
    hoop.position.copy(centerline.getPointAt(t));
    hoop.quaternion.setFromUnitVectors(axis, centerline.getTangentAt(t));
    hoop.castShadow = true;
    hoop.name = `pipe-hoop-${i}`;
    root.add(hoop);
  }
  const collar = new T.Mesh(new T.CylinderGeometry(PIPE_RADIUS + 0.24, PIPE_RADIUS + 0.5, 3.9, 36, 1, true), gold);
  collar.position.copy(centerline.getPointAt(0));
  collar.position.z += 1.95;
  collar.rotation.x = Math.PI / 2;
  collar.castShadow = true;
  root.add(collar);
}
export function buildFlagpole(root: T.Group): T.Group {
  const steel = new T.MeshStandardMaterial({ color: 0x9aa2ab, roughness: 0.35, metalness: 0.8 });
  const dark = new T.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.5, metalness: 0.6 });
  const gold = new T.MeshStandardMaterial({ color: 0xf5b32c, roughness: 0.34, metalness: 0.16 });
  const red = new T.MeshStandardMaterial({ color: 0xd43d2a, roughness: 0.55, metalness: 0.05 });
  const base = new T.Mesh(new T.CylinderGeometry(3, 3.6, 1, 24), dark);
  base.position.y = 0.5;
  base.castShadow = true;
  base.receiveShadow = true;
  root.add(base);
  const pole = new T.Mesh(new T.CylinderGeometry(0.4, 0.5, 30, 16), steel);
  pole.position.y = 15;
  pole.castShadow = true;
  root.add(pole);
  const cap = new T.Mesh(new T.SphereGeometry(0.8, 16, 12), gold);
  cap.position.y = 30.4;
  cap.castShadow = true;
  root.add(cap);
  const flag = new T.Group();
  flag.position.set(-2, 29.5, 0);
  const cloth = new T.Mesh(new T.BoxGeometry(4, 2.2, 0.15), red);
  cloth.position.set(-2, 0, 0);
  cloth.castShadow = true;
  flag.add(cloth);
  root.add(flag);
  return flag;
}
