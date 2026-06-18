import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:5297",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm.cmd run dev -- --host 127.0.0.1 --port 5297 --strictPort",
    url: "http://127.0.0.1:5297",
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
