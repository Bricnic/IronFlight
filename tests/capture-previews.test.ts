import { describe, expect, it } from "vitest";
import { selectVehicle } from "../scripts/capture-level-previews.mjs";

const GARAGE = ["monster-truck", "sports-car", "school-bus"];

describe("preview vehicle picker", () => {
  it("walks garage order by lineup index by default", () => {
    expect(selectVehicle(GARAGE, 0)).toBe("monster-truck");
    expect(selectVehicle(GARAGE, 1)).toBe("sports-car");
    expect(selectVehicle(GARAGE, 3)).toBe("monster-truck");
  });

  it("pins an exact vehicle id", () => {
    expect(selectVehicle(GARAGE, 0, { vehicle: "school-bus" })).toBe("school-bus");
    expect(() => selectVehicle(GARAGE, 0, { vehicle: "nope" })).toThrow("Unknown vehicle");
  });

  it("throws with an empty garage", () => {
    expect(() => selectVehicle([], 0)).toThrow("No vehicles");
  });

  it("picks uniformly at random across the whole garage", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const pick = selectVehicle(GARAGE, 0, { random: true });
      expect(GARAGE).toContain(pick);
      seen.add(pick);
    }
    expect([...seen].sort()).toEqual([...GARAGE].sort());
  });
});
