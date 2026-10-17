import { describe, expect, it } from "vitest";
import { aggregateCutList } from "../../src/domain/aggregate-cut-list";
import { pieceDimensionsKey } from "../../src/domain/dimensions";
import { generateCutList } from "../../src/domain/generate-cut-list";
import type {
  ComponentType,
  CutListItem,
  MaterialId,
  PieceDimensions,
} from "../../src/domain/types";
import { design } from "../acceptance/helpers";

function item(
  componentType: ComponentType,
  materialId: MaterialId,
  dimensions: PieceDimensions,
  quantity: number,
  sourceDesignName?: string,
): CutListItem {
  return {
    componentType,
    componentLabel: `label-${componentType}`,
    materialId,
    materialLabel: `label-${materialId}`,
    dimensions,
    quantity,
    ...(sourceDesignName === undefined ? {} : { sourceDesignName }),
  };
}

const panel = (lengthMm: number, depthMm: number): PieceDimensions => ({
  kind: "panel",
  lengthMm,
  depthMm,
});
const sheet = (heightMm: number, widthMm: number): PieceDimensions => ({
  kind: "sheet",
  heightMm,
  widthMm,
});
const total = (items: CutListItem[]) =>
  items.reduce((n, i) => n + i.quantity, 0);

describe("aggregateCutList", () => {
  it("merges identical designs' parts and sums quantities", () => {
    const d = design({ name: "A" });
    const out = aggregateCutList([
      ...generateCutList(d),
      ...generateCutList({ ...d, name: "B", quantity: 2 }),
    ]);
    expect(out).toHaveLength(5);
    // side(2), top, bottom, back, door -> each x3 total cupboards
    expect(out.map((i) => i.quantity)).toEqual([6, 3, 3, 3, 3]);
  });

  it("keeps different dimensions as separate lines", () => {
    const out = aggregateCutList([
      item("side-panel", "cabinet-board-18mm", panel(600, 300), 2),
      item("side-panel", "cabinet-board-18mm", panel(600, 350), 2),
    ]);
    expect(out).toHaveLength(2);
  });

  it("keeps different materials separate even with equal dimensions", () => {
    const out = aggregateCutList([
      item("back-panel", "thin-backing-board", sheet(600, 500), 1),
      item("back-panel", "door-material", sheet(600, 500), 1),
    ]);
    expect(out.map((i) => i.materialId)).toEqual([
      "thin-backing-board",
      "door-material",
    ]);
  });

  it("keeps different component types separate with equal material and dimensions", () => {
    const out = aggregateCutList([
      item("top-panel", "cabinet-board-18mm", panel(464, 300), 1),
      item("bottom-panel", "cabinet-board-18mm", panel(464, 300), 1),
    ]);
    expect(out.map((i) => i.componentType)).toEqual([
      "top-panel",
      "bottom-panel",
    ]);
  });

  it("does not merge a panel and a sheet with the same numbers", () => {
    const out = aggregateCutList([
      item("door", "door-material", sheet(600, 300), 1),
      item("door", "door-material", panel(600, 300), 1),
    ]);
    expect(out).toHaveLength(2);
    expect(out.map((i) => i.dimensions.kind)).toEqual(["panel", "sheet"]);
    expect(pieceDimensionsKey(panel(1, 2))).not.toBe(
      pieceDimensionsKey(sheet(1, 2)),
    );
  });

  it("aggregates overlapping dimensions across several designs", () => {
    const out = aggregateCutList([
      ...generateCutList(design({ name: "1", widthMm: 500 })),
      ...generateCutList(design({ name: "2", widthMm: 500, heightMm: 700 })),
      ...generateCutList(design({ name: "3", widthMm: 600 })),
    ]);
    const find = (t: ComponentType, d: PieceDimensions) =>
      out.find(
        (i) =>
          i.componentType === t &&
          pieceDimensionsKey(i.dimensions) === pieceDimensionsKey(d),
      );
    expect(find("top-panel", panel(464, 300))?.quantity).toBe(2);
    expect(find("top-panel", panel(564, 300))?.quantity).toBe(1);
    expect(find("side-panel", panel(600, 300))?.quantity).toBe(4);
    expect(find("side-panel", panel(700, 300))?.quantity).toBe(2);
    expect(find("back-panel", sheet(600, 500))?.quantity).toBe(1);
  });

  it("returns an empty list for an empty list", () => {
    expect(aggregateCutList([])).toEqual([]);
  });

  it("does not mutate its input", () => {
    const input = [
      item("side-panel", "cabinet-board-18mm", panel(600, 300), 2, "A"),
      item("side-panel", "cabinet-board-18mm", panel(600, 300), 2, "B"),
      item("door", "door-material", sheet(595, 497), 1, "A"),
    ];
    const snapshot = structuredClone(input);
    aggregateCutList(input);
    expect(input).toEqual(snapshot);
  });

  it("returns fresh objects that do not alias the input", () => {
    const input = [item("door", "door-material", sheet(595, 497), 1, "A")];
    const out = aggregateCutList(input);
    expect(out[0]).not.toBe(input[0]);
    expect(out[0]?.dimensions).not.toBe(input[0]?.dimensions);
    (out[0] as CutListItem).quantity = 99;
    expect(input[0]?.quantity).toBe(1);
  });

  it("conserves total quantity", () => {
    const input = [
      ...generateCutList(design({ name: "A", quantity: 3 })),
      ...generateCutList(
        design({ name: "B", type: "base", doorCount: 2, widthMm: 900 }),
      ),
      ...generateCutList(design({ name: "C", quantity: 2 })),
    ];
    expect(total(aggregateCutList(input))).toBe(total(input));
  });

  it("omits sourceDesignName on all output lines", () => {
    const out = aggregateCutList([
      item("door", "door-material", sheet(595, 497), 1, "A"),
      item("door", "door-material", sheet(595, 497), 1, "B"),
      item("door", "door-material", sheet(500, 400), 1, "A"),
    ]);
    expect(out).toHaveLength(2);
    for (const i of out) expect("sourceDesignName" in i).toBe(false);
  });

  it("orders by material, component, kind, then dimensions, regardless of input order", () => {
    const input = [
      item("door", "door-material", sheet(715, 597), 1),
      item("back-panel", "thin-backing-board", sheet(720, 600), 1),
      item("top-support-strip", "cabinet-board-18mm", panel(564, 100), 2),
      item("bottom-panel", "cabinet-board-18mm", panel(564, 560), 1),
      item("bottom-panel", "cabinet-board-18mm", panel(464, 300), 1),
      item("side-panel", "cabinet-board-18mm", panel(720, 560), 2),
      item("side-panel", "cabinet-board-18mm", panel(600, 300), 2),
      item("door", "door-material", sheet(595, 497), 1),
    ];
    const out = aggregateCutList(input).map((i) => [
      i.componentType,
      pieceDimensionsKey(i.dimensions),
    ]);
    expect(out).toEqual([
      ["side-panel", "panel:600x300"],
      ["side-panel", "panel:720x560"],
      ["bottom-panel", "panel:464x300"],
      ["bottom-panel", "panel:564x560"],
      ["top-support-strip", "panel:564x100"],
      ["back-panel", "sheet:720x600"],
      ["door", "sheet:595x497"],
      ["door", "sheet:715x597"],
    ]);
    expect(aggregateCutList([...input].reverse())).toEqual(
      aggregateCutList(input),
    );
  });

  it("is idempotent", () => {
    const once = aggregateCutList([
      ...generateCutList(design({ name: "A" })),
      ...generateCutList(design({ name: "B" })),
    ]);
    expect(aggregateCutList(once)).toEqual(once);
  });

  it("distinguishes fractional dimensions", () => {
    const out = aggregateCutList([
      item("door", "door-material", sheet(715, 447.5), 1),
      item("door", "door-material", sheet(715, 447), 1),
      item("door", "door-material", sheet(715, 447.5), 1),
    ]);
    expect(out.map((i) => i.quantity)).toEqual([1, 2]);
  });
});
