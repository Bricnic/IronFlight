import { expect, it } from "vitest";
import * as T from "three";
import { createTruck } from "../src/truck";
import {
  bodyBounds,
  buildHeadlightRig,
  setHeadlightRig,
} from "../src/headlights";

function riggedTruck(day: boolean) {
  const truck = createTruck();
  const rig = buildHeadlightRig();
  truck.getObjectByName("hood")!.add(rig);
  setHeadlightRig(rig, !day);
  truck.updateMatrixWorld(true);
  return { truck, rig };
}

it("sees the 24-unit beams in naive truck bounds", () => {
  const { truck } = riggedTruck(true);
  const naive = new T.Box3().setFromObject(truck);
  expect(naive.getSize(new T.Vector3()).length()).toBeGreaterThan(20);
});

it.each([true, false])(
  "excludes the headlight rig from body bounds (day=%s)",
  (day) => {
    const { truck, rig } = riggedTruck(day);
    const tight = bodyBounds(truck, rig);
    expect(tight.getSize(new T.Vector3()).length()).toBeLessThan(14);
    truck.getObjectByName("hood")!.remove(rig);
    truck.updateMatrixWorld(true);
    const bare = new T.Box3().setFromObject(truck);
    expect(tight.min.toArray()).toEqual(bare.min.toArray());
    expect(tight.max.toArray()).toEqual(bare.max.toArray());
  },
);
