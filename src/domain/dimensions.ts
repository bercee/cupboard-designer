import type { PieceDimensions } from "./types";

/**
 * Unambiguous string key for a piece's shape: the kind plus every dimension,
 * each in a fixed order, separated by delimiters that cannot occur in a
 * number's string form. Equal keys mean identical shape and dimensions; a
 * panel and a sheet with the same numbers never share a key.
 */
export function pieceDimensionsKey(d: PieceDimensions): string {
  return d.kind === "panel"
    ? `panel:${d.lengthMm}x${d.depthMm}`
    : `sheet:${d.heightMm}x${d.widthMm}`;
}
