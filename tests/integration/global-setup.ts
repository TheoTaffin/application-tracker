import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { testEnv } from "./test-env";

/**
 * Prepares an isolated test database and bucket on the dev stack (`make dev`), so
 * integration tests never touch development data.
 */
export default async function setup() {
  const env = testEnv();

  const admin = new pg.Client({ connectionString: env.adminDatabaseUrl });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${env.databaseName} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${env.databaseName}`);
  await admin.end();

  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 1 });
  await migrate(drizzle({ client: pool }), { migrationsFolder: "./drizzle" });
  await pool.end();

  const s3 = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
  }
}
