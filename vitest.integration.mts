import { defineConfig } from "vitest/config";
import base from "./vitest.config.mts";

/** Integration tests against the dev stack (`make dev`): real Postgres and S3 storage. */
export default defineConfig({
  resolve: base.resolve,
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    // Tests share one database; run files one after another.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
