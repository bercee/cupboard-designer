import {
  DOOR_HEIGHT_CLEARANCE_MM,
  INNER_WIDTH_DEDUCTION_MM,
  TWO_DOOR_WIDTH_DEDUCTION_MM,
} from "./constants";
import type {
  CupboardDesignInput,
  CupboardType,
  DoorCount,
  ValidationErrors,
  ValidationResult,
} from "./types";

/**
 * Untyped input as it may arrive from a form or other source. Every field is
 * `unknown`; the UI is responsible for converting text to numbers (an empty or
 * unparsable field should become `NaN`/`undefined`), and validation rejects
 * anything that is not a proper value. Strings are NOT coerced.
 */
export interface RawCupboardInput {
  name?: unknown;
  heightMm?: unknown;
  widthMm?: unknown;
  depthMm?: unknown;
  type?: unknown;
  doorCount?: unknown;
  quantity?: unknown;
}

/**
 * Validate raw input and return either a normalised design (name trimmed) or
 * field-keyed error messages. Pure and deterministic.
 *
 * Duplicate design names are allowed: names are labels, not identifiers.
 *
 * ASSUMPTION (list in README): fractional (non-integer) overall dimensions are
 * allowed, except where the two-door rule requires a whole-millimetre door
 * width. Cut-list results may therefore be non-integer for one-door designs.
 * No maximum dimension limits are applied (none are confirmed).
 *
 * The two-door fractional-width check is skipped when `doorCount` is invalid,
 * since it cannot be evaluated; the doorCount error is reported instead.
 */
export function validateCupboardDesign(
  raw: RawCupboardInput,
): ValidationResult {
  const errors: ValidationErrors = {};

  let name = "";
  if (typeof raw.name !== "string" || raw.name.trim() === "") {
    errors.name = "Adja meg a szekrény nevét.";
  } else {
    name = raw.name.trim();
  }

  const heightMm = checkDimension(raw.heightMm, "Magasság", "heightMm", errors);
  const widthMm = checkDimension(raw.widthMm, "Szélesség", "widthMm", errors);
  const depthMm = checkDimension(raw.depthMm, "Mélység", "depthMm", errors);

  let type: CupboardType | undefined;
  if (raw.type === "wall" || raw.type === "base") {
    type = raw.type;
  } else {
    errors.type = "Válassza ki a szekrény típusát: felső vagy alsó szekrény.";
  }

  let doorCount: DoorCount | undefined;
  if (raw.doorCount === 1 || raw.doorCount === 2) {
    doorCount = raw.doorCount;
  } else {
    errors.doorCount = "Válassza ki az ajtók számát: 1 vagy 2.";
  }

  let quantity: number | undefined;
  if (
    typeof raw.quantity === "number" &&
    Number.isSafeInteger(raw.quantity) &&
    raw.quantity > 0
  ) {
    quantity = raw.quantity;
  } else {
    errors.quantity = "A darabszám legalább 1 egész szám legyen.";
  }

  // Feasibility rules, applied only when the field is otherwise valid.
  if (heightMm !== undefined && heightMm - DOOR_HEIGHT_CLEARANCE_MM <= 0) {
    errors.heightMm = `A magasság legyen nagyobb ${DOOR_HEIGHT_CLEARANCE_MM} mm-nél, hogy az ajtó magassága pozitív legyen.`;
  }
  if (widthMm !== undefined) {
    if (widthMm - INNER_WIDTH_DEDUCTION_MM <= 0) {
      errors.widthMm = `A szélesség legyen nagyobb ${INNER_WIDTH_DEDUCTION_MM} mm-nél, hogy az oldallapok közötti lapok szélessége pozitív legyen.`;
    } else if (
      doorCount === 2 &&
      !Number.isInteger((widthMm - TWO_DOOR_WIDTH_DEDUCTION_MM) / 2)
    ) {
      // Provisional policy (plan 5.2): never round silently. Easy to revise.
      errors.widthMm = `Két ajtó esetén a (szélesség - ${TWO_DOOR_WIDTH_DEDUCTION_MM}) / 2 értéke egész milliméter legyen. Adjon meg páros szélességet, vagy válasszon egy ajtót.`;
    }
  }

  if (
    Object.keys(errors).length > 0 ||
    heightMm === undefined ||
    widthMm === undefined ||
    depthMm === undefined ||
    type === undefined ||
    doorCount === undefined ||
    quantity === undefined
  ) {
    return { ok: false, errors };
  }

  const value: CupboardDesignInput = {
    name,
    heightMm,
    widthMm,
    depthMm,
    type,
    doorCount,
    quantity,
  };
  return { ok: true, value };
}

function checkDimension(
  value: unknown,
  label: string,
  field: "heightMm" | "widthMm" | "depthMm",
  errors: ValidationErrors,
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors[field] =
      `A(z) ${label.toLowerCase()} értéke milliméterben megadott szám legyen.`;
    return undefined;
  }
  if (value <= 0) {
    errors[field] = `A(z) ${label.toLowerCase()} legyen nagyobb 0 mm-nél.`;
    return undefined;
  }
  return value;
}
