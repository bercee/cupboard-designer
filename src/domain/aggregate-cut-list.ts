import { COMPONENT_ORDER, MATERIAL_LABELS, MATERIAL_ORDER } from "./constants";
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
 * Items merge only when source design name, component type, material id and
 * dimensions (including the panel/sheet kind) are all identical; quantities
 * are summed. This keeps differently labelled cupboards separate for assembly.
 *
 * - `sourceDesignName` is retained so production lines stay associated with
 *   their cupboard. Component labels also include that name.
 * - Material labels come from the canonical label table for the material.
 * - Ordering is deterministic and independent of input order: material (cabinet
 *   board, thin backing board, door material), then component type (side, top,
 *   bottom, support strip, back, door), then kind (panel before sheet), then
 *   first and second dimension ascending (panel: length, depth; sheet: height,
 *   width). The order is defined by `MATERIAL_ORDER` / `COMPONENT_ORDER`, not
 *   by locale string comparison.
 * - Dimensions and quantities are assumed finite (validation guarantees this).
 *   NaN or Infinity would break the comparator's total order, so ordering
 *   would no longer be deterministic.
 * - Pure: the input array and its items are not mutated, and every returned
 *   item and dimensions object is freshly created.
 */
export function aggregateCutList(items: CutListItem[]): CutListItem[] {
  const merged = new Map<string, CutListItem>();

  for (const item of items) {
    const key = `${item.sourceDesignName ?? ""}|${item.materialId}|${item.componentType}|${pieceDimensionsKey(item.dimensions)}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(key, {
        componentType: item.componentType,
        componentLabel: item.componentLabel,
        materialId: item.materialId,
        materialLabel: MATERIAL_LABELS[item.materialId],
        dimensions: { ...item.dimensions },
        quantity: item.quantity,
        ...(item.sourceDesignName === undefined
          ? {}
          : { sourceDesignName: item.sourceDesignName }),
      });
    }
  }

  return [...merged.values()].sort(compareItems);
}
