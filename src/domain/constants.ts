/**
 * Construction constants, all in millimetres. This is the single place to
 * change a carpentry rule; validation and (later) the cut-list engine read
 * from here.
 */

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

/** Width removed from the overall width to get the inner (between sides) width. */
export const INNER_WIDTH_DEDUCTION_MM = SIDE_PANEL_COUNT * BOARD_THICKNESS_MM;

/** Total width deducted before splitting between two doors (3 + 3 = 6 mm). */
export const TWO_DOOR_WIDTH_DEDUCTION_MM =
  DOOR_OUTSIDE_CLEARANCE_MM + DOOR_CENTRE_GAP_MM;
