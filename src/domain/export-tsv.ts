/**
 * TSV export of the cut list, for pasting into Excel. Pure: no DOM and no
 * clipboard access.
 *
 * Format
 * - Header row is always present, even for an empty list:
 *   `Component<TAB>Material<TAB>Length (mm)<TAB>Width (mm)<TAB>Quantity`.
 * - Fields are separated by a single tab; rows by "\n" (Excel accepts LF on
 *   paste on all platforms).
 * - There is NO trailing newline. A trailing newline would make Excel paste
 *   leave the selection on an extra empty row. An empty list therefore yields
 *   exactly the header line.
 * - Rows keep the order given (the UI passes the aggregated, ordered list).
 *
 * Column mapping (the only place PieceDimensions becomes Length/Width), in
 * line with the display convention of plan section 5.1 and the section 8
 * tables:
 * - panel (sides, top, bottom, strips): Length = lengthMm, Width = depthMm
 * - sheet (doors, back panels): Length = heightMm, Width = widthMm
 *   (so a door shown as 595 x 497 exports as 595 / 497).
 *
 * Numbers use plain JavaScript number formatting: no thousands separators and
 * never a locale-dependent decimal comma ('.' always, e.g. 497.5). Exponent
 * notation, which String() would use for very large/small values, is expanded.
 *
 * Text sanitisation policy (`sanitizeTsvText`)
 * - Tabs, CR and LF (and runs of other whitespace) are collapsed to a single
 *   space and the result is trimmed, so a value can never add a column or row.
 * - Formula injection: Excel evaluates pasted text that begins with
 *   `=`, `+`, `-` or `@`. Such text is prefixed with an apostrophe (`'`), which
 *   Excel treats as a "text" marker. Labels come from constants today so this
 *   is defensive only. Numbers are never prefixed (they are formatted from
 *   numeric values, so a negative number cannot be mistaken for text).
 */
import type { CutListItem, PieceDimensions } from "./types";

export const TSV_HEADER = [
  "Component",
  "Material",
  "Length (mm)",
  "Width (mm)",
  "Quantity",
] as const;

const FORMULA_PREFIX = /^[=+\-@]/;

/** Make a text value safe for a single TSV cell. */
export function sanitizeTsvText(value: string): string {
  const flat = value.replace(/\s+/g, " ").trim();
  return FORMULA_PREFIX.test(flat) ? `'${flat}` : flat;
}

/** Format a number with '.' decimals, no grouping and no exponent notation. */
export function formatTsvNumber(n: number): string {
  const s = String(n);
  if (!/e/i.test(s)) return s;
  if (Math.abs(n) >= 1) return BigInt(n).toString(); // huge values are integers
  const fixed = n.toFixed(20).replace(/0+$/, "");
  return fixed.endsWith(".") ? fixed.slice(0, -1) : fixed;
}

/** The single mapping from piece dimensions to export Length / Width. */
export function exportLengthWidth(d: PieceDimensions): {
  length: number;
  width: number;
} {
  return d.kind === "panel"
    ? { length: d.lengthMm, width: d.depthMm }
    : { length: d.heightMm, width: d.widthMm };
}

export function formatCutListAsTsv(items: readonly CutListItem[]): string {
  const rows: string[] = [TSV_HEADER.join("\t")];
  for (const item of items) {
    const { length, width } = exportLengthWidth(item.dimensions);
    rows.push(
      [
        sanitizeTsvText(item.componentLabel),
        sanitizeTsvText(item.materialLabel),
        formatTsvNumber(length),
        formatTsvNumber(width),
        formatTsvNumber(item.quantity),
      ].join("\t"),
    );
  }
  return rows.join("\n");
}
