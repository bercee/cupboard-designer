import type {
  ComponentType,
  CupboardDesign,
  CutListItem,
  PieceDimensions,
} from "../../src/domain/types";

export type ExpectedPiece = Omit<CutListItem, "sourceDesignName">;

export function design(
  overrides: Partial<CupboardDesign> & Pick<CupboardDesign, "name">,
): CupboardDesign {
  return {
    id: "test-id",
    heightMm: 600,
    widthMm: 500,
    depthMm: 300,
    type: "wall",
    doorCount: 1,
    quantity: 1,
    ...overrides,
  };
}

function dimKey(d: PieceDimensions): string {
  return d.kind === "panel"
    ? `panel:${d.lengthMm}x${d.depthMm}`
    : `sheet:${d.heightMm}x${d.widthMm}`;
}

/** Stable sort so tests never depend on engine output order. */
export function sortItems<T extends ExpectedPiece>(items: readonly T[]): T[] {
  const key = (i: T) =>
    `${i.componentType}|${i.materialId}|${dimKey(i.dimensions)}`;
  return [...items].sort((a, b) => key(a).localeCompare(key(b)));
}

/** Find the single item of a component type; fails loudly if not exactly one. */
export function only(items: CutListItem[], type: ComponentType): CutListItem {
  const found = items.filter((i) => i.componentType === type);
  if (found.length !== 1) {
    throw new Error(`expected exactly one ${type}, found ${found.length}`);
  }
  return found[0] as CutListItem;
}
