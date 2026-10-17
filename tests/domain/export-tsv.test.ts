import { describe, expect, it } from "vitest";
import { aggregateCutList } from "../../src/domain/aggregate-cut-list";
import {
  formatCutListAsTsv,
  formatTsvNumber,
  sanitizeTsvText,
} from "../../src/domain/export-tsv";
import { generateCutList } from "../../src/domain/generate-cut-list";
import type { CutListItem } from "../../src/domain/types";
import { design } from "../acceptance/helpers";

const HEADER = "Component\tMaterial\tLength (mm)\tWidth (mm)\tQuantity";

function tsvFor(...overrides: Parameters<typeof design>[0][]): string {
  const items = overrides.flatMap((o) => generateCutList(design(o)));
  return formatCutListAsTsv(aggregateCutList(items));
}

function item(over: Partial<CutListItem> = {}): CutListItem {
  return {
    componentType: "door",
    componentLabel: "Door",
    materialId: "door-material",
    materialLabel: "Door material",
    dimensions: { kind: "sheet", heightMm: 10, widthMm: 20 },
    quantity: 1,
    ...over,
  };
}

describe("formatCutListAsTsv", () => {
  it("returns only the header for an empty list (no trailing newline)", () => {
    expect(formatCutListAsTsv([])).toBe(HEADER);
  });

  it("acceptance A", () => {
    expect(
      tsvFor({
        name: "Wall-500-Single",
        heightMm: 600,
        widthMm: 500,
        depthMm: 300,
        type: "wall",
        doorCount: 1,
        quantity: 1,
      }),
    ).toBe(
      [
        HEADER,
        "Side panel\t18 mm cabinet board\t600\t300\t2",
        "Top panel\t18 mm cabinet board\t464\t300\t1",
        "Bottom panel\t18 mm cabinet board\t464\t300\t1",
        "Back panel\tThin backing board\t600\t500\t1",
        "Door\tDoor material\t595\t497\t1",
      ].join("\n"),
    );
  });

  it("acceptance B", () => {
    expect(
      tsvFor({
        name: "Wall-800-Double",
        heightMm: 720,
        widthMm: 800,
        depthMm: 350,
        type: "wall",
        doorCount: 2,
        quantity: 1,
      }),
    ).toBe(
      [
        HEADER,
        "Side panel\t18 mm cabinet board\t720\t350\t2",
        "Top panel\t18 mm cabinet board\t764\t350\t1",
        "Bottom panel\t18 mm cabinet board\t764\t350\t1",
        "Back panel\tThin backing board\t720\t800\t1",
        "Door\tDoor material\t715\t397\t2",
      ].join("\n"),
    );
  });

  it("acceptance C", () => {
    expect(
      tsvFor({
        name: "Base-600-Single",
        heightMm: 720,
        widthMm: 600,
        depthMm: 560,
        type: "base",
        doorCount: 1,
        quantity: 1,
      }),
    ).toBe(
      [
        HEADER,
        "Side panel\t18 mm cabinet board\t720\t560\t2",
        "Bottom panel\t18 mm cabinet board\t564\t560\t1",
        "Top support strip\t18 mm cabinet board\t564\t100\t2",
        "Back panel\tThin backing board\t720\t600\t1",
        "Door\tDoor material\t715\t597\t1",
      ].join("\n"),
    );
  });

  it("acceptance D (three base cupboards, no thousands separators)", () => {
    expect(
      tsvFor({
        name: "Base-900-Double",
        heightMm: 720,
        widthMm: 900,
        depthMm: 560,
        type: "base",
        doorCount: 2,
        quantity: 3,
      }),
    ).toBe(
      [
        HEADER,
        "Side panel\t18 mm cabinet board\t720\t560\t6",
        "Bottom panel\t18 mm cabinet board\t864\t560\t3",
        "Top support strip\t18 mm cabinet board\t864\t100\t6",
        "Back panel\tThin backing board\t720\t900\t3",
        "Door\tDoor material\t715\t447\t6",
      ].join("\n"),
    );
  });

  it("keeps the given row order", () => {
    const out = formatCutListAsTsv([
      item({ componentLabel: "Zed" }),
      item({ componentLabel: "Alpha" }),
    ]);
    expect(out.split("\n").map((r) => r.split("\t")[0])).toEqual([
      "Component",
      "Zed",
      "Alpha",
    ]);
  });

  it("maps panels to length/depth and sheets to height/width", () => {
    const out = formatCutListAsTsv([
      item({ dimensions: { kind: "panel", lengthMm: 464, depthMm: 300 } }),
      item({ dimensions: { kind: "sheet", heightMm: 595, widthMm: 497 } }),
    ]);
    const rows = out.split("\n").slice(1);
    expect(rows[0]).toBe("Door\tDoor material\t464\t300\t1");
    expect(rows[1]).toBe("Door\tDoor material\t595\t497\t1");
  });

  it("uses a dot for fractions and no thousands separators", () => {
    const out = formatCutListAsTsv([
      item({
        dimensions: { kind: "sheet", heightMm: 1200, widthMm: 497.5 },
        quantity: 12000,
      }),
    ]);
    expect(out.split("\n")[1]).toBe("Door\tDoor material\t1200\t497.5\t12000");
  });

  it("neutralises tabs and newlines in text", () => {
    const out = formatCutListAsTsv([
      item({ componentLabel: "A\tB\r\nC\nD", materialLabel: "  x \t y  " }),
    ]);
    const lines = out.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]?.split("\t")).toEqual(["A B C D", "x y", "10", "20", "1"]);
  });
});

describe("sanitizeTsvText", () => {
  it("prefixes formula-like text with an apostrophe", () => {
    for (const s of ["=1+1", "+1", "-1", "@SUM(A1)"]) {
      expect(sanitizeTsvText(s)).toBe(`'${s}`);
    }
  });
  it("leaves ordinary text unchanged", () => {
    expect(sanitizeTsvText("18 mm cabinet board")).toBe("18 mm cabinet board");
  });
  it("checks the start after collapsing whitespace", () => {
    expect(sanitizeTsvText("\t=1")).toBe("'=1");
  });
});

describe("formatTsvNumber", () => {
  it("formats plain, fractional and negative-zero values", () => {
    expect(formatTsvNumber(1200)).toBe("1200");
    expect(formatTsvNumber(497.5)).toBe("497.5");
    expect(formatTsvNumber(-0)).toBe("0");
  });
  it("avoids exponent notation", () => {
    expect(formatTsvNumber(1e21)).toBe("1000000000000000000000");
    expect(formatTsvNumber(1e-7)).toBe("0.0000001");
    expect(formatTsvNumber(1.5e-7)).toBe("0.00000015");
  });
});
