// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import css from "../../src/styles/main.css?raw";
import { mountApp } from "../../src/ui/app";
import type { Order } from "../../src/ui/order-state";

let root: HTMLElement;
let order: Order;

const wallInput = {
  name: "Wall-500-Single",
  heightMm: 600,
  widthMm: 500,
  depthMm: 300,
  type: "wall" as const,
  doorCount: 1 as const,
  quantity: 1,
};

const EXPECTED_TSV = [
  "Alkatrész\tAnyag\tHossz (mm)\tSzélesség (mm)\tDarabszám",
  "Wall-500-Single Oldallap\t18 mm-es bútorlap\t600\t300\t2",
  "Wall-500-Single Felső lap\t18 mm-es bútorlap\t464\t300\t1",
  "Wall-500-Single Alsó lap\t18 mm-es bútorlap\t464\t300\t1",
  "Wall-500-Single Hátlap\tHátfal (vékony farostlemez)\t600\t500\t1",
  "Wall-500-Single Ajtó\tAjtó alapanyaga\t595\t497\t1",
].join("\n");

const button = () =>
  root.querySelector<HTMLButtonElement>(".copy-button") as HTMLButtonElement;
const status = () => root.querySelector(".copy-status") as HTMLElement;
const alertEl = () => root.querySelector(".copy-error") as HTMLElement;
const fallback = () =>
  root.querySelector<HTMLTextAreaElement>(
    ".copy-fallback textarea",
  ) as HTMLTextAreaElement;
const flush = () => new Promise((r) => setTimeout(r, 0));

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value,
    configurable: true,
  });
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app") as HTMLElement;
  order = mountApp(root);
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("Copy for Excel button", () => {
  it("is disabled when the list is empty and enabled otherwise", () => {
    expect(button().textContent).toBe("Másolás Excelhez");
    expect(button().disabled).toBe(true);
    order.add(wallInput);
    expect(button().disabled).toBe(false);
    order.remove(order.getDesigns()[0]?.id as string);
    expect(button().disabled).toBe(true);
  });

  it("announces success only after writeText resolves, with the exact TSV", async () => {
    let resolve!: () => void;
    const writeText = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    setClipboard({ writeText });
    order.add(wallInput);
    button().click();
    expect(writeText).toHaveBeenCalledExactlyOnceWith(EXPECTED_TSV);
    expect(status().textContent).toBe("");
    resolve();
    await flush();
    expect(status().textContent).toContain("Másolva");
    expect(alertEl().textContent).toBe("");
    expect(status().getAttribute("role")).toBe("status");
    expect(alertEl().getAttribute("role")).toBe("alert");
  });

  it("shows a failure message and fallback text when writeText rejects", async () => {
    setClipboard({ writeText: vi.fn(() => Promise.reject(new Error("no"))) });
    order.add(wallInput);
    button().click();
    await flush();
    expect(status().textContent).toBe("");
    expect(alertEl().textContent).toContain("másolás nem sikerült");
    expect(fallback().value).toBe(EXPECTED_TSV);
    expect(fallback().readOnly).toBe(true);
    expect(fallback().closest("label")?.hidden).toBe(false);
  });

  it("handles writeText throwing synchronously", async () => {
    setClipboard({
      writeText: () => {
        throw new Error("sync");
      },
    });
    order.add(wallInput);
    button().click();
    await flush();
    expect(status().textContent).toBe("");
    expect(alertEl().textContent).not.toBe("");
  });

  it("shows a failure message when the clipboard API is unavailable", async () => {
    order.add(wallInput);
    expect(navigator.clipboard).toBeUndefined();
    button().click();
    await flush();
    expect(status().textContent).toBe("");
    expect(alertEl().textContent).toContain("nem érhető el");
    expect(fallback().value).toBe(EXPECTED_TSV);
  });

  it("clears messages when the list changes", async () => {
    setClipboard({ writeText: vi.fn(() => Promise.resolve()) });
    order.add(wallInput);
    button().click();
    await flush();
    expect(status().textContent).not.toBe("");
    order.add({ ...wallInput, name: "Another" });
    expect(status().textContent).toBe("");

    setClipboard({ writeText: vi.fn(() => Promise.reject(new Error("x"))) });
    button().click();
    await flush();
    expect(alertEl().textContent).not.toBe("");
    order.remove(order.getDesigns()[0]?.id as string);
    expect(alertEl().textContent).toBe("");
    expect(fallback().closest("label")?.hidden).toBe(true);
  });

  it("ignores a pending copy result after the list changed", async () => {
    let resolve!: () => void;
    setClipboard({
      writeText: vi.fn(() => new Promise<void>((r) => (resolve = r))),
    });
    order.add(wallInput);
    button().click();
    order.add({ ...wallInput, name: "Another" });
    resolve();
    await flush();
    expect(status().textContent).toBe("");
  });

  it("keeps differently named cupboards separate in the copied list", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(() =>
      Promise.resolve(),
    );
    setClipboard({ writeText });
    order.add(wallInput);
    order.add({ ...wallInput, name: "Twin" });
    button().click();
    const copied = writeText.mock.calls[0]?.[0] ?? "";
    expect(copied).toContain(
      "Wall-500-Single Oldallap\t18 mm-es bútorlap\t600\t300\t2",
    );
    expect(copied).toContain("Twin Oldallap\t18 mm-es bútorlap\t600\t300\t2");
  });
});

describe("copy edge cases", () => {
  it("keeps a stale rejection silent", async () => {
    let reject!: (e: Error) => void;
    setClipboard({
      writeText: vi.fn(() => new Promise<void>((_, r) => (reject = r))),
    });
    order.add(wallInput);
    button().click();
    order.add({ ...wallInput, name: "Another" });
    reject(new Error("late"));
    await flush();
    expect(alertEl().textContent).toBe("");
    expect(status().textContent).toBe("");
    expect(fallback().closest("label")?.hidden).toBe(true);
  });

  it("shows only the latest result after a double click", async () => {
    const rejects: Array<(e: Error) => void> = [];
    const resolves: Array<() => void> = [];
    let n = 0;
    setClipboard({
      writeText: vi.fn(
        () =>
          new Promise<void>((res, rej) => {
            resolves[n] = res;
            rejects[n] = rej;
            n += 1;
          }),
      ),
    });
    order.add(wallInput);
    button().click();
    button().click();
    resolves[1]?.();
    rejects[0]?.(new Error("first failed late"));
    await flush();
    expect(status().textContent).toContain("Másolva");
    expect(alertEl().textContent).toBe("");
  });

  it("main.css has a [hidden] rule that beats author display rules", () => {
    expect(css).toMatch(/\[hidden\]\s*\{[^}]*display:\s*none\s*!important/);
  });
});
