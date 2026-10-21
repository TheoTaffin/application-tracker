import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "@/server/env";

/**
 * Object storage through the S3 API. Works unchanged against RustFS (local),
 * AWS S3, Cloudflare R2 or any S3-compatible provider: only env vars change.
 * The bucket is private; objects are only ever served through /api/files/[id].
 */

const globalForS3 = globalThis as unknown as { s3?: S3Client };

function client(): S3Client {
  if (!globalForS3.s3) {
    const e = env();
    globalForS3.s3 = new S3Client({
      endpoint: e.S3_ENDPOINT,
      region: e.S3_REGION,
      forcePathStyle: e.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: e.S3_ACCESS_KEY_ID,
        secretAccessKey: e.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return globalForS3.s3;
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
) {
  await client().send(
    new PutObjectCommand({
      Bucket: env().S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObjectStream(key: string): Promise<ReadableStream> {
  const res = await client().send(
    new GetObjectCommand({ Bucket: env().S3_BUCKET, Key: key }),
  );
  if (!res.Body) throw new Error(`Object ${key} has no body`);
  return res.Body.transformToWebStream();
}

export async function deleteObjects(keys: string[]) {
  if (keys.length === 0) return;
  await client().send(
    new DeleteObjectsCommand({
      Bucket: env().S3_BUCKET,
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    }),
  );
}
