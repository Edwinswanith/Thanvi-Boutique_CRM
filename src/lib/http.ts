import type { ApiEnvelope } from "./api";

/** Client-side JSON helper for our API envelope. Throws a user-friendly Error on failure. */
export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new Error("Network error — check your connection and try again.");
  }
  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !json?.success) throw new Error(json?.error ?? `Request failed (${res.status})`);
  return json.data as T;
}
