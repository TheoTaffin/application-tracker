import { existsSync } from "node:fs";

/** Connection settings for integration tests, derived from .env (dev stack). */
export function testEnv() {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const devUrl = process.env.DATABASE_URL;
  if (!devUrl)
    throw new Error(
      "DATABASE_URL is not set: run `make env` and `make dev` first",
    );

  const databaseName = "tracker_test";
  const admin = new URL(devUrl);
  const test = new URL(devUrl);
  test.pathname = `/${databaseName}`;

  return {
    databaseName,
    adminDatabaseUrl: admin.href,
    DATABASE_URL: test.href,
    S3_ENDPOINT: process.env.S3_ENDPOINT ?? "http://127.0.0.1:9000",
    S3_BUCKET: `${process.env.S3_BUCKET ?? "tracker-files"}-test`,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? "",
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? "",
  };
}
