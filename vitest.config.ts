import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage/unit",
      reporter: ["text", "json", "lcov"],
    },
  },
});
