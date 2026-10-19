import { describe, expect, it } from "vitest";
import { generateCutList } from "../../src/domain/generate-cut-list";
import { design, only, sortItems } from "./helpers";
import type { ExpectedPiece } from "./helpers";

const BOARD = {
  materialId: "cabinet-board-18mm",
  materialLabel: "18 mm-es bútorlap",
} as const;
const BACK = {
  materialId: "thin-backing-board",
  materialLabel: "Hátfal (vékony farostlemez)",
} as const;
const DOOR = {
  materialId: "door-material",
  materialLabel: "Ajtó alapanyaga",
} as const;

const panel = (lengthMm: number, depthMm: number) =>
  ({ kind: "panel", lengthMm, depthMm }) as const;
const sheet = (heightMm: number, widthMm: number) =>
  ({ kind: "sheet", heightMm, widthMm }) as const;

const side = (l: number, d: number, quantity: number): ExpectedPiece => ({
  componentType: "side-panel",
  componentLabel: "Oldallap",
  ...BOARD,
  dimensions: panel(l, d),
  quantity,
});
const top = (l: number, d: number, quantity: number): ExpectedPiece => ({
  componentType: "top-panel",
  componentLabel: "Felső lap",
  ...BOARD,
  dimensions: panel(l, d),
  quantity,
});
const bottom = (l: number, d: number, quantity: number): ExpectedPiece => ({
  componentType: "bottom-panel",
  componentLabel: "Alsó lap",
  ...BOARD,
  dimensions: panel(l, d),
  quantity,
});
const strip = (l: number, d: number, quantity: number): ExpectedPiece => ({
  componentType: "top-support-strip",
  componentLabel: "Merevítő léc",
  ...BOARD,
  dimensions: panel(l, d),
  quantity,
});
const back = (h: number, w: number, quantity: number): ExpectedPiece => ({
  componentType: "back-panel",
  componentLabel: "Hátlap",
  ...BACK,
  dimensions: sheet(h, w),
  quantity,
});
const door = (h: number, w: number, quantity: number): ExpectedPiece => ({
  componentType: "door",
  componentLabel: "Ajtó",
  ...DOOR,
  dimensions: sheet(h, w),
  quantity,
});

interface Case {
  title: string;
  input: Parameters<typeof design>[0];
  expected: ExpectedPiece[];
}

const cases: Case[] = [
  {
    title: "A: wall cupboard, single door",
    input: {
      name: "Wall-500-Single",
      heightMm: 600,
      widthMm: 500,
      depthMm: 300,
      type: "wall",
      doorCount: 1,
      quantity: 1,
    },
    expected: [
      side(600, 300, 2),
      top(464, 300, 1),
      bottom(464, 300, 1),
      back(600, 500, 1),
      door(595, 497, 1),
    ],
  },
  {
    title: "B: wall cupboard, two doors",
    input: {
      name: "Wall-800-Double",
      heightMm: 720,
      widthMm: 800,
      depthMm: 350,
      type: "wall",
      doorCount: 2,
      quantity: 1,
    },
    expected: [
      side(720, 350, 2),
      top(764, 350, 1),
      bottom(764, 350, 1),
      back(720, 800, 1),
      door(715, 397, 2),
    ],
  },
  {
    title: "C: base cupboard, single door",
    input: {
      name: "Base-600-Single",
      heightMm: 720,
      widthMm: 600,
      depthMm: 560,
      type: "base",
      doorCount: 1,
      quantity: 1,
    },
    expected: [
      side(720, 560, 2),
      bottom(564, 560, 1),
      strip(564, 100, 2),
      back(720, 600, 1),
      door(715, 597, 1),
    ],
  },
  {
    title: "D: three base cupboards, two doors each",
    input: {
      name: "Base-900-Double",
      heightMm: 720,
      widthMm: 900,
      depthMm: 560,
      type: "base",
      doorCount: 2,
      quantity: 3,
    },
    expected: [
      side(720, 560, 6),
      bottom(864, 560, 3),
      strip(864, 100, 6),
      back(720, 900, 3),
      door(715, 447, 6),
    ],
  },
];

describe.each(cases)("acceptance $title", ({ input, expected }) => {
  const actual = sortItems(generateCutList(design(input)));
  const want = sortItems(expected);

  it("produces exactly the expected set of components", () => {
    expect(actual.map((i) => i.componentType)).toEqual(
      want.map((i) => i.componentType),
    );
  });

  it("has the expected materials and labels", () => {
    expect(
      actual.map((i) => [i.materialId, i.materialLabel, i.componentLabel]),
    ).toEqual(
      want.map((i) => [
        i.materialId,
        i.materialLabel,
        `${input.name} ${i.componentLabel}`,
      ]),
    );
  });

  it("has the expected dimensions", () => {
    expect(actual.map((i) => i.dimensions)).toEqual(
      want.map((i) => i.dimensions),
    );
  });

  it("has the expected quantities", () => {
    expect(actual.map((i) => i.quantity)).toEqual(want.map((i) => i.quantity));
  });

  it("tags every item with the source design name", () => {
    expect(actual.every((i) => i.sourceDesignName === input.name)).toBe(true);
  });
});

describe("acceptance B: double-door checks", () => {
  const items = generateCutList(
    design({
      name: "Wall-800-Double",
      heightMm: 720,
      widthMm: 800,
      depthMm: 350,
      doorCount: 2,
    }),
  );

  it("emits both doors as one line, so they have identical dimensions", () => {
    const doors = items.filter((i) => i.componentType === "door");
    expect(doors).toHaveLength(1);
    expect(doors[0]?.quantity).toBe(2);
  });

  it("accounts for the full width: 397 + 397 + 3 centre gap + 3 outside = 800", () => {
    const d = only(items, "door").dimensions;
    if (d.kind !== "sheet") throw new Error("door must be a sheet");
    expect(d.widthMm).toBe(397);
    expect(d.widthMm + d.widthMm + 3 + 3).toBe(800);
  });
});

describe("acceptance C: base cupboard structure", () => {
  const items = generateCutList(
    design({
      name: "Base-600-Single",
      heightMm: 720,
      widthMm: 600,
      depthMm: 560,
      type: "base",
    }),
  );

  it("has no top panel", () => {
    expect(items.some((i) => i.componentType === "top-panel")).toBe(false);
  });

  it("has exactly two support strips, 100 mm deep", () => {
    const strips = items.filter((i) => i.componentType === "top-support-strip");
    expect(strips.reduce((n, i) => n + i.quantity, 0)).toBe(2);
    expect(only(items, "top-support-strip").dimensions).toEqual(
      panel(564, 100),
    );
  });
});

describe("acceptance D: quantity scaling", () => {
  const base = {
    name: "x",
    heightMm: 720,
    widthMm: 900,
    depthMm: 560,
    type: "base",
    doorCount: 2,
  } as const;
  const one = generateCutList(design({ ...base, quantity: 1 }));
  const three = generateCutList(design({ ...base, quantity: 3 }));

  it("scales every component quantity by three", () => {
    expect(three.map((i) => i.quantity)).toEqual(
      one.map((i) => i.quantity * 3),
    );
  });

  it("leaves dimensions unchanged by quantity", () => {
    expect(three.map((i) => i.dimensions)).toEqual(
      one.map((i) => i.dimensions),
    );
  });

  it("has no top panel", () => {
    expect(three.some((i) => i.componentType === "top-panel")).toBe(false);
  });
});
