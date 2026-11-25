import { defineConfig, devices } from "@playwright/test";

/** E2E runs against a separate database so test data never lands in the real one. */
export const E2E_DB = "thanvi_boutique_e2e";
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE } } }],
  webServer: {
    command: `node node_modules/next/dist/bin/next build && node node_modules/next/dist/bin/next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
    timeout: 300_000,
    env: { MONGODB_DB: E2E_DB, ENABLE_TEST_CHECKOUT: "true" },
  },
});
