import { describe, expect, it } from "vitest";
import { formatSeriesCode, isCode39Safe, itemCode, toCode39 } from "@/lib/code39";
import { checkRateLimit, resetRateLimit } from "@/server/auth/rateLimit";
import { signSession, verifySession } from "@/server/auth/session";

describe("Code 39 helpers", () => {
  it("accepts Code 39 characters only", () => {
    expect(isCode39Safe("TB1000-001")).toBe(true);
    expect(isCode39Safe("SH-1 $/+%.")).toBe(true);
    expect(isCode39Safe("tb1000")).toBe(false);
    expect(isCode39Safe("TB_1")).toBe(false);
    expect(isCode39Safe("TB*1")).toBe(false);
  });

  it("normalises to upper case", () => {
    expect(toCode39("  tb-12 ")).toBe("TB-12");
  });

  it("formats series and item codes with padding", () => {
    expect(formatSeriesCode("TB", 1000, 4)).toBe("TB1000");
    expect(formatSeriesCode("TR-", 7, 5)).toBe("TR-00007");
    expect(itemCode("TB1000", 1)).toBe("TB1000-001");
  });
});

describe("login rate limit", () => {
  it("blocks after 8 attempts in the window and resets", () => {
    const key = "1.2.3.4|a@b.c";
    resetRateLimit(key);
    for (let i = 0; i < 8; i++) expect(checkRateLimit(key, 1000).allowed).toBe(true);
    const blocked = checkRateLimit(key, 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(checkRateLimit(key, 1000 + 16 * 60 * 1000).allowed).toBe(true);
  });
});

describe("session tokens", () => {
  it("round-trips a user id and rejects tampering", async () => {
    const token = await signSession("abc123");
    expect(await verifySession(token)).toBe("abc123");
    expect(await verifySession(`${token}x`)).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });
});
