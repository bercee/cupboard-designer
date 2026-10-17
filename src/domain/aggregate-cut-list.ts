import {
  COMPONENT_LABELS,
  COMPONENT_ORDER,
  MATERIAL_LABELS,
  MATERIAL_ORDER,
} from "./constants";
import { pieceDimensionsKey } from "./dimensions";
import type { CutListItem, PieceDimensions } from "./types";

/** Primary numeric dimension pair in display order (panel: length x depth). */
function dimensionPair(d: PieceDimensions): [number, number] {
  return d.kind === "panel" ? [d.lengthMm, d.depthMm] : [d.heightMm, d.widthMm];
}

function compareItems(a: CutListItem, b: CutListItem): number {
  const [a1, a2] = dimensionPair(a.dimensions);
  const [b1, b2] = dimensionPair(b.dimensions);
  return (
    MATERIAL_ORDER[a.materialId] - MATERIAL_ORDER[b.materialId] ||
    COMPONENT_ORDER[a.componentType] - COMPONENT_ORDER[b.componentType] ||
    (a.dimensions.kind === b.dimensions.kind
      ? 0
      : a.dimensions.kind === "panel"
        ? -1
        : 1) ||
    a1 - b1 ||
    a2 - b2
  );
}

/**
 * Combine matching pieces across designs into an order list.
 *
 * Items merge only when component type, material id and dimensions (including
 * the panel/sheet kind) are all identical; quantities are summed. Items of
 * different materials never merge, even with equal dimensions.
 *
 * - `sourceDesignName` is ignored for matching and is omitted from every
 *   output line, because a merged line no longer belongs to a single design.
 * - Labels on output lines come from the canonical label tables for the
 *   component type and material, so output does not depend on input order.
 * - Ordering is deterministic and independent of input order: material (cabinet
 *   board, thin backing board, door material), then component type (side, top,
 *   bottom, support strip, back, door), then kind (panel before sheet), then
 *   first and second dimension ascending (panel: length, depth; sheet: height,
 *   width). The order is defined by `MATERIAL_ORDER` / `COMPONENT_ORDER`, not
 *   by locale string comparison.
 * - Pure: the input array and its items are not mutated, and every returned
 *   item and dimensions object is freshly created.
 */
export function aggregateCutList(items: CutListItem[]): CutListItem[] {
  const merged = new Map<string, CutListItem>();

  for (const item of items) {
    const key = `${item.materialId}|${item.componentType}|${pieceDimensionsKey(item.dimensions)}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(key, {
        componentType: item.componentType,
        componentLabel: COMPONENT_LABELS[item.componentType],
        materialId: item.materialId,
        materialLabel: MATERIAL_LABELS[item.materialId],
        dimensions: { ...item.dimensions },
        quantity: item.quantity,
      });
    }
  }

  return [...merged.values()].sort(compareItems);
}
