import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "artifacts/e2e-report.json" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
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
  projects: [
    { name: "swiftshader", testIgnore: ["**/fps.spec.ts"] },
    {
      // Frame-rate probes need the real machine GPU; SwiftShader measures
      // the software rasterizer, not game performance.
      name: "gpu",
      testMatch: ["**/fps.spec.ts"],
      use: {
        launchOptions: {
          channel: "chromium",
          args: [
            "--enable-webgl",
            "--use-gl=angle",
            "--use-angle=default",
            "--enable-gpu",
            "--ignore-gpu-blocklist",
          ],
        },
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
});
