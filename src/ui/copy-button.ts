import { formatCutListAsTsv } from "../domain/export-tsv";
import type { CutListItem } from "../domain/types";

export interface CopyControl {
  element: HTMLElement;
  /** Supply the current list; clears any previous message. */
  update(items: readonly CutListItem[]): void;
}

const UNAVAILABLE =
  "Copying is not available in this browser or connection (the clipboard needs HTTPS or localhost). Select the text below and copy it manually.";
const DENIED =
  "Copying was blocked or failed. Select the text below and copy it manually.";

/**
 * "Copy for Excel" button. All TSV formatting is delegated to the domain
 * formatter; this only talks to the clipboard and reports the outcome.
 * Success is announced only after writeText resolves.
 */
export function createCopyControl(): CopyControl {
  let current: readonly CutListItem[] = [];
  let generation = 0;

  const wrap = document.createElement("div");
  wrap.className = "copy-control";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-button";
  button.textContent = "Copy for Excel";
  button.disabled = true;

  const status = document.createElement("p");
  status.className = "copy-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const alert = document.createElement("p");
  alert.className = "copy-error";
  alert.setAttribute("role", "alert");

  const fallbackLabel = document.createElement("label");
  fallbackLabel.className = "copy-fallback";
  fallbackLabel.hidden = true;
  fallbackLabel.textContent = "Tab-separated text to copy manually";
  const fallback = document.createElement("textarea");
  fallback.readOnly = true;
  fallback.rows = 6;
  fallback.spellcheck = false;
  fallback.addEventListener("focus", () => fallback.select());
  fallbackLabel.append(fallback);

  wrap.append(button, status, alert, fallbackLabel);

  const clearMessages = () => {
    status.textContent = "";
    alert.textContent = "";
    fallbackLabel.hidden = true;
    fallback.value = "";
  };

  const fail = (message: string, tsv: string) => {
    status.textContent = "";
    alert.textContent = message;
    fallback.value = tsv;
    fallbackLabel.hidden = false;
  };

  button.addEventListener("click", async () => {
    if (current.length === 0) return;
    const tsv = formatCutListAsTsv(current);
    const mine = ++generation;
    clearMessages();
    try {
      const clip =
        typeof navigator !== "undefined" ? navigator.clipboard : undefined;
      if (!clip || typeof clip.writeText !== "function") {
        fail(UNAVAILABLE, tsv);
        return;
      }
      await clip.writeText(tsv);
      // Ignore the outcome if the list changed while the write was pending.
      if (mine !== generation) return;
      status.textContent = "Copied. Paste into Excel with Ctrl+V.";
    } catch {
      if (mine !== generation) return;
      fail(DENIED, tsv);
    }
  });

  return {
    element: wrap,
    update(items) {
      current = items;
      generation += 1; // invalidates any pending copy outcome
      clearMessages();
      button.disabled = items.length === 0;
    },
  };
}
