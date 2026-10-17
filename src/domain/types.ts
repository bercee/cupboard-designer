/**
 * Domain types. Pure TypeScript, no DOM dependencies.
 *
 * Dimension representation (plan section 5.1): dimensions are stored with
 * named fields (`heightMm`, `widthMm`, `depthMm`, `lengthMm`) so a field name
 * always means the same physical axis within a given shape:
 *
 * - A cupboard is described by overall `heightMm`, `widthMm`, `depthMm`.
 * - A "panel" piece (sides, tops, bottoms, support strips) is described by
 *   `lengthMm` x `depthMm`. For side panels `lengthMm` is the cupboard height;
 *   for inner panels/strips it is the width between the side panels.
 * - A "sheet" piece (doors, back panels) is described by `heightMm` x
 *   `widthMm`.
 *
 * `PieceDimensions` is a discriminated union on `kind`, so the two shapes can
 * never be confused. Display/export column mapping is handled separately
 * (later deliverables) and is not encoded here.
 */

export type CupboardType = "wall" | "base";
export type DoorCount = 1 | 2;

/** A validated cupboard design as stored in the working order. */
export interface CupboardDesign {
  /** Unique identifier. Names are labels only and may be duplicated. */
  id: string;
  name: string;
  heightMm: number;
  widthMm: number;
  depthMm: number;
  type: CupboardType;
  doorCount: DoorCount;
  /** Number of identical cupboards to manufacture. */
  quantity: number;
}

/** A design before an id is assigned; this is what validation produces. */
export type CupboardDesignInput = Omit<CupboardDesign, "id">;

export type MaterialId =
  "cabinet-board-18mm" | "thin-backing-board" | "door-material";

export type ComponentType =
  | "side-panel"
  | "top-panel"
  | "bottom-panel"
  | "top-support-strip"
  | "back-panel"
  | "door";

/** Panel piece: length x depth (displayed in that order). */
export interface PanelDimensions {
  kind: "panel";
  lengthMm: number;
  depthMm: number;
}

/** Sheet piece (door, back panel): height x width (displayed in that order). */
export interface SheetDimensions {
  kind: "sheet";
  heightMm: number;
  widthMm: number;
}

export type PieceDimensions = PanelDimensions | SheetDimensions;

export interface CutListItem {
  componentType: ComponentType;
  componentLabel: string;
  materialId: MaterialId;
  materialLabel: string;
  dimensions: PieceDimensions;
  quantity: number;
  sourceDesignName?: string;
}

/** Fields of a cupboard design that validation can report errors against. */
export type DesignField =
  | "name"
  | "heightMm"
  | "widthMm"
  | "depthMm"
  | "type"
  | "doorCount"
  | "quantity";

/** At most one actionable message per field. */
export type ValidationErrors = Partial<Record<DesignField, string>>;

export type ValidationResult =
  | { ok: true; value: CupboardDesignInput }
  | { ok: false; errors: ValidationErrors };
