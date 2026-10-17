// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { mountApp } from "../../src/ui/app";
import { parseNumberText } from "../../src/ui/cupboard-form";

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app") as HTMLElement;
  mountApp(root);
});

function input(id: string): HTMLInputElement {
  return root.querySelector<HTMLInputElement>(
    `#field-${id}`,
  ) as HTMLInputElement;
}
function select(id: string): HTMLSelectElement {
  return root.querySelector<HTMLSelectElement>(
    `#field-${id}`,
  ) as HTMLSelectElement;
}

function fill(values: Record<string, string>) {
  for (const [id, value] of Object.entries(values)) {
    const control = root.querySelector<HTMLInputElement | HTMLSelectElement>(
      `#field-${id}`,
    );
    if (!control) throw new Error(`no field ${id}`);
    control.value = value;
  }
}

const valid = {
  name: "Wall-500-Single",
  heightMm: "600",
  widthMm: "500",
  depthMm: "300",
  type: "wall",
  doorCount: "1",
  quantity: "1",
};

function submit() {
  const form = root.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

const designItems = () => root.querySelectorAll(".design-items li");
const cutRows = () => root.querySelectorAll(".cut-list tbody tr");

describe("cupboard UI", () => {
  it("shows empty states when there are no designs", () => {
    expect(root.textContent).toContain("No cupboards added yet");
    expect(root.textContent).toContain("The cut list is empty");
    expect(designItems()).toHaveLength(0);
    expect(root.querySelector<HTMLElement>(".table-wrap")?.hidden).toBe(true);
  });

  it("labels every form control", () => {
    const controls = root.querySelectorAll("form input, form select");
    expect(controls.length).toBe(7);
    for (const control of controls) {
      expect(root.querySelector(`label[for="${control.id}"]`)).not.toBeNull();
    }
    expect(root.querySelector("form")?.noValidate).toBe(true);
  });

  it("adds a valid design and shows it in the list and cut list", () => {
    fill(valid);
    submit();
    expect(designItems()).toHaveLength(1);
    expect(designItems()[0]?.textContent).toContain("Wall-500-Single");
    expect(cutRows()).toHaveLength(5);
    const text = root.querySelector(".cut-list")?.textContent ?? "";
    expect(text).toContain("464 × 300");
    expect(text).toContain("595 × 497");
    expect(root.querySelector<HTMLElement>(".empty-state")?.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>(".error-summary")?.hidden).toBe(
      true,
    );
    // Name and quantity reset; sizes retained.
    expect(input("name").value).toBe("");
    expect(input("heightMm").value).toBe("600");
  });

  it("rejects invalid input visibly and adds nothing", () => {
    fill({ ...valid, name: "  ", heightMm: "", widthMm: "36" });
    submit();
    expect(designItems()).toHaveLength(0);
    expect(cutRows()).toHaveLength(0);

    const summary = root.querySelector<HTMLElement>(".error-summary");
    expect(summary?.hidden).toBe(false);
    expect(summary?.textContent).toContain("Cupboard not added");

    for (const id of ["name", "heightMm", "widthMm"]) {
      const control = input(id);
      expect(control.getAttribute("aria-invalid")).toBe("true");
      const errorId = control
        .getAttribute("aria-describedby")
        ?.split(" ")
        .pop();
      const message = root.querySelector<HTMLElement>(`#${errorId}`);
      expect(message?.hidden).toBe(false);
      expect(message?.textContent?.length).toBeGreaterThan(0);
    }
    expect(input("depthMm").hasAttribute("aria-invalid")).toBe(false);
    // Entered values are kept.
    expect(input("widthMm").value).toBe("36");
    expect(input("depthMm").value).toBe("300");
  });

  it("clears errors after a subsequent valid submission", () => {
    fill({ ...valid, depthMm: "" });
    submit();
    expect(input("depthMm").getAttribute("aria-invalid")).toBe("true");
    fill({ depthMm: "300" });
    submit();
    expect(input("depthMm").hasAttribute("aria-invalid")).toBe(false);
    expect(designItems()).toHaveLength(1);
  });

  it("rejects a fractional two-door width", () => {
    fill({ ...valid, widthMm: "801", doorCount: "2" });
    submit();
    expect(designItems()).toHaveLength(0);
    expect(input("widthMm").getAttribute("aria-invalid")).toBe("true");
  });

  it("removes a design and updates the cut list", () => {
    fill(valid);
    submit();
    fill({ ...valid, name: "Base", type: "base" });
    submit();
    expect(designItems()).toHaveLength(2);
    const rowsBefore = cutRows().length;

    root
      .querySelector<HTMLButtonElement>('button[aria-label="Remove Base"]')
      ?.click();
    expect(designItems()).toHaveLength(1);
    expect(designItems()[0]?.textContent).toContain("Wall-500-Single");
    expect(cutRows().length).toBeLessThan(rowsBefore);

    root
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Remove Wall-500-Single"]',
      )
      ?.click();
    expect(designItems()).toHaveLength(0);
    expect(cutRows()).toHaveLength(0);
    expect(root.textContent).toContain("No cupboards added yet");
  });

  it("aggregates identical pieces across designs and quantity", () => {
    fill(valid);
    submit();
    fill({ ...valid, name: "Again", quantity: "2" });
    submit();
    expect(cutRows()).toHaveLength(5);
    const sideRow = cutRows()[0] as HTMLElement;
    expect(sideRow.textContent).toContain("Side panel");
    expect(sideRow.lastElementChild?.textContent).toBe("6");
  });

  it("renders names as text and never creates elements from them", () => {
    const names = ["<img src=x onerror=alert(1)>", "<b>x</b>"];
    for (const name of names) {
      fill({ ...valid, name });
      submit();
    }
    expect(designItems()).toHaveLength(2);
    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector(".design-items b")).toBeNull();
    const first = designItems()[0]?.querySelector("strong");
    expect(first?.textContent).toBe(names[0]);
    expect(first?.children).toHaveLength(0);
    expect(designItems()[1]?.querySelector("strong")?.textContent).toBe(
      names[1],
    );
    // Selects keep their value too.
    expect(select("type").value).toBe("wall");
  });
});

describe("parseNumberText", () => {
  it("parses plain and padded numbers", () => {
    expect(parseNumberText(" 500 ")).toBe(500);
    expect(parseNumberText("1e3")).toBe(1000);
    expect(parseNumberText("0x10")).toBe(16);
  });
  it("returns NaN for empty, blank or comma-decimal text", () => {
    expect(parseNumberText("")).toBeNaN();
    expect(parseNumberText("   ")).toBeNaN();
    expect(parseNumberText("500,5")).toBeNaN();
  });
});

describe("failed submit after success", () => {
  it("keeps the error summary visible and values intact", () => {
    fill(valid);
    submit();
    fill({ name: "Second", heightMm: "", widthMm: "500" });
    submit();
    expect(designItems()).toHaveLength(1);
    expect(root.querySelector<HTMLElement>(".error-summary")?.hidden).toBe(
      false,
    );
    expect(input("name").value).toBe("Second");
    expect(input("widthMm").value).toBe("500");
    expect(input("depthMm").value).toBe("300");
  });
});
