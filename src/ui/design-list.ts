import type { CupboardDesign } from "../domain/types";

export interface DesignList {
  element: HTMLElement;
  update(designs: readonly CupboardDesign[]): void;
}

const TYPE_LABELS = { wall: "Felső szekrény", base: "Alsó szekrény" } as const;

function describe(design: CupboardDesign): string {
  const doors = design.doorCount === 1 ? "1 ajtó" : "2 ajtó";
  return (
    `${TYPE_LABELS[design.type]}, ` +
    `Magasság: ${design.heightMm} mm, szélesség: ${design.widthMm} mm, mélység: ${design.depthMm} mm; ` +
    `${doors}; darabszám: ${design.quantity}`
  );
}

/** The list of designs in the working order, with a remove button for each. */
export function createDesignList(onRemove: (id: string) => void): DesignList {
  const section = document.createElement("section");
  section.className = "panel design-list";
  section.setAttribute("aria-labelledby", "design-list-heading");

  const heading = document.createElement("h2");
  heading.id = "design-list-heading";
  heading.textContent = "Megrendelés szekrényei";
  heading.tabIndex = -1;

  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent =
    "Még nincs szekrény a listán. Az űrlapon adhatja hozzá az elsőt.";

  const list = document.createElement("ul");
  list.className = "design-items";

  section.append(heading, empty, list);

  list.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>("button[data-design-id]");
    if (!button || !button.dataset.designId) return;
    onRemove(button.dataset.designId);
    heading.focus();
  });

  return {
    element: section,
    update(designs) {
      empty.hidden = designs.length > 0;
      list.hidden = designs.length === 0;
      list.replaceChildren(
        ...designs.map((design) => {
          const item = document.createElement("li");
          const info = document.createElement("div");
          info.className = "design-info";
          const name = document.createElement("strong");
          name.textContent = design.name;
          const details = document.createElement("span");
          details.className = "design-details";
          details.textContent = describe(design);
          info.append(name, details);

          const button = document.createElement("button");
          button.type = "button";
          button.className = "secondary";
          button.textContent = "Eltávolítás";
          button.setAttribute("aria-label", `„${design.name}” eltávolítása`);
          button.dataset.designId = design.id;
          item.append(info, button);
          return item;
        }),
      );
    },
  };
}
