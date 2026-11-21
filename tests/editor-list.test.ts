import { expect, it } from "vitest";
import { partitionListKinds } from "../src/editor-list";
it("creates kind sections only above two instances, distinguishing solids and prefabs", () => {
  const rows = [0, 1, 2].map(i => ({ id: i, kindKey: "prefab:candle", count: 1 }));
  rows.push({ id: 3, kindKey: "solid:candle", count: 1 }, { id: 4, kindKey: "solid:candle", count: 1 });
  expect(partitionListKinds(rows).map(s => [s.kindKey, s.count])).toEqual([["prefab:candle", 3], [undefined, 1], [undefined, 1]]);
});
it("counts group members and retains uncategorized rows", () => {
  const mixed = { kindKey: undefined, count: 20 };
  expect(partitionListKinds([{ kindKey: "prefab:fragile-ice", count: 500 }, mixed])).toEqual([
    { kindKey: "prefab:fragile-ice", count: 500, rows: [{ kindKey: "prefab:fragile-ice", count: 500 }] },
    { count: 20, rows: [mixed] },
  ]);
});
