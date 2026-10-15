import { describe, expect, it } from "vitest";
import {
  assertSafeUrl,
  isPublicAddress,
  safeFetch,
  UnsafeUrlError,
} from "@/server/extraction/safe-fetch";

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.5",
    "172.16.0.1",
    "192.168.1.10",
    "169.254.169.254", // cloud metadata
    "100.64.0.1", // carrier-grade NAT
    "0.0.0.0",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1", // IPv4-mapped loopback
    "224.0.0.1",
  ])("rejects %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each(["8.8.8.8", "185.15.59.224", "2606:4700:4700::1111"])(
    "accepts %s",
    (ip) => {
      expect(isPublicAddress(ip)).toBe(true);
    },
  );
});

describe("assertSafeUrl", () => {
  it.each([
    ["file:///etc/passwd", /http and https/],
    ["ftp://example.com/x", /http and https/],
    ["http://user:pass@example.com/", /credentials/],
    ["http://example.com:8080/", /default ports/],
    ["http://127.0.0.1/", /Private/],
    ["http://169.254.169.254/latest/meta-data/", /Private/],
    ["http://[::1]/", /Private/],
    ["http://[::ffff:127.0.0.1]/", /Private/],
    ["not a url", /valid URL/],
  ])("rejects %s", (url, message) => {
    expect(() => assertSafeUrl(url)).toThrow(message);
  });

  it("accepts public http(s) URLs", () => {
    expect(assertSafeUrl("https://www.jobs.ch/en/").hostname).toBe(
      "www.jobs.ch",
    );
  });
});

describe("safeFetch", () => {
  it("refuses hostnames that resolve to loopback (checked at connect time)", async () => {
    await expect(safeFetch("http://localhost/")).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
  });
});
