import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    testTimeout: 15_000,
    hookTimeout: 30_000,
    // Sequential execution — tests share one Caddy instance
    sequence: { concurrent: false },
    fileParallelism: false,
  },
});
