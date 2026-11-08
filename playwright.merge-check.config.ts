import { defineConfig } from "@playwright/test";
// TEMPORARY merge-check config: 127.0.0.1:5173 is squatted by another
// checkout's dev server, so run e2e against this tree on :5250. DELETE AFTER.
export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5250",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      args: [
        "--enable-webgl",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  projects: [{ name: "swiftshader", testIgnore: ["**/fps.spec.ts"] }],
  webServer: {
    command: "npm run dev -- --port 5250 --strictPort",
    url: "http://127.0.0.1:5250",
    reuseExistingServer: false,
  },
});
