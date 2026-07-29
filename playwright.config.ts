import { defineConfig, devices } from "@playwright/test";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function normalizeBasePath(value: string | undefined): string {
  if (!value) return "/VaiDarVolei/";
  if (value === "/") return "/";

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

const basePath = normalizeBasePath(process.env.VITE_BASE_PATH);
const previewUrl = `http://127.0.0.1:4173${basePath}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: previewUrl,
    timezoneId: "America/Sao_Paulo",
    trace: "on-first-retry",
  },
  webServer: {
    command: `${npmCommand} run build && ${npmCommand} run preview -- --host 127.0.0.1`,
    url: previewUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
