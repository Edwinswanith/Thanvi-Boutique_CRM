import type { NextRequest } from "next/server";
import { fail, handleError } from "@/lib/api";
import { connectDb } from "@/lib/db";
import type { Permission } from "@/lib/rbac/permissions";
import { can, type Actor } from "@/server/actor";
import { currentActor } from "@/server/auth/actor";

export interface RouteContext<P> {
  params: Promise<P>;
}

type Handler<P> = (req: NextRequest, ctx: { actor: Actor; params: P }) => Promise<Response>;

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Rejects cross-site mutating requests (defence in depth alongside sameSite cookies). */
function sameOrigin(req: NextRequest): boolean {
  if (!MUTATING.has(req.method)) return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * Wraps a route handler: checks origin, session, active user and permission,
 * and converts thrown errors into the standard API envelope.
 */
export function withGuard<P = Record<string, never>>(permission: Permission, handler: Handler<P>) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<Response> => {
    try {
      if (!sameOrigin(req)) return fail("Cross-origin request blocked", 403);
      await connectDb();
      const actor = await currentActor();
      if (!actor) return fail("Please sign in", 401);
      if (!can(actor, permission)) return fail("You don't have permission to do this", 403);
      return await handler(req, { actor, params: await ctx.params });
    } catch (err) {
      return handleError(err);
    }
  };
}

export { sameOrigin };
