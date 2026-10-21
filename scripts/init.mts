/**
 * One-shot initialisation, run by the `init` compose service before the web app starts:
 * applies pending database migrations and makes sure the private bucket exists.
 * Idempotent: safe to run on every `docker compose up`.
 *
 * Runs with Node's built-in type stripping (`node scripts/init.mts`), so it only uses
 * erasable TypeScript syntax and package imports (no `@/` aliases).
 */
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutPublicAccessBlockCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

// Read configuration up front: a missing variable is a deployment error, not a reason to retry.
const config = {
  databaseUrl: required("DATABASE_URL"),
  bucket: required("S3_BUCKET"),
  endpoint: required("S3_ENDPOINT"),
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
  accessKeyId: required("S3_ACCESS_KEY_ID"),
  secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
};

async function migrateDatabase() {
  const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 1 });
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder: "./drizzle" });
    console.log("init: database migrations applied");
  } finally {
    await pool.end();
  }
}

async function ensureBucket() {
  const bucket = config.bucket;
  const s3 = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`init: bucket ${bucket} exists`);
    return;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status !== 404) throw err;
  }
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  try {
    await s3.send(
      new PutPublicAccessBlockCommand({
        Bucket: bucket,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: true,
          RestrictPublicBuckets: true,
        },
      }),
    );
  } catch {
    // Not every S3-compatible server implements this; new buckets are private anyway.
  }
  console.log(`init: bucket ${bucket} created`);
}

async function withRetry(name: string, fn: () => Promise<void>, attempts = 10) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts) throw err;
      console.log(`init: ${name} not ready (${(err as Error).message}), retrying…`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

await withRetry("database", migrateDatabase);
await withRetry("storage", ensureBucket);
