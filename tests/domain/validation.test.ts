import { describe, expect, it } from "vitest";
import { validateCupboardDesign } from "../../src/domain/validation";
import type { RawCupboardInput } from "../../src/domain/validation";

const valid: RawCupboardInput = {
  name: "Wall-500-Single",
  heightMm: 600,
  widthMm: 500,
  depthMm: 300,
  type: "wall",
  doorCount: 1,
  quantity: 1,
};

function errorsFor(overrides: RawCupboardInput) {
  const result = validateCupboardDesign({ ...valid, ...overrides });
  if (result.ok) throw new Error("expected validation to fail");
  return result.errors;
}

function isOk(overrides: RawCupboardInput) {
  return validateCupboardDesign({ ...valid, ...overrides }).ok;
}

describe("validateCupboardDesign: valid input", () => {
  it("accepts a valid design and returns it without an id", () => {
    expect(validateCupboardDesign(valid)).toEqual({
      ok: true,
      value: {
        name: "Wall-500-Single",
        heightMm: 600,
        widthMm: 500,
        depthMm: 300,
        type: "wall",
        doorCount: 1,
        quantity: 1,
      },
    });
  });

  it("accepts a base cupboard with two doors and multiple quantity", () => {
    expect(
      isOk({ type: "base", doorCount: 2, widthMm: 900, quantity: 3 }),
    ).toBe(true);
  });

  it("is deterministic across repeated calls with varied inputs", () => {
    const inputs: RawCupboardInput[] = [
      valid,
      {},
      { ...valid, widthMm: 801, doorCount: 2 },
      { ...valid, name: "  ", quantity: NaN },
    ];
    for (const input of inputs) {
      const first = validateCupboardDesign(input);
      for (let i = 0; i < 3; i++) {
        expect(validateCupboardDesign(input)).toEqual(first);
      }
    }
  });

  it("does not mutate its input", () => {
    const input = { ...valid, name: "  x  " };
    const copy = { ...input };
    validateCupboardDesign(input);
    expect(input).toEqual(copy);
  });

  it("allows duplicate names (names are labels, not identifiers)", () => {
    expect(validateCupboardDesign(valid).ok).toBe(true);
    expect(validateCupboardDesign(valid).ok).toBe(true);
  });
});

describe("name", () => {
  it("trims whitespace", () => {
    const result = validateCupboardDesign({ ...valid, name: "  Left wall  " });
    expect(result.ok && result.value.name).toBe("Left wall");
  });

  it.each(["", "   ", "\t\n"])("rejects empty name %j", (name) => {
    expect(errorsFor({ name }).name).toMatch(/szekrény nevét/i);
  });

  it.each([undefined, null, 5, {}])("rejects non-string name %j", (name) => {
    expect(errorsFor({ name }).name).toBeDefined();
  });
});

describe.each(["heightMm", "widthMm", "depthMm"] as const)(
  "%s basic checks",
  (field) => {
  it.each([NaN, Infinity, -Infinity, undefined, null, "600", {}])(
    "rejects non-finite or non-number %j",
    (value) => {
      expect(errorsFor({ [field]: value })[field]).toContain("milliméterben megadott szám legyen");
    },
  );

  it.each([0, -1, -100])("rejects zero or negative %j", (value) => {
    expect(errorsFor({ [field]: value })[field]).toBeDefined();
  });
  },
);

describe("depth", () => {
  it("rejects zero with a clear message", () => {
    expect(errorsFor({ depthMm: 0 }).depthMm).toMatch(/nagyobb 0 mm-nél/);
  });
  it("accepts a very small positive depth", () => {
    expect(isOk({ depthMm: 0.5 })).toBe(true);
  });
});

describe("height feasibility (door height = height - 5)", () => {
  it("rejects height 5", () => {
    expect(errorsFor({ heightMm: 5 }).heightMm).toMatch(/nagyobb 5 mm-nél/);
  });
  it("rejects height below 5", () => {
    expect(errorsFor({ heightMm: 3 }).heightMm).toBeDefined();
  });
  it("accepts height 6", () => {
    expect(isOk({ heightMm: 6 })).toBe(true);
  });
});

describe("width feasibility (inner width = width - 36)", () => {
  it("rejects width 36", () => {
    expect(errorsFor({ widthMm: 36 }).widthMm).toMatch(/nagyobb 36 mm-nél/);
  });
  it("rejects width below 36", () => {
    expect(errorsFor({ widthMm: 20 }).widthMm).toBeDefined();
  });
  it("accepts width 37 with one door", () => {
    expect(isOk({ widthMm: 37, doorCount: 1 })).toBe(true);
  });
  it("accepts a fractional width with one door", () => {
    expect(isOk({ widthMm: 500.5, doorCount: 1 })).toBe(true);
  });
});

describe("two-door fractional width policy", () => {
  it("rejects odd width with two doors, with a clear message", () => {
    const message = errorsFor({ widthMm: 801, doorCount: 2 }).widthMm;
    expect(message).toMatch(/egész milliméter/);
    expect(message).toMatch(/páros szélességet|egy ajtót/);
  });
  it("accepts even width with two doors", () => {
    expect(isOk({ widthMm: 800, doorCount: 2 })).toBe(true);
  });
  it("rejects a fractional width with two doors", () => {
    expect(errorsFor({ widthMm: 800.5, doorCount: 2 }).widthMm).toBeDefined();
  });
  it("accepts odd width with one door", () => {
    expect(isOk({ widthMm: 801, doorCount: 1 })).toBe(true);
  });
  it("accepts the smallest even width above 36 with two doors (38)", () => {
    expect(isOk({ widthMm: 38, doorCount: 2 })).toBe(true);
  });
  it("reports the 36 mm rule rather than the fractional rule for tiny widths", () => {
    expect(errorsFor({ widthMm: 11, doorCount: 2 }).widthMm).toMatch(
      /nagyobb 36 mm-nél/,
    );
  });
});

describe("type", () => {
  it.each(["wall", "base"])("accepts %s", (type) => {
    expect(isOk({ type })).toBe(true);
  });
  it.each(["", "Wall", "top", undefined, null, 1])("rejects %j", (type) => {
    expect(errorsFor({ type }).type).toBeDefined();
  });
});

describe("doorCount", () => {
  it.each([1, 2])("accepts %j", (doorCount) => {
    expect(isOk({ doorCount })).toBe(true);
  });
  it.each([0, 3, -1, 1.5, "1", "2", NaN, undefined, null])(
    "rejects %j",
    (doorCount) => {
      expect(errorsFor({ doorCount }).doorCount).toBeDefined();
    },
  );
});

describe("quantity", () => {
  it.each([1, 2, 100])("accepts %j", (quantity) => {
    expect(isOk({ quantity })).toBe(true);
  });
  it.each([0, -1, 1.5, NaN, Infinity, "3", undefined, null])(
    "rejects %j",
    (quantity) => {
      expect(errorsFor({ quantity }).quantity).toMatch(/egész szám/);
    },
  );
});

describe("multiple errors", () => {
  it("reports every invalid field, keyed by field", () => {
    const result = validateCupboardDesign({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual([
        "depthMm",
        "doorCount",
        "heightMm",
        "name",
        "quantity",
        "type",
        "widthMm",
      ]);
    }
  });

  it("reports only the invalid field", () => {
    expect(Object.keys(errorsFor({ depthMm: -1 }))).toEqual(["depthMm"]);
  });
});

describe("additional boundaries and messages", () => {
  it("handles fractional heights around the 5 mm limit", () => {
    expect(isOk({ heightMm: 5.5 })).toBe(true);
    expect(isOk({ heightMm: 5.01 })).toBe(true);
    expect(errorsFor({ heightMm: 5 }).heightMm).toBeDefined();
  });

  it("accepts width 36.5 with one door", () => {
    expect(isOk({ widthMm: 36.5, doorCount: 1 })).toBe(true);
  });

  it("uses exact messages for name and quantity errors", () => {
    expect(errorsFor({ name: " " }).name).toBe(
      "Adja meg a szekrény nevét.",
    );
    expect(errorsFor({ quantity: 0 }).quantity).toBe(
      "A darabszám legalább 1 egész szám legyen.",
    );
  });

  it("rejects quantities beyond the safe integer range", () => {
    expect(errorsFor({ quantity: 1e21 }).quantity).toBeDefined();
    expect(errorsFor({ quantity: Number.MAX_SAFE_INTEGER + 1 }).quantity).toBe(
      "A darabszám legalább 1 egész szám legyen.",
    );
    expect(isOk({ quantity: Number.MAX_SAFE_INTEGER })).toBe(true);
  });

  it("reports type/doorCount errors together with a width error", () => {
    const errors = errorsFor({ type: "x", doorCount: 3, widthMm: 36 });
    expect(Object.keys(errors).sort()).toEqual([
      "doorCount",
      "type",
      "widthMm",
    ]);
  });

  it("skips the odd-width two-door check when doorCount is invalid", () => {
    const errors = errorsFor({ doorCount: 3, widthMm: 801 });
    expect(Object.keys(errors)).toEqual(["doorCount"]);
  });
});
