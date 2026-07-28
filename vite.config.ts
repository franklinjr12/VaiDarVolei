import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/VaiDarVolei/",
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
