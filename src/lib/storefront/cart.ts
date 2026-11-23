import { z } from "zod";

/**
 * Pure, immutable bag operations. Each line keeps a snapshot (title, price, photo)
 * so the bag renders instantly; the bag page refreshes it from the live catalog.
 * Phase 3 checkout must recompute prices server-side — never trust these.
 */

export const MAX_QTY = 5;

export interface CartItem {
  slug: string;
  title: string;
  /** Paise */
  price: number;
  image: string;
  colour: string;
  collection: string;
}

export interface CartLine extends CartItem {
  qty: number;
}

const clamp = (qty: number) => Math.max(0, Math.min(MAX_QTY, Math.floor(qty)));

export function addLine(lines: readonly CartLine[], item: CartItem, qty = 1): CartLine[] {
  const existing = lines.find((l) => l.slug === item.slug);
  if (!existing) return [...lines, { ...item, qty: clamp(qty) }];
  return lines.map((l) => (l.slug === item.slug ? { ...l, ...item, qty: clamp(l.qty + qty) } : l));
}

export function setQty(lines: readonly CartLine[], slug: string, qty: number): CartLine[] {
  const next = clamp(qty);
  if (next === 0) return removeLine(lines, slug);
  return lines.map((l) => (l.slug === slug ? { ...l, qty: next } : l));
}

export function removeLine(lines: readonly CartLine[], slug: string): CartLine[] {
  return lines.filter((l) => l.slug !== slug);
}

export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}

/** Paise */
export function cartSubtotal(lines: readonly CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.qty, 0);
}

/** Applies live data; returns titles of pieces that are no longer on the website. */
export function refreshLines(lines: readonly CartLine[], live: readonly CartItem[]): { lines: CartLine[]; removed: string[] } {
  const bySlug = new Map(live.map((p) => [p.slug, p]));
  return {
    lines: lines.flatMap((l) => {
      const fresh = bySlug.get(l.slug);
      return fresh ? [{ ...l, ...fresh, qty: l.qty }] : [];
    }),
    removed: lines.filter((l) => !bySlug.has(l.slug)).map((l) => l.title),
  };
}

const storedLine = z.object({
  slug: z.string().min(1).max(120),
  title: z.string().max(200),
  price: z.number().int().nonnegative(),
  image: z.string().max(300),
  colour: z.string().max(100),
  collection: z.string().max(100),
  qty: z.number().int().positive(),
});

/** Reads a bag from untrusted storage; drops anything malformed. */
export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.flatMap((entry) => {
      const parsed = storedLine.safeParse(entry);
      return parsed.success ? [{ ...parsed.data, qty: clamp(parsed.data.qty) }] : [];
    });
  } catch {
    return [];
  }
}
