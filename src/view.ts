import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PARTS, deformGeometry } from "./damage";
import { ROUTES, routeSolids } from "./routes";
import { Simulation, wheelPositions } from "./simulation";
import { HAZARDS, hammerAngle } from "./hazards";
import { createTruck, truckStats } from "./truck";
import { pbr, flameMaterial } from "./materials";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { arenaSolids } from "./arena";
import { ChaseCamera } from "./camera";
import { DT } from "./clock";
import { LoopView } from "./loop-view";
export class GameView {
  readonly scene = new T.Scene();
  readonly camera = new T.PerspectiveCamera(55, 1, 0.1, 650);
  readonly renderer: T.WebGLRenderer;
  readonly chase = new ChaseCamera(this.camera);
  private lastCameraTime = 0;
  readonly meshes = new Map<string, T.Group>();
  private dentCounts = new Map<string, number>();
  private truck = new T.Group();
  private labFloor = new T.Group();
  private snapCamera = true;
  private hazards = new T.Group();
  private course = new T.Group();
  private loop = new LoopView();
  constructor(
    host: HTMLElement,
    readonly simulation: Simulation,
  ) {
    this.renderer = new T.WebGLRenderer({ antialias: true });
    host.append(this.renderer.domElement);
    let dragging = false,
      lastX = 0,
      lastY = 0;
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      this.chase.drag(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
    });
    const release = () => {
      dragging = false;
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const units =
          e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1;
        this.chase.zoom(e.deltaY * units);
      },
      { passive: false },
    );
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    const pmrem = new T.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04, 0.1, 100, {
      size: 128,
    }).texture;
    this.scene.environmentIntensity = 0.7;
    room.dispose();
    pmrem.dispose();
    this.scene.background = new T.Color(0xc5d0cf);
    this.scene.fog = new T.Fog(0xc5d0cf, 140, 430);
    this.scene.add(new T.HemisphereLight(0xe5f0ff, 0x514733, 2));
    const sun = new T.DirectionalLight(0xffe3af, 3.5);
    sun.position.set(-45, 80, -25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -110,
      right: 110,
      top: 110,
      bottom: -110,
      far: 250,
    });
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    const grass = pbr("grass_ground", 1, { color: 0xc7dfb2, roughness: 1 });
    grass.userData.tile = 3;
    for (const s of arenaSolids().filter((s) => s.kind === "grass")) {
      const m = this.box(s.w, s.h, s.d, grass);
      m.position.set(s.x, s.y, s.z);
    }
    const road = pbr("asphalt_02", 1, { color: 0xc3c4c5, roughness: 0.95 });
    road.userData.tile = 3;
    const courseStart = this.scene.children.length;
    for (const s of routeSolids()) {
      const m = this.box(s.w, s.h, s.d, road);
      m.position.set(s.x, s.y, s.z);
      m.rotation.x = s.angle ?? 0;
      m.receiveShadow = true;
    }
    for (const r of ROUTES) {
      for (const side of [-1, 1]) {
        const edge = this.box(
          0.17,
          0.07,
          105,
          new T.MeshStandardMaterial({ color: r.color }),
        );
        edge.position.set(r.x + side * 6.6, 0.045, -55);
        for (let z = -105; z < -2; z += 6) {
          const dash = this.box(
            0.12,
            0.08,
            2.6,
            new T.MeshStandardMaterial({ color: 0xdbd9ca }),
          );
          dash.position.set(r.x + side * 2.8, 0.05, z);
        }
      }
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 14; col++) {
          const m = this.box(
            1,
            0.025,
            1,
            new T.MeshStandardMaterial({
              color: (row + col) % 2 ? 0x22272a : 0xf5f1d8,
            }),
          );
          m.position.set(r.x - 6.5 + col, 0.025, r.finish + row);
        }
      const gate = new T.Group();
      this.scene.add(gate);
      gate.position.set(r.x, 0, r.finish + 3);
      const mat = new T.MeshStandardMaterial({
        color: r.color,
        metalness: 0.4,
        roughness: 0.5,
      });
      for (const x of [-7, 7]) {
        const p = this.box(0.3, 8, 0.3, mat, gate);
        p.position.set(x, 4, 0);
      }
      const cross = this.box(14.4, 0.8, 0.3, mat, gate);
      cross.position.y = 8;
      const sign = this.label(
        r.name.toUpperCase(),
        "#182025",
        `#${r.color.toString(16)}`,
        1024,
        160,
      );
      sign.scale.set(10, 1.55, 1);
      sign.position.set(r.x, 7.9, r.finish + 2.8);
      sign.name = `finish-sign-${r.id}-front`;
      sign.rotation.y = Math.PI;
      (sign.material as T.MeshBasicMaterial).side = T.FrontSide;
      this.scene.add(sign);
      const reverseSign = sign.clone();
      reverseSign.name = `finish-sign-${r.id}-back`;
      reverseSign.rotation.y = 0;
      reverseSign.position.z = r.finish + 3.2;
      this.scene.add(reverseSign);
      const lava = pbr("rock_06", 4, {
        color: 0x352821,
        emissive: 0xff4d05,
        emissiveIntensity: 2.5,
      });
      lava.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\nfloat crack = smoothstep(0.88, 0.98, abs(sin(vMapUv.x * 35.0 + sin(vMapUv.y * 26.0)*2.0))); totalEmissiveRadiance *= crack;",
        );
      };
      const s = arenaSolids().find((s) => s.id === `lava-${r.id}`)!;
      const pit = this.box(s.w, s.h, s.d, lava);
      pit.position.set(s.x, s.y, s.z);
    }
    for (const item of this.scene.children.slice(courseStart))
      this.course.add(item);
    this.scene.add(this.course);
    this.course.add(this.loop);
    for (const r of ROUTES) {
      const sign = this.label(
        "DRAGON LOOP  /  3X BOOST",
        "#102c2d",
        "#94fff0",
        1024,
        128,
      );
      sign.rotation.y = Math.PI;
      sign.scale.set(12, 1.5, 1);
      sign.position.set(r.x, 6.4, 145);
      this.course.add(sign);
    }
    // Arena seating and light towers give the jumps an arena scale.
    const concrete = new T.MeshStandardMaterial({
        color: 0x767c76,
        roughness: 0.9,
      }),
      seat = new T.MeshStandardMaterial({ color: 0x50626b, roughness: 0.8 });
    for (const s of arenaSolids().filter((s) => s.kind === "grandstand")) {
      const m = this.box(s.w, s.h, s.d, s.row! % 2 ? seat : concrete);
      m.position.set(s.x, s.y, s.z);
    }
    for (const x of [-57, 57])
      for (const z of [-90, 0, 95]) {
        const pole = this.box(0.3, 25, 0.3, concrete);
        pole.position.set(x, 11, z);
        const lamps = this.box(
          5,
          1,
          0.7,
          new T.MeshStandardMaterial({
            color: 0xfaf8e8,
            emissive: 0xfff5cd,
            emissiveIntensity: 2,
          }),
        );
        lamps.position.set(x, 24, z);
      }
    this.scene.add(this.labFloor);
    const floor = this.box(
      70,
      0.5,
      100,
      new T.MeshStandardMaterial({
        color: 0x52616b,
        metalness: 0.2,
        roughness: 0.75,
      }),
      this.labFloor,
    );
    floor.position.set(0, -0.25, 0);
    const grid = new T.GridHelper(70, 35, 0xffbc6b, 0x83909a);
    grid.position.y = 0.01;
    this.labFloor.add(grid);
    this.resetTruck();
    window.addEventListener("resize", () => this.resize());
    this.resize();
    this.scene.add(this.hazards);
    for (const h of HAZARDS) {
      const g = new T.Group();
      g.position.set(h.x, h.y, h.z);
      g.userData.hazard = h;
      this.hazards.add(g);
      if (h.kind === "hammer") {
        const rotor = new T.Group();
        g.add(rotor);
        const metal = pbr("green_metal_rust", 1, {
          color: 0x9ba7a8,
          metalness: 0.8,
          roughness: 0.5,
        });
        this.box(7.2, 0.6, 0.9, metal, rotor);
        for (const side of [-1, 1]) {
          const head = this.box(1.6, 1.6, 1.5, metal, rotor);
          head.position.x = side * 3.6;
          const tip = new T.Mesh(new T.ConeGeometry(0.65, 1.8, 24), metal);
          tip.name = `hammer-spike-${side}`;
          tip.position.x = side * 5.1;
          tip.rotation.z = (-side * Math.PI) / 2;
          tip.castShadow = true;
          rotor.add(tip);
        }
        const support = this.box(0.6, 8, 0.6, metal, g);
        support.position.set(0, -2, 1.4);
      }
      if (h.kind === "spikes") {
        const mat = pbr("green_metal_rust", 1, {
          color: 0xb7bdc0,
          metalness: 0.85,
          roughness: 0.4,
        });
        for (let x = -5; x <= 5; x += 1)
          for (let z = -1; z <= 1; z++) {
            const spike = new T.Mesh(new T.ConeGeometry(0.45, 2.4, 20), mat);
            spike.position.set(x, 0, z);
            g.add(spike);
          }
      }
      if (h.kind === "fire") {
        const mat = flameMaterial();
        for (let i = 0; i < 18; i++) {
          const flame = new T.Mesh(new T.PlaneGeometry(1.35, 3.6), mat);
          flame.position.set((i - 8.5) * 0.65, 0, Math.sin(i) * 0.4);
          flame.rotation.y = -0.6;
          g.add(flame);
        }
        const nozzle = this.box(
          12,
          0.25,
          0.6,
          pbr("green_metal_rust", 1, { metalness: 0.8 }),
          g,
        );
        nozzle.position.y = -1.2;
      }
    }
  }
  box(
    w: number,
    h: number,
    d: number,
    mat: T.Material,
    parent: T.Object3D = this.scene,
  ) {
    const geometry = new T.BoxGeometry(w, h, d);
    const tile = mat.userData.tile;
    if (tile) {
      const p = geometry.attributes.position,
        n = geometry.attributes.normal,
        uv = geometry.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        if (Math.abs(n.getY(i)) > 0.5)
          uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
        else if (Math.abs(n.getX(i)) > 0.5)
          uv.setXY(i, p.getZ(i) / tile, p.getY(i) / tile);
        else uv.setXY(i, p.getX(i) / tile, p.getY(i) / tile);
      }
    }
    const m = new T.Mesh(geometry, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  label(text: string, fg: string, bg: string, w = 512, h = 128) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.font = `900 ${h * 0.56}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2, w * 0.93);
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    return new T.Mesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }),
    );
  }
  resetTruck() {
    this.truck.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => {
          if (
            m instanceof T.MeshBasicMaterial &&
            m.map instanceof T.CanvasTexture
          )
            m.map.dispose();
          m.dispose();
        });
      }
    });
    this.scene.remove(this.truck);
    const metal = pbr("green_metal_rust", 1, {
      color: 0xc3c9c9,
      metalness: 0.7,
      roughness: 0.4,
    });
    const paint = new T.MeshPhysicalMaterial({
      color: 0xe65921,
      metalness: 0.3,
      roughness: 0.4,
      normalMap: metal.normalMap,
      roughnessMap: metal.roughnessMap,
      normalScale: new T.Vector2(0.18, 0.18),
      clearcoat: 0.8,
      clearcoatRoughness: 0.3,
    });
    this.truck = createTruck({ paint, metal });
    this.scene.add(this.truck);
    this.meshes.clear();
    this.dentCounts.clear();
    this.snapCamera = true;
    this.chase.reset();
    this.lastCameraTime = 0;
    for (const def of PARTS)
      this.meshes.set(def.id, this.truck.getObjectByName(def.id) as T.Group);
    for (const side of [-1, 1]) {
      const decal = this.label("IRON FLIGHT", "#fff0ce", "#ac401e", 512, 128);
      decal.scale.set(1.25, 0.31, 1);
      decal.rotation.y = (side * Math.PI) / 2;
      decal.position.set(side * 0.116, 0.03, 0);
      this.meshes.get(side < 0 ? "door-left" : "door-right")!.add(decal);
    }
  }
  stats() {
    return {
      ...truckStats(this.truck),
      ...this.loop.stats(),
      courseVisible: this.course.visible,
      drawCalls: this.renderer.info.render.calls,
      renderTriangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    };
  }
  resize() {
    const host = this.renderer.domElement.parentElement!;
    const w = host.clientWidth,
      h = host.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  render(snap = false, alpha = 1, draw = true) {
    const s = this.simulation,
      root = s.previousPosition.clone().lerp(s.body.translation(), alpha),
      q = s.previousRotation
        .clone()
        .slerp(new T.Quaternion().copy(s.body.rotation()), alpha);
    this.labFloor.visible = s.stage === "lab";
    this.course.visible = s.stage !== "lab";
    this.hazards.visible = s.stage !== "lab";
    this.loop.update(s.time);
    for (const g of this.hazards.children) {
      const h = g.userData.hazard;
      if (h.kind === "hammer") g.children[0].rotation.z = hammerAngle(s.time);
      if (h.kind === "fire")
        g.children.forEach((f, i) => {
          if (i < 18) {
            f.scale.y = 0.8 + 0.35 * Math.sin(s.time * 13 + i * 4);
            f.position.y = 0.1 + f.scale.y * 0.4;
            ((f as T.Mesh).material as T.ShaderMaterial).uniforms.time.value =
              s.time;
          }
        });
    }
    for (const def of PARTS) {
      const state = s.parts.get(def.id)!,
        g = this.meshes.get(def.id)!;
      g.userData.detached = !!state.body;
      if (state.body) {
        g.position.copy(state.body.translation());
        g.quaternion.copy(state.body.rotation());
      } else {
        const local = new T.Vector3(...def.pos);
        const wi = PARTS.slice(2, 6).findIndex((p) => p.id === def.id);
        if (wi >= 0) {
          local.copy(wheelPositions[wi]);
          local.y -= s.vehicle.wheelSuspensionLength(wi) ?? 0.6;
        }
        g.position.copy(local.applyQuaternion(q).add(root));
        g.quaternion.copy(q);
        if (wi >= 0) {
          g.rotateY(s.vehicle.wheelSteering(wi) ?? 0);
          g.rotateX(s.vehicle.wheelRotation(wi) ?? 0);
        }
      }
      const old = this.dentCounts.get(def.id) ?? 0;
      for (let i = old; i < state.dents.length; i++) {
        const mesh = g.children[0] as T.Mesh;
        deformGeometry(
          mesh.geometry,
          state.dents[i].point,
          state.dents[i].strength,
        );
      }
      this.dentCounts.set(def.id, state.dents.length);
    }
    const renderTime = Math.max(0, (s.ticks - 1 + alpha) * DT),
      elapsed = Math.max(0, renderTime - this.lastCameraTime);
    this.lastCameraTime = renderTime;
    const debris = s.parts.get("chassis-front")?.body;
    this.chase.update(
      debris ? new T.Vector3().copy(debris.translation()) : root,
      q,
      elapsed,
      this.snapCamera || snap,
    );
    this.snapCamera = false;
    if (draw) this.renderer.render(this.scene, this.camera);
  }
  inspectCamera() {
    const p = this.camera.position;
    return {
      position: { x: p.x, y: p.y, z: p.z },
      orbit: { yaw: this.chase.yaw, pitch: this.chase.pitch },
      distance: this.chase.distance,
      landmarks: [-57, 57].flatMap((x) =>
        [-90, 0, 95].map((z) => {
          const p = new T.Vector3(x, 11, z).project(this.camera);
          return { id: `pole-${x}-${z}`, x: p.x, y: p.y, z: p.z };
        }),
      ),
    };
  }
  inspectSigns() {
    return ROUTES.map((r) => {
      const sign = this.scene.getObjectByName(`finish-sign-${r.id}-front`)!;
      sign.updateWorldMatrix(true, false);
      const camera = new T.PerspectiveCamera(55, 1, 0.1, 100);
      camera.position.set(r.x, 5, r.finish - 15);
      camera.lookAt(sign.position);
      camera.updateMatrixWorld();
      const a = sign.localToWorld(new T.Vector3(-0.5, 0, 0)).project(camera),
        b = sign.localToWorld(new T.Vector3(0.5, 0, 0)).project(camera);
      const normal = new T.Vector3(0, 0, 1).applyQuaternion(sign.quaternion);
      return {
        name: r.name,
        facingApproach:
          normal.dot(camera.position.clone().sub(sign.position)) > 0,
        textRunsLeftToRight: b.x > a.x,
      };
    });
  }
}
