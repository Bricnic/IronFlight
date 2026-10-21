import { beforeAll, expect, it } from "vitest";
import { colorHSV, hsvColor } from "../src/color-picker";
import { Simulation, initPhysics } from "../src/simulation";
import { createTruck } from "../src/truck";
import { TruckFireView } from "../src/truck-fire";
import * as T from "three";
beforeAll(initPhysics);

it("wheel colors round-trip through hue, saturation and brightness", () => {
  for (const color of [
    0, 0xffffff, 0xff0000, 0x00ff00, 0x0000ff, 0xe65921, 0x236bff, 0xec2fd3,
  ])
    expect(hsvColor(colorHSV(color))).toBe(color);
});

it("repaints both material groups, including rims and detached parts, while preserving soot", () => {
  const sim = new Simulation("lab");
  const truck = createTruck();
  const view = new TruckFireView();
  view.reset(truck);
  sim.setTuning({ primaryColor: 0x236bff, secondaryColor: 0xec2fd3 });
  view.update(sim, new T.Vector3());
  expect(view.inspect().palette).toEqual({
    primary: "236bff",
    secondary: "ec2fd3",
  });
  let rimCount = 0;
  truck.getObjectByName("wheel-fl")!.traverse((o) => {
    if (
      o instanceof T.Mesh &&
      o.material instanceof T.MeshStandardMaterial &&
      o.material.userData.truckColorSlot === "secondaryColor"
    ) {
      expect(o.material.color.getHexString()).toBe("ec2fd3");
      rimCount++;
    }
  });
  expect(rimCount).toBeGreaterThan(0);
  sim.damage("door-left", 10000);
  sim.parts.get("door-left")!.lava = {
    entered: 0,
    progress: 0.5,
    surface: -5.925,
    startY: -5,
    endY: -7,
    scorch: 0.7,
  };
  sim.setTuning({ primaryColor: 0x00ff00 });
  view.update(sim, new T.Vector3());
  for (const id of ["door-left", "door-right"]) {
    const mesh = truck.getObjectByName(id)!.children[0] as T.Mesh<
      T.BufferGeometry,
      T.MeshStandardMaterial
    >;
    expect(mesh.material.color.g).toBeCloseTo(id === "door-left" ? 0.09 : 1);
  }
  expect(view.inspect().palette.secondary).toBe("ec2fd3");
  sim.reset();
  expect(sim.tuning.primaryColor).toBe(0x00ff00);
  expect(() => sim.setTuning({ primaryColor: -1 })).toThrow();
  expect(() => sim.setTuning({ secondaryColor: 0x1000000 })).toThrow();
  sim.dispose();
});
