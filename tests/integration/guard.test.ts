import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError, fail, handleError, ok } from "@/lib/api";
import type { Actor } from "@/server/actor";

const state: { actor: Actor | null } = { actor: null };

vi.mock("@/lib/db", () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock("@/server/auth/actor", () => ({ currentActor: vi.fn(async () => state.actor) }));

const { withGuard, sameOrigin } = await import("@/server/guard");

const actor = (permissions: string[], isSystem = false): Actor => ({
  id: "u1",
  name: "U",
  email: "u@x.com",
  role: { id: "r1", name: "R", permissions, isSystem, confidential: false, allLocations: false },
  locationIds: [],
});

const req = (method: string, origin: string | null = "http://localhost:3000") =>
  new NextRequest("http://localhost:3000/api/x", {
    method,
    headers: { host: "localhost:3000", ...(origin ? { origin } : {}) },
  });

const ctx = { params: Promise.resolve({}) };
const handler = withGuard("system.users.view", async (_r, { actor: a }) => ok({ who: a.id }));

async function json(res: Response) {
  return { status: res.status, body: (await res.json()) as { success: boolean; data: unknown; error: string | null } };
}

describe("withGuard", () => {
  beforeEach(() => {
    state.actor = null;
  });

  it("returns 401 when signed out", async () => {
    expect((await json(await handler(req("GET"), ctx))).status).toBe(401);
  });

  it("returns 403 without the permission, and for a Super Admin on data routes", async () => {
    state.actor = actor(["sales.view"]);
    expect((await json(await handler(req("GET"), ctx))).status).toBe(403);
    state.actor = actor(["system.users.view", "sales.view"], true);
    const dataRoute = withGuard("sales.view", async () => ok(1));
    expect((await json(await dataRoute(req("GET"), ctx))).status).toBe(403);
  });

  it("runs the handler when permitted", async () => {
    state.actor = actor(["system.users.view"], true);
    const { status, body } = await json(await handler(req("GET"), ctx));
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, data: { who: "u1" }, error: null });
  });

  it("blocks cross-origin and origin-less mutations", async () => {
    state.actor = actor(["system.users.view"], true);
    const post = withGuard("system.users.view", async () => ok(1));
    expect((await json(await post(req("POST", "https://evil.example"), ctx))).status).toBe(403);
    expect((await json(await post(req("POST", null), ctx))).status).toBe(403);
    expect((await json(await post(req("POST"), ctx))).status).toBe(200);
    expect(sameOrigin(req("DELETE", "not a url"))).toBe(false);
  });

  it("converts thrown errors into the envelope", async () => {
    state.actor = actor(["system.users.view"], true);
    const boom = withGuard("system.users.view", async () => {
      throw new AppError("Nope", 409);
    });
    expect(await json(await boom(req("GET"), ctx))).toEqual({ status: 409, body: { success: false, data: null, error: "Nope" } });
  });
});

describe("api helpers", () => {
  it("formats success with meta and failure", async () => {
    const res = ok([1], { status: 201, meta: { total: 1, page: 1, limit: 10 } });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ success: true, meta: { total: 1 } });
    expect(fail("bad").status).toBe(400);
  });

  it("maps validation, duplicate-key and unknown errors without leaking details", async () => {
    const zerr = z.object({ name: z.string().min(2) }).safeParse({ name: "a" }).error!;
    const v = await json(handleError(zerr));
    expect(v.status).toBe(422);
    expect(v.body.error).toMatch(/^name:/);
    expect((await json(handleError({ code: 11000 }))).status).toBe(409);
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const unknown = await json(handleError(new Error("db password is hunter2")));
    expect(unknown.status).toBe(500);
    expect(unknown.body.error).not.toContain("hunter2");
    spy.mockRestore();
  });
});
