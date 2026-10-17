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
    errors.name = "Enter a name for the cupboard.";
  } else {
    name = raw.name.trim();
  }

  const heightMm = checkDimension(raw.heightMm, "Height", "heightMm", errors);
  const widthMm = checkDimension(raw.widthMm, "Width", "widthMm", errors);
  const depthMm = checkDimension(raw.depthMm, "Depth", "depthMm", errors);

  let type: CupboardType | undefined;
  if (raw.type === "wall" || raw.type === "base") {
    type = raw.type;
  } else {
    errors.type = "Choose a cupboard type: wall or base.";
  }

  let doorCount: DoorCount | undefined;
  if (raw.doorCount === 1 || raw.doorCount === 2) {
    doorCount = raw.doorCount;
  } else {
    errors.doorCount = "Choose the number of doors: 1 or 2.";
  }

  let quantity: number | undefined;
  if (
    typeof raw.quantity === "number" &&
    Number.isSafeInteger(raw.quantity) &&
    raw.quantity > 0
  ) {
    quantity = raw.quantity;
  } else {
    errors.quantity =
      "Number of cupboards must be a whole number of 1 or more.";
  }

  // Feasibility rules, applied only when the field is otherwise valid.
  if (heightMm !== undefined && heightMm - DOOR_HEIGHT_CLEARANCE_MM <= 0) {
    errors.heightMm = `Height must be greater than ${DOOR_HEIGHT_CLEARANCE_MM} mm so the door height is positive.`;
  }
  if (widthMm !== undefined) {
    if (widthMm - INNER_WIDTH_DEDUCTION_MM <= 0) {
      errors.widthMm = `Width must be greater than ${INNER_WIDTH_DEDUCTION_MM} mm so the panels between the sides have a positive width.`;
    } else if (
      doorCount === 2 &&
      !Number.isInteger((widthMm - TWO_DOOR_WIDTH_DEDUCTION_MM) / 2)
    ) {
      // Provisional policy (plan 5.2): never round silently. Easy to revise.
      errors.widthMm = `With two doors, (width - ${TWO_DOOR_WIDTH_DEDUCTION_MM}) / 2 must be a whole number of millimetres. Use an even width, or choose one door.`;
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
    errors[field] = `${label} must be a number in millimetres.`;
    return undefined;
  }
  if (value <= 0) {
    errors[field] = `${label} must be greater than 0 mm.`;
    return undefined;
  }
  return value;
}
