import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { withGuard, type RouteContext } from "@/server/guard";
import { approveTransfer, cancelTransfer, dispatchTransfer, receiveTransfer } from "@/server/services/transfers";

type P = { id: string; action: string };

const approve = withGuard<P>("transfers.approve", async (_r, { actor, params }) => ok(await approveTransfer(actor, params.id)));
const cancel = withGuard<P>("transfers.edit", async (_r, { actor, params }) => ok(await cancelTransfer(actor, params.id)));
const dispatch = withGuard<P>("transfers.edit", async (req, { actor, params }) => ok(await dispatchTransfer(actor, params.id, await req.json())));
const receive = withGuard<P>("transfers.edit", async (req, { actor, params }) => ok(await receiveTransfer(actor, params.id, await req.json())));

const HANDLERS: Record<string, typeof approve> = { approve, cancel, dispatch, receive };

export async function POST(req: NextRequest, ctx: RouteContext<P>): Promise<Response> {
  const { action } = await ctx.params;
  const handler = HANDLERS[action];
  return handler ? handler(req, ctx) : fail("Unknown action", 404);
}
