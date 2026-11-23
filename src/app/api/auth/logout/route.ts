import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { SESSION_COOKIE } from "@/server/auth/session";
import { sameOrigin } from "@/server/guard";

export async function POST(req: NextRequest): Promise<Response> {
  if (!sameOrigin(req)) return fail("Cross-origin request blocked", 403);
  const res = ok({ signedOut: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
