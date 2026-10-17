import { describe, expect, it } from "vitest";
import { aggregateCutList } from "../../src/domain/aggregate-cut-list";
import { generateCutList } from "../../src/domain/generate-cut-list";
import type { CutListItem } from "../../src/domain/types";
import { design } from "./helpers";

const A = design({
  name: "Wall-500-Single",
  heightMm: 600,
  widthMm: 500,
  depthMm: 300,
  type: "wall",
  doorCount: 1,
  quantity: 1,
});
const C = design({
  name: "Base-600-Single",
  heightMm: 720,
  widthMm: 600,
  depthMm: 560,
  type: "base",
  doorCount: 1,
  quantity: 1,
});

/** Compact, order-sensitive view: [component, material, kind:dims, qty]. */
const view = (items: CutListItem[]) =>
  items.map((i) => {
    const d = i.dimensions;
    const dims =
      d.kind === "panel"
        ? `${d.lengthMm}x${d.depthMm}`
        : `${d.heightMm}x${d.widthMm}`;
    return [i.componentType, i.materialId, `${d.kind}:${dims}`, i.quantity];
  });

describe("acceptance: combined order of designs A and C", () => {
  const combined = aggregateCutList([
    ...generateCutList(A),
    ...generateCutList(C),
  ]);

  it("matches the hand-computed combined order, in documented order", () => {
    expect(view(combined)).toEqual([
      ["side-panel", "cabinet-board-18mm", "panel:600x300", 2],
      ["side-panel", "cabinet-board-18mm", "panel:720x560", 2],
      ["top-panel", "cabinet-board-18mm", "panel:464x300", 1],
      ["bottom-panel", "cabinet-board-18mm", "panel:464x300", 1],
      ["bottom-panel", "cabinet-board-18mm", "panel:564x560", 1],
      ["top-support-strip", "cabinet-board-18mm", "panel:564x100", 2],
      ["back-panel", "thin-backing-board", "sheet:600x500", 1],
      ["back-panel", "thin-backing-board", "sheet:720x600", 1],
      ["door", "door-material", "sheet:595x497", 1],
      ["door", "door-material", "sheet:715x597", 1],
    ]);
  });

  it("is independent of design order", () => {
    expect(
      aggregateCutList([...generateCutList(C), ...generateCutList(A)]),
    ).toEqual(combined);
  });

  it("conserves piece count (A has 6 pieces, C has 7)", () => {
    expect(combined.reduce((n, i) => n + i.quantity, 0)).toBe(13);
  });
});

describe("acceptance: designs deliberately sharing part dimensions", () => {
  it("merges every part of two identically sized, differently named designs", () => {
    const first = { ...A, id: "1", name: "Left wall unit", quantity: 1 };
    const second = { ...A, id: "2", name: "Right wall unit", quantity: 2 };
    const out = aggregateCutList([
      ...generateCutList(first),
      ...generateCutList(second),
    ]);
    expect(view(out)).toEqual([
      ["side-panel", "cabinet-board-18mm", "panel:600x300", 6],
      ["top-panel", "cabinet-board-18mm", "panel:464x300", 3],
      ["bottom-panel", "cabinet-board-18mm", "panel:464x300", 3],
      ["back-panel", "thin-backing-board", "sheet:600x500", 3],
      ["door", "door-material", "sheet:595x497", 3],
    ]);
  });

  it("merges only the shared parts of two designs of different heights", () => {
    const tall = { ...A, id: "2", name: "Tall", heightMm: 700 };
    const out = aggregateCutList([
      ...generateCutList(A),
      ...generateCutList(tall),
    ]);
    expect(view(out)).toEqual([
      ["side-panel", "cabinet-board-18mm", "panel:600x300", 2],
      ["side-panel", "cabinet-board-18mm", "panel:700x300", 2],
      ["top-panel", "cabinet-board-18mm", "panel:464x300", 2],
      ["bottom-panel", "cabinet-board-18mm", "panel:464x300", 2],
      ["back-panel", "thin-backing-board", "sheet:600x500", 1],
      ["back-panel", "thin-backing-board", "sheet:700x500", 1],
      ["door", "door-material", "sheet:595x497", 1],
      ["door", "door-material", "sheet:695x497", 1],
    ]);
  });
});
