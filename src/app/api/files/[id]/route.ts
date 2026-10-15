import type { NextRequest } from "next/server";
import { INLINE_MIME, openFile } from "@/server/services/file-service";

/**
 * Streams a stored file. The bucket is never exposed: every download goes through
 * here, so access control can be added in one place later.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/files/[id]">,
) {
  const { id } = await ctx.params;
  const opened = await openFile(id);
  if (!opened) return new Response("Not found", { status: 404 });

  const { file, stream } = opened;
  const forceDownload = request.nextUrl.searchParams.has("download");
  const disposition =
    !forceDownload && INLINE_MIME.has(file.mime) ? "inline" : "attachment";
  const asciiName = file.originalName.replace(/[^\x20-\x7e]/g, "_");

  return new Response(stream, {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.size),
      "Content-Disposition": `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      // Even if a file were crafted to look like a page, it gets no capabilities.
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
