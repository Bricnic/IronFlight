import { expect, it } from "vitest";
import { defaultTextureFor } from "../src/course-view";

const solid = (id: string, kind: string) => ({ id, kind });

it("resolves custom-level defaults", () => {
  const track = "custom:Clone Harbor Sprint";
  expect(defaultTextureFor(track, solid("ground", "ground"))).toBe(
    "concrete_floor_02",
  );
  expect(defaultTextureFor(track, solid("road-1", "road"))).toBe("asphalt_02");
  expect(defaultTextureFor(track, solid("ramp-1", "ramp"))).toBe("asphalt_02");
  expect(defaultTextureFor(track, solid("loop-1", "loop"))).toBe("asphalt_02");
  expect(defaultTextureFor(track, solid("barrier-1", "barrier"))).toBeUndefined();
  expect(defaultTextureFor(track, solid("lava-1", "lava"))).toBeUndefined();
});

it("resolves official track ground and road maps", () => {
  expect(defaultTextureFor("canyon-plunge", solid("g", "ground"))).toBe(
    "cracked_red_ground",
  );
  expect(defaultTextureFor("canyon-plunge", solid("r", "road"))).toBe(
    "coast_sand_rocks_02",
  );
  expect(defaultTextureFor("haunted-hollow", solid("g", "ground"))).toBe(
    "brown_mud_leaves_01",
  );
  expect(defaultTextureFor("sky-slide", solid("g", "ground"))).toBe(
    "grass_ground",
  );
  expect(defaultTextureFor("sky-slide", solid("r", "road"))).toBe(
    "blue_plaster_wall",
  );
  expect(defaultTextureFor("foundry-run", solid("g", "ground"))).toBe(
    "concrete_layers_02",
  );
  expect(defaultTextureFor("harbor-sprint", solid("g", "ground"))).toBe(
    "concrete_floor_02",
  );
});

it("resolves id-based stone and cliff defaults", () => {
  expect(defaultTextureFor("inferno-vault", solid("vault-wall-1", "vault"))).toBe(
    "rock_06",
  );
  expect(
    defaultTextureFor("haunted-hollow", solid("crypt-3", "barrier")),
  ).toBe("monastery_stone_floor");
  expect(defaultTextureFor("custom:x", solid("gorge-2", "ground"))).toBe(
    "dark_rock_02",
  );
  // crypt-door is excluded from the stone rule and falls back to kind.
  expect(
    defaultTextureFor("haunted-hollow", solid("crypt-door", "barrier")),
  ).toBeUndefined();
});
