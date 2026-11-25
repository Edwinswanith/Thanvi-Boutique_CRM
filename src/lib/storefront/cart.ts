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
  availableQuantity?: number;
  image: string;
  colour: string;
  collection: string;
}

export interface CartLine extends CartItem {
  qty: number;
}

export function quantityLimit(item: CartItem): number {
  return Math.min(MAX_QTY, item.availableQuantity ?? MAX_QTY);
}

const clamp = (qty: number, item: CartItem) => Math.max(0, Math.min(quantityLimit(item), Math.floor(qty)));

export function addLine(lines: readonly CartLine[], item: CartItem, qty = 1): CartLine[] {
  const existing = lines.find((l) => l.slug === item.slug);
  if (quantityLimit(item) === 0) return removeLine(lines, item.slug);
  if (!existing) return [...lines, { ...item, qty: clamp(qty, item) }];
  return lines.map((l) => (l.slug === item.slug ? { ...l, ...item, qty: clamp(l.qty + qty, item) } : l));
}

export function setQty(lines: readonly CartLine[], slug: string, qty: number): CartLine[] {
  return lines.flatMap((line) => {
    if (line.slug !== slug) return [line];
    const next = clamp(qty, line);
    return next > 0 ? [{ ...line, qty: next }] : [];
  });
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
      return fresh && quantityLimit(fresh) > 0 ? [{ ...l, ...fresh, qty: clamp(l.qty, fresh) }] : [];
    }),
    removed: lines.filter((l) => !bySlug.has(l.slug) || bySlug.get(l.slug)?.availableQuantity === 0).map((l) => l.title),
  };
}

const storedLine = z.object({
  slug: z.string().min(1).max(120),
  title: z.string().max(200),
  price: z.number().int().nonnegative(),
  availableQuantity: z.number().int().nonnegative().optional(),
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
      if (!parsed.success) return [];
      const qty = clamp(parsed.data.qty, parsed.data);
      return qty > 0 ? [{ ...parsed.data, qty }] : [];
    });
  } catch {
    return [];
  }
}
