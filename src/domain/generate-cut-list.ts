import {
  COMPONENT_LABELS,
  DOOR_HEIGHT_CLEARANCE_MM,
  DOOR_OUTSIDE_CLEARANCE_MM,
  INNER_WIDTH_DEDUCTION_MM,
  MATERIAL_LABELS,
  SIDE_PANEL_COUNT,
  SINGLE_PANEL_COUNT,
  SUPPORT_STRIP_COUNT,
  SUPPORT_STRIP_DEPTH_MM,
  TWO_DOOR_WIDTH_DEDUCTION_MM,
} from "./constants";
import type {
  ComponentType,
  CupboardDesign,
  CutListItem,
  MaterialId,
  PieceDimensions,
} from "./types";

/**
 * Generate the cut list for one validated design. Pure: no DOM, does not
 * mutate its input, and returns fresh objects. Item order is not a documented
 * requirement. Quantities are per-cupboard counts times `design.quantity`.
 *
 * The design must already have passed `validateCupboardDesign`; no validation
 * is repeated here. Back-board thickness is deliberately not subtracted from
 * any dimension (plan section 5).
 */
export function generateCutList(design: CupboardDesign): CutListItem[] {
  const { heightMm, widthMm, depthMm, type, doorCount } = design;

  const make = (
    componentType: ComponentType,
    materialId: MaterialId,
    dimensions: PieceDimensions,
    perCupboard: number,
  ): CutListItem => ({
    componentType,
    componentLabel: COMPONENT_LABELS[componentType],
    materialId,
    materialLabel: MATERIAL_LABELS[materialId],
    dimensions,
    quantity: perCupboard * design.quantity,
    sourceDesignName: design.name,
  });

  const innerWidthMm = widthMm - INNER_WIDTH_DEDUCTION_MM;
  const innerPanel = (): PieceDimensions => ({
    kind: "panel",
    lengthMm: innerWidthMm,
    depthMm,
  });

  const items: CutListItem[] = [
    make(
      "side-panel",
      "cabinet-board-18mm",
      { kind: "panel", lengthMm: heightMm, depthMm },
      SIDE_PANEL_COUNT,
    ),
  ];

  if (type === "wall") {
    items.push(
      make("top-panel", "cabinet-board-18mm", innerPanel(), SINGLE_PANEL_COUNT),
    );
  }
  items.push(
    make(
      "bottom-panel",
      "cabinet-board-18mm",
      innerPanel(),
      SINGLE_PANEL_COUNT,
    ),
  );
  if (type === "base") {
    items.push(
      make(
        "top-support-strip",
        "cabinet-board-18mm",
        {
          kind: "panel",
          lengthMm: innerWidthMm,
          depthMm: SUPPORT_STRIP_DEPTH_MM,
        },
        SUPPORT_STRIP_COUNT,
      ),
    );
  }

  items.push(
    make(
      "back-panel",
      "thin-backing-board",
      { kind: "sheet", heightMm, widthMm },
      SINGLE_PANEL_COUNT,
    ),
  );

  const doorWidthMm =
    doorCount === 1
      ? widthMm - DOOR_OUTSIDE_CLEARANCE_MM
      : (widthMm - TWO_DOOR_WIDTH_DEDUCTION_MM) / doorCount;
  items.push(
    make(
      "door",
      "door-material",
      {
        kind: "sheet",
        heightMm: heightMm - DOOR_HEIGHT_CLEARANCE_MM,
        widthMm: doorWidthMm,
      },
      doorCount,
    ),
  );

  return items;
}
