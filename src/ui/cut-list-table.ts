import { createCopyControl } from "./copy-button";
import { exportLengthWidth } from "../domain/export-tsv";
import type { CutListItem } from "../domain/types";

export interface CutListTable {
  element: HTMLElement;
  update(items: readonly CutListItem[]): void;
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
  heading.textContent = "Megrendelés szabáslistája";

  const note = document.createElement("p");
  note.className = "field-hint";
  note.textContent = "Az azonos méretű és anyagú alkatrészek össze vannak vonva.";

  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent =
    "A szabáslista üres. Adjon hozzá egy szekrényt az alkatrészek megjelenítéséhez.";

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  const table = document.createElement("table");
  const caption = document.createElement("caption");
  caption.className = "visually-hidden";
  caption.textContent = "A megrendelés összes szekrényének összevont szabáslistája";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const [text, cls] of [
    ["Alkatrész", ""],
    ["Anyag", ""],
    ["Hossz (mm)", "num"],
    ["Szélesség (mm)", "num"],
    ["Darabszám", "num"],
  ] as const) {
    const th = cell("th", text, cls);
    th.scope = "col";
    headRow.append(th);
  }
  thead.append(headRow);
  const tbody = document.createElement("tbody");
  table.append(caption, thead, tbody);
  wrap.append(table);

  const copy = createCopyControl();

  section.append(heading, note, copy.element, empty, wrap);

  return {
    element: section,
    update(items) {
      copy.update(items);
      empty.hidden = items.length > 0;
      wrap.hidden = items.length === 0;
      tbody.replaceChildren(
        ...items.map((item) => {
          const { length, width } = exportLengthWidth(item.dimensions);
          const row = document.createElement("tr");
          row.append(
            cell("td", item.componentLabel),
            cell("td", item.materialLabel),
            cell("td", String(length), "num"),
            cell("td", String(width), "num"),
            cell("td", String(item.quantity), "num"),
          );
          return row;
        }),
      );
    },
  };
}
