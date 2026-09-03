import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 3100);
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

// Smoke-level end-to-end suite: the public, unauthenticated surface (home,
// discovery, search, landing pages, key nav). The full booking lifecycle
// (request → approve → pay → complete → review) needs a seeded database and
// Stripe test mode — tracked separately; these tests guard against the app
// failing to boot or a route 500-ing on deploy.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run start -- --port ${PORT}`,
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
