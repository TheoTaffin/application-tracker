import "server-only";
import type { LookupFunction } from "node:net";
import { isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import ipaddr from "ipaddr.js";

/**
 * Fetches a user-supplied URL without letting it reach internal services (SSRF).
 *
 * - Only http/https on default ports, no credentials in the URL.
 * - Every resolved address must be public unicast. The check runs inside the socket's
 *   DNS lookup, so the address that is validated is the address that is connected to
 *   (no DNS-rebinding window). IP-literal hosts are checked up front.
 * - Redirects are followed manually (each hop re-validated), with a timeout and a cap on
 *   the decompressed body size.
 */

export class UnsafeUrlError extends Error {
  override name = "UnsafeUrlError";
}

export class FetchFailedError extends Error {
  override name = "FetchFailedError";
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

export interface SafeFetchResponse {
  url: URL;
  status: number;
  contentType: string;
  body: string;
}

const DEFAULTS = {
  timeoutMs: 10_000,
  maxBytes: 5 * 1024 * 1024,
  maxRedirects: 5,
};

// Job boards serve a degraded page (or a block page) to unknown clients.
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

export function isPublicAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;
  let ip = ipaddr.parse(address);
  if (ip.kind() === "ipv6" && (ip as ipaddr.IPv6).isIPv4MappedAddress()) {
    ip = (ip as ipaddr.IPv6).toIPv4Address();
  }
  return ip.range() === "unicast";
}

export function assertSafeUrl(input: string | URL): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UnsafeUrlError("Not a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https URLs are allowed");
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("URLs with credentials are not allowed");
  }
  if (url.port !== "") {
    throw new UnsafeUrlError("Only default ports are allowed");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !isPublicAddress(host)) {
    throw new UnsafeUrlError("Private or reserved addresses are not allowed");
  }
  return url;
}

/** DNS lookup that refuses non-public addresses; used by the socket itself. */
export const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as { address: string; family: number }[];
    const blocked = list.find((a) => !isPublicAddress(a.address));
    if (list.length === 0 || blocked) {
      return callback(
        new UnsafeUrlError(`Host ${hostname} resolves to a non-public address`),
        "",
        0,
      );
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

function requestOnce(
  url: URL,
  opts: Required<SafeFetchOptions>,
): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}> {
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        timeout: opts.timeoutMs,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "accept-language": "en,de;q=0.8,fr;q=0.7,it;q=0.6",
          "accept-encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({
            status,
            headers: res.headers,
            body: Buffer.alloc(0),
          });
        }
        const encoding = String(
          res.headers["content-encoding"] ?? "",
        ).toLowerCase();
        const stream =
          encoding === "gzip"
            ? res.pipe(zlib.createGunzip())
            : encoding === "deflate"
              ? res.pipe(zlib.createInflate())
              : encoding === "br"
                ? res.pipe(zlib.createBrotliDecompress())
                : res;
        const chunks: Buffer[] = [];
        let size = 0;
        stream.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > opts.maxBytes) {
            req.destroy(new FetchFailedError("Page is too large"));
            return;
          }
          chunks.push(chunk);
        });
        stream.on("end", () =>
          resolve({
            status,
            headers: res.headers,
            body: Buffer.concat(chunks),
          }),
        );
        stream.on("error", (e) => reject(new FetchFailedError(e.message)));
      },
    );
    req.on("timeout", () =>
      req.destroy(new FetchFailedError("Request timed out")),
    );
    req.on("error", (e) =>
      reject(
        e instanceof UnsafeUrlError || e instanceof FetchFailedError
          ? e
          : new FetchFailedError(e.message),
      ),
    );
    req.end();
  });
}

function decode(body: Buffer, contentType: string): string {
  const charset = /charset=([^;]+)/i.exec(contentType)?.[1]?.trim() ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

export async function safeFetch(
  input: string | URL,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResponse> {
  const opts = { ...DEFAULTS, ...options };
  let url = assertSafeUrl(input);

  for (let hop = 0; ; hop++) {
    const res = await requestOnce(url, opts);
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.location;
      if (!location)
        throw new FetchFailedError(`Redirect without location (${res.status})`);
      if (hop >= opts.maxRedirects)
        throw new FetchFailedError("Too many redirects");
      url = assertSafeUrl(new URL(location, url));
      continue;
    }
    const contentType = String(res.headers["content-type"] ?? "");
    return {
      url,
      status: res.status,
      contentType,
      body: decode(res.body, contentType),
    };
  }
}
