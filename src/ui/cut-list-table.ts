import type { CutListItem, PieceDimensions } from "../domain/types";

export interface CutListTable {
  element: HTMLElement;
  update(items: readonly CutListItem[]): void;
}

/**
 * Display convention (plan section 5.1): panels are length × depth; doors and
 * back panels are height × width. The convention is shown in its own column
 * so every row is unambiguous.
 */
export function formatDimensions(d: PieceDimensions): {
  size: string;
  order: string;
} {
  return d.kind === "panel"
    ? { size: `${d.lengthMm} × ${d.depthMm}`, order: "length × depth" }
    : { size: `${d.heightMm} × ${d.widthMm}`, order: "height × width" };
}

function cell(
  tag: "td" | "th",
  text: string,
  className?: string,
): HTMLTableCellElement {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

/** The aggregated order list, shown separately from the design list. */
export function createCutListTable(): CutListTable {
  const section = document.createElement("section");
  section.className = "panel cut-list";
  section.setAttribute("aria-labelledby", "cut-list-heading");

  const heading = document.createElement("h2");
  heading.id = "cut-list-heading";
  heading.textContent = "Order cut list";

  const note = document.createElement("p");
  note.className = "field-hint";
  note.textContent = "Matching pieces from all cupboards are combined.";

  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent =
    "The cut list is empty. Add a cupboard to see its pieces.";

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  const table = document.createElement("table");
  const caption = document.createElement("caption");
  caption.className = "visually-hidden";
  caption.textContent = "Combined cut list for all cupboards in the order";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const [text, cls] of [
    ["Component", ""],
    ["Material", ""],
    ["Size (mm)", "num"],
    ["Size order", ""],
    ["Quantity", "num"],
  ] as const) {
    const th = cell("th", text, cls);
    th.scope = "col";
    headRow.append(th);
  }
  thead.append(headRow);
  const tbody = document.createElement("tbody");
  table.append(caption, thead, tbody);
  wrap.append(table);

  section.append(heading, note, empty, wrap);

  return {
    element: section,
    update(items) {
      empty.hidden = items.length > 0;
      wrap.hidden = items.length === 0;
      tbody.replaceChildren(
        ...items.map((item) => {
          const { size, order } = formatDimensions(item.dimensions);
          const row = document.createElement("tr");
          row.append(
            cell("td", item.componentLabel),
            cell("td", item.materialLabel),
            cell("td", size, "num"),
            cell("td", order),
            cell("td", String(item.quantity), "num"),
          );
          return row;
        }),
      );
    },
  };
}
