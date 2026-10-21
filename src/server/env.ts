import "server-only";
import { z } from "zod";

/**
 * Server-side configuration. This is the only module that reads `process.env`
 * (see the Next.js data security guide), and it validates everything once, lazily,
 * so `next build` does not need runtime secrets.
 */
const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_BUCKET: z.string().min(3),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(8),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const fields = Object.keys(z.flattenError(parsed.error).fieldErrors);
      throw new Error(`Invalid server environment: ${fields.join(", ")}`);
    }
    cached = parsed.data;
  }
  return cached;
}
