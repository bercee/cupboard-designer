import { describe, expect, it } from "vitest";
import { COMPONENT_LABELS, MATERIAL_LABELS } from "../../src/domain/constants";
import { generateCutList } from "../../src/domain/generate-cut-list";
import type { CupboardDesign, PieceDimensions } from "../../src/domain/types";
import { validateCupboardDesign } from "../../src/domain/validation";
import { design, only } from "../acceptance/helpers";

function dimsOf(d: PieceDimensions): number[] {
  return d.kind === "panel" ? [d.lengthMm, d.depthMm] : [d.heightMm, d.widthMm];
}

describe("generateCutList: components per type", () => {
  it("wall: sides, top, bottom, back, door; no strips", () => {
    const types = generateCutList(design({ name: "w", type: "wall" }))
      .map((i) => i.componentType)
      .sort();
    expect(types).toEqual(
      ["back-panel", "bottom-panel", "door", "side-panel", "top-panel"].sort(),
    );
  });

  it("base: sides, bottom, strips, back, door; no top", () => {
    const types = generateCutList(design({ name: "b", type: "base" }))
      .map((i) => i.componentType)
      .sort();
    expect(types).toEqual(
      [
        "back-panel",
        "bottom-panel",
        "door",
        "side-panel",
        "top-support-strip",
      ].sort(),
    );
  });
});

describe("generateCutList: labels and metadata", () => {
  it("uses the centralised labels", () => {
    for (const item of generateCutList(design({ name: "w", type: "base" }))) {
      expect(item.componentLabel).toBe(COMPONENT_LABELS[item.componentType]);
      expect(item.materialLabel).toBe(MATERIAL_LABELS[item.materialId]);
    }
  });

  it("sets sourceDesignName from the design name", () => {
    const items = generateCutList(design({ name: "Pantry left" }));
    expect(items.every((i) => i.sourceDesignName === "Pantry left")).toBe(true);
  });
});

describe("generateCutList: formula boundaries", () => {
  it("minimum valid width (37) gives a 1 mm inner panel", () => {
    const items = generateCutList(design({ name: "m", widthMm: 37 }));
    expect(only(items, "top-panel").dimensions).toEqual({
      kind: "panel",
      lengthMm: 1,
      depthMm: 300,
    });
    expect(only(items, "door").dimensions).toEqual({
      kind: "sheet",
      heightMm: 595,
      widthMm: 34,
    });
  });

  it("minimum valid two-door width (38) gives a 16 mm door", () => {
    const items = generateCutList(
      design({ name: "m", widthMm: 38, doorCount: 2 }),
    );
    expect(only(items, "door").dimensions).toMatchObject({ widthMm: 16 });
  });

  it("height just above 5 mm gives a positive door height", () => {
    const items = generateCutList(design({ name: "m", heightMm: 5.5 }));
    expect(only(items, "door").dimensions).toMatchObject({ heightMm: 0.5 });
  });

  it("passes a fractional one-door width through unrounded", () => {
    const items = generateCutList(design({ name: "f", widthMm: 500.5 }));
    expect(only(items, "door").dimensions).toMatchObject({ widthMm: 497.5 });
    expect(only(items, "top-panel").dimensions).toMatchObject({
      lengthMm: 464.5,
    });
  });

  it("multiplies quantities by the design quantity", () => {
    const items = generateCutList(
      design({ name: "q", quantity: 7, doorCount: 2, widthMm: 800 }),
    );
    expect(only(items, "door").quantity).toBe(14);
    expect(only(items, "side-panel").quantity).toBe(14);
    expect(only(items, "back-panel").quantity).toBe(7);
  });
});

describe("generateCutList: purity", () => {
  it("does not mutate its input", () => {
    const input = design({
      name: "p",
      type: "base",
      doorCount: 2,
      widthMm: 900,
      quantity: 2,
    });
    const before = structuredClone(input);
    generateCutList(input);
    expect(input).toEqual(before);
  });

  it("is deterministic and returns fresh objects each call", () => {
    const input = design({ name: "p" });
    const a = generateCutList(input);
    const b = generateCutList(input);
    expect(a).toEqual(b);
    expect(a[0]).not.toBe(b[0]);
  });
});

describe("generateCutList: validated designs yield positive pieces", () => {
  const accepted: CupboardDesign[] = [];
  for (const type of ["wall", "base"] as const) {
    for (const doorCount of [1, 2] as const) {
      for (const widthMm of [37, 38, 100, 500, 801, 900]) {
        for (const heightMm of [5.5, 6, 100, 720]) {
          const result = validateCupboardDesign({
            name: "v",
            heightMm,
            widthMm,
            depthMm: 250,
            type,
            doorCount,
            quantity: 2,
          });
          if (result.ok) accepted.push({ id: "x", ...result.value });
        }
      }
    }
  }

  it("covers a meaningful set of accepted designs", () => {
    expect(accepted.length).toBeGreaterThan(20);
  });

  it("every dimension and quantity is positive", () => {
    for (const d of accepted) {
      for (const item of generateCutList(d)) {
        expect(dimsOf(item.dimensions).every((n) => n > 0)).toBe(true);
        expect(item.quantity).toBeGreaterThan(0);
      }
    }
  });
});
