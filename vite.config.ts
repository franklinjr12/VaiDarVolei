import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

function normalizeBasePath(value: string | undefined): string {
  if (!value) return "/VaiDarVolei/";
  if (value === "/") return "/";

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: normalizeBasePath(env.VITE_BASE_PATH),

    test: {
      environment: "jsdom",
      globals: true,
      include: ["tests/unit/**/*.test.ts"],
      coverage: {
        reporter: ["text", "html"],
      },
    },
  };
});