import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiMeta {
  total: number;
  page: number;
  limit: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: ApiMeta;
}

export function ok<T>(data: T, init?: { status?: number; meta?: ApiMeta }) {
  const body: ApiEnvelope<T> = { success: true, data, error: null, ...(init?.meta ? { meta: init.meta } : {}) };
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

export function fail(error: string, status = 400) {
  const body: ApiEnvelope<null> = { success: false, data: null, error };
  return NextResponse.json(body, { status });
}

/** Errors thrown by services that are safe to show to the user. */
export class AppError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "AppError";
  }
}

export function handleError(err: unknown) {
  if (err instanceof AppError) return fail(err.message, err.status);
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const where = first?.path.length ? `${first.path.join(".")}: ` : "";
    return fail(`${where}${first?.message ?? "Invalid input"}`, 422);
  }
  if (isDuplicateKeyError(err)) return fail("A record with this value already exists", 409);
  console.error("[api] unexpected error", err);
  return fail("Something went wrong. Please try again.", 500);
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}
