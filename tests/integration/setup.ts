import { sql } from "drizzle-orm";
import { afterAll, beforeEach } from "vitest";
import { testEnv } from "./test-env";

// Point the app's env() at the test database and bucket before any app module loads it.
const env = testEnv();
Object.assign(process.env, {
  DATABASE_URL: env.DATABASE_URL,
  S3_ENDPOINT: env.S3_ENDPOINT,
  S3_BUCKET: env.S3_BUCKET,
  S3_ACCESS_KEY_ID: env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: env.S3_SECRET_ACCESS_KEY,
  S3_FORCE_PATH_STYLE: "true",
});

beforeEach(async () => {
  const { db } = await import("@/server/db/client");
  await db().execute(
    sql`TRUNCATE status_events, files, applications, contacts RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  const { db } = await import("@/server/db/client");
  await db().$client.end();
});
