/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    environment: "node",
    // Let ?raw CSS imports return real source (guard test for [hidden] rule).
    css: { include: /main.css/ },
    include: ["tests/**/*.test.ts"],
  },
});
