import { aggregateCutList } from "../domain/aggregate-cut-list";
import { generateCutList } from "../domain/generate-cut-list";
import type {
  CupboardDesign,
  CupboardDesignInput,
  CutListItem,
} from "../domain/types";

/**
 * The working order: the list of validated designs plus the aggregated cut
 * list derived from them. Holds no DOM references. All calculation is
 * delegated to the domain functions.
 */
export interface Order {
  getDesigns(): readonly CupboardDesign[];
  getCutList(): CutListItem[];
  /** Add an already-validated design; assigns and returns a unique id. */
  add(input: CupboardDesignInput): CupboardDesign;
  remove(id: string): void;
  /** Register a change listener. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

let fallbackCounter = 0;

function newId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  fallbackCounter += 1;
  return `design-${Date.now().toString(36)}-${fallbackCounter}`;
}

export function createOrder(): Order {
  let designs: CupboardDesign[] = [];
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  return {
    getDesigns: () => Object.freeze([...designs]),
    getCutList: () =>
      aggregateCutList(designs.flatMap((design) => generateCutList(design))),
    add(input) {
      const design: CupboardDesign = { ...input, id: newId() };
      designs = [...designs, design];
      notify();
      return design;
    },
    remove(id) {
      const next = designs.filter((d) => d.id !== id);
      if (next.length === designs.length) return;
      designs = next;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
