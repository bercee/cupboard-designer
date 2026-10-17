import type {
  CupboardDesignInput,
  DesignField,
  ValidationErrors,
} from "../domain/types";
import { validateCupboardDesign } from "../domain/validation";

interface FieldSpec {
  field: DesignField;
  id: string;
  label: string;
  hint?: string;
}

const FIELD_ORDER: DesignField[] = [
  "name",
  "heightMm",
  "widthMm",
  "depthMm",
  "type",
  "doorCount",
  "quantity",
];

const FIELD_LABELS: Record<DesignField, string> = {
  name: "Cupboard name",
  heightMm: "Height (mm)",
  widthMm: "Width (mm)",
  depthMm: "Depth (mm)",
  type: "Cupboard type",
  doorCount: "Number of doors",
  quantity: "Number of identical cupboards",
};

/** Convert numeric form text to a number; empty or unparsable text is NaN. */
export function parseNumberText(text: string): number {
  const trimmed = text.trim();
  if (trimmed === "") return NaN;
  return Number(trimmed);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<{ className: string; textContent: string; id: string }> = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  return node;
}

export interface CupboardForm {
  element: HTMLFormElement;
}

/**
 * Build the "add cupboard" form. `onAdd` is called with a validated design
 * input. Validation is delegated to the domain; the form uses `novalidate`
 * so the browser's own validation bubbles never replace our messages.
 */
export function createCupboardForm(
  onAdd: (design: CupboardDesignInput) => void,
): CupboardForm {
  const form = el("form", { className: "cupboard-form", id: "cupboard-form" });
  form.noValidate = true;
  form.setAttribute("aria-labelledby", "cupboard-form-heading");

  const heading = el("h2", {
    id: "cupboard-form-heading",
    textContent: "Add a cupboard",
  });
  form.append(heading);

  const summary = el("div", {
    className: "error-summary",
    id: "cupboard-form-errors",
  });
  summary.hidden = true;
  form.append(summary);

  const controls = new Map<DesignField, HTMLInputElement | HTMLSelectElement>();
  const errorNodes = new Map<DesignField, HTMLElement>();
  const grid = el("div", { className: "field-grid" });

  function addField(
    spec: FieldSpec,
    control: HTMLInputElement | HTMLSelectElement,
  ) {
    const wrapper = el("div", { className: "field" });
    const label = el("label", { textContent: spec.label });
    label.htmlFor = spec.id;
    control.id = spec.id;
    control.name = spec.field;
    const errorNode = el("p", {
      className: "field-error",
      id: `${spec.id}-error`,
    });
    errorNode.hidden = true;
    const describedBy = [];
    if (spec.hint) {
      const hint = el("p", {
        className: "field-hint",
        id: `${spec.id}-hint`,
        textContent: spec.hint,
      });
      wrapper.append(label, control, hint, errorNode);
      describedBy.push(hint.id);
    } else {
      wrapper.append(label, control, errorNode);
    }
    describedBy.push(errorNode.id);
    control.setAttribute("aria-describedby", describedBy.join(" "));
    controls.set(spec.field, control);
    errorNodes.set(spec.field, errorNode);
    grid.append(wrapper);
  }

  const textInput = (spec: FieldSpec) => {
    const input = el("input");
    input.type = "text";
    input.maxLength = 100;
    input.autocomplete = "off";
    addField(spec, input);
    return input;
  };
  const numberInput = (
    spec: FieldSpec,
    attrs: { min: string; step: string },
    value = "",
  ) => {
    const input = el("input");
    input.type = "number";
    input.inputMode = "decimal";
    input.min = attrs.min;
    input.step = attrs.step;
    input.value = value;
    addField(spec, input);
    return input;
  };
  const selectInput = (
    spec: FieldSpec,
    options: [value: string, label: string][],
  ) => {
    const select = el("select");
    for (const [value, label] of options) {
      const option = el("option", { textContent: label });
      option.value = value;
      select.append(option);
    }
    addField(spec, select);
    return select;
  };

  const spec = (field: DesignField, hint?: string): FieldSpec => ({
    field,
    id: `field-${field}`,
    label: FIELD_LABELS[field],
    ...(hint ? { hint } : {}),
  });

  const nameInput = textInput(spec("name", "A label for your own reference."));
  const heightInput = numberInput(spec("heightMm"), { min: "1", step: "any" });
  const widthInput = numberInput(spec("widthMm"), { min: "1", step: "any" });
  const depthInput = numberInput(spec("depthMm"), { min: "1", step: "any" });
  const typeSelect = selectInput(spec("type"), [
    ["wall", "Wall cupboard"],
    ["base", "Base cupboard"],
  ]);
  const doorSelect = selectInput(spec("doorCount"), [
    ["1", "1 door"],
    ["2", "2 symmetrical doors"],
  ]);
  const quantityInput = numberInput(
    spec("quantity"),
    { min: "1", step: "1" },
    "1",
  );
  form.append(grid);

  const submit = el("button", { textContent: "Add cupboard" });
  submit.type = "submit";
  const actions = el("div", { className: "form-actions" });
  actions.append(submit);
  form.append(actions);

  const status = el("p", {
    className: "form-status",
    id: "cupboard-form-status",
  });
  status.setAttribute("role", "status");
  form.append(status);

  function showErrors(errors: ValidationErrors) {
    summary.replaceChildren();
    const invalidFields = FIELD_ORDER.filter((f) => errors[f] !== undefined);
    for (const field of FIELD_ORDER) {
      const control = controls.get(field);
      const errorNode = errorNodes.get(field);
      if (!control || !errorNode) continue;
      const message = errors[field];
      if (message) {
        errorNode.textContent = message;
        errorNode.hidden = false;
        control.setAttribute("aria-invalid", "true");
      } else {
        errorNode.textContent = "";
        errorNode.hidden = true;
        control.removeAttribute("aria-invalid");
      }
    }
    if (invalidFields.length === 0) {
      summary.hidden = true;
      return;
    }
    const intro = el("p", {
      textContent: `Cupboard not added. Please fix ${invalidFields.length} ${
        invalidFields.length === 1 ? "problem" : "problems"
      }:`,
    });
    const list = el("ul");
    for (const field of invalidFields) {
      const item = el("li");
      const link = el("a", {
        textContent: `${FIELD_LABELS[field]}: ${errors[field] ?? ""}`,
      });
      link.href = `#field-${field}`;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        controls.get(field)?.focus();
      });
      item.append(link);
      list.append(item);
    }
    summary.append(intro, list);
    summary.hidden = false;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    status.textContent = "";
    const result = validateCupboardDesign({
      name: nameInput.value,
      heightMm: parseNumberText(heightInput.value),
      widthMm: parseNumberText(widthInput.value),
      depthMm: parseNumberText(depthInput.value),
      type: typeSelect.value,
      doorCount: Number(doorSelect.value),
      quantity: parseNumberText(quantityInput.value),
    });

    if (!result.ok) {
      showErrors(result.errors);
      const first = FIELD_ORDER.find((f) => result.errors[f] !== undefined);
      if (first) controls.get(first)?.focus();
      return;
    }

    showErrors({});
    onAdd(result.value);
    status.textContent = `Added "${result.value.name}".`;
    // Reset only the per-cupboard fields; keep sizes/type/doors because
    // consecutive cupboards are often similar.
    nameInput.value = "";
    quantityInput.value = "1";
    nameInput.focus();
  });

  return { element: form };
}
