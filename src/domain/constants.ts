/**
 * Construction constants, all in millimetres. This is the single place to
 * change a carpentry rule; validation and (later) the cut-list engine read
 * from here.
 */
import type { ComponentType, MaterialId } from "./types";

/** Thickness of the cabinet board used for sides, tops, bottoms and strips. */
export const BOARD_THICKNESS_MM = 18;

/** Depth of each top support strip on a base cupboard. */
export const SUPPORT_STRIP_DEPTH_MM = 100;

/** Door height = cupboard height - this clearance. */
export const DOOR_HEIGHT_CLEARANCE_MM = 5;

/** Total outside clearance across the width (door width, one or two doors). */
export const DOOR_OUTSIDE_CLEARANCE_MM = 3;

/** Gap between two doors when a cupboard has two symmetrical doors. */
export const DOOR_CENTRE_GAP_MM = 3;

/** Number of side panels (one on each side) that the inner panels fit between. */
export const SIDE_PANEL_COUNT = 2;

/** Number of top support strips on a base cupboard. */
export const SUPPORT_STRIP_COUNT = 2;

/** Per-cupboard count of each of the top, bottom and back panels. */
export const SINGLE_PANEL_COUNT = 1;

/** Width removed from the overall width to get the inner (between sides) width. */
export const INNER_WIDTH_DEDUCTION_MM = SIDE_PANEL_COUNT * BOARD_THICKNESS_MM;

/** Total width deducted before splitting between two doors (3 + 3 = 6 mm). */
export const TWO_DOOR_WIDTH_DEDUCTION_MM =
  DOOR_OUTSIDE_CLEARANCE_MM + DOOR_CENTRE_GAP_MM;

/**
 * Display labels, centralised so no label string is duplicated in the engine,
 * tests or (later) the UI. Types are imported for the Record keys only.
 */
export const MATERIAL_LABELS: Record<MaterialId, string> = {
  "cabinet-board-18mm": "18 mm-es bútorlap",
  "thin-backing-board": "Hátfal (vékony farostlemez)",
  "door-material": "Ajtó alapanyaga",
};

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  "side-panel": "Oldallap",
  "top-panel": "Felső lap",
  "bottom-panel": "Alsó lap",
  "top-support-strip": "Merevítő léc",
  "back-panel": "Hátlap",
  door: "Ajtó",
};

/**
 * Canonical ordering of materials and components for the aggregated order
 * list. Defined explicitly (not by locale string comparison) so output order
 * never depends on the runtime locale. Typed as Records so adding a new id
 * without an order is a compile error.
 */
export const MATERIAL_ORDER: Record<MaterialId, number> = {
  "cabinet-board-18mm": 0,
  "thin-backing-board": 1,
  "door-material": 2,
};

export const COMPONENT_ORDER: Record<ComponentType, number> = {
  "side-panel": 0,
  "top-panel": 1,
  "bottom-panel": 2,
  "top-support-strip": 3,
  "back-panel": 4,
  door: 5,
};
