import type { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { connectDb } from "@/lib/db";
import { authenticate } from "@/server/auth/actor";
import { checkRateLimit, resetRateLimit } from "@/server/auth/rateLimit";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/server/auth/session";
import { sameOrigin } from "@/server/guard";

function emailOf(body: unknown): string {
  const email = (body as { email?: unknown } | null)?.email;
  return typeof email === "string" ? email.toLowerCase() : "";
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    if (!sameOrigin(req)) return fail("Cross-origin request blocked", 403);
    const body: unknown = await req.json().catch(() => ({}));
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const key = `${ip}|${emailOf(body)}`;
    const limit = checkRateLimit(key);
    if (!limit.allowed) return fail(`Too many attempts. Try again in ${Math.ceil(limit.retryAfterSec / 60)} min.`, 429);

    await connectDb();
    const actor = await authenticate(body);
    resetRateLimit(key);
    const res = ok({ id: actor.id, name: actor.name, role: actor.role.name, isSystem: actor.role.isSystem });
    res.cookies.set(SESSION_COOKIE, await signSession(actor.id), sessionCookieOptions());
    return res;
  } catch (err) {
    return handleError(err);
  }
}
