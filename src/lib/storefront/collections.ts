/** Website collections (shop-by-fabric). Client-safe: no server imports. */

export const COLLECTION_KEYS = [
  "silk", "cotton", "linen", "tissue", "chiffon", "organza",
  "kota", "kalamkari", "matka", "modal", "mulberry",
] as const;

export type CollectionKey = (typeof COLLECTION_KEYS)[number];

export interface Collection {
  key: CollectionKey;
  label: string;
  blurb: string;
}

export const COLLECTIONS: readonly Collection[] = [
  { key: "silk", label: "Silk", blurb: "Pattu, raga and mulberry silks for weddings and festivals." },
  { key: "cotton", label: "Cotton", blurb: "Breathable handloom cottons with zari and checks." },
  { key: "linen", label: "Linen", blurb: "Crisp linens, from mirror work to metallic weaves." },
  { key: "tissue", label: "Tissue", blurb: "Lustrous tissue weaves that catch the light." },
  { key: "chiffon", label: "Chiffon", blurb: "Light, flowing chiffons with prints and embroidery." },
  { key: "organza", label: "Organza", blurb: "Sheer organzas, embroidered and metallic." },
  { key: "kota", label: "Kota", blurb: "Featherlight Kota cottons, hand-painted and printed." },
  { key: "kalamkari", label: "Kalamkari", blurb: "Hand-drawn kalamkari stories in natural tones." },
  { key: "matka", label: "Matka", blurb: "Textured matka silks, plain and sequinned." },
  { key: "modal", label: "Modal", blurb: "Soft modal cottons for easy everyday drapes." },
  { key: "mulberry", label: "Mulberry Cotton", blurb: "Mulberry cottons with bold pallu stripes." },
];

export function isCollectionKey(v: unknown): v is CollectionKey {
  return typeof v === "string" && (COLLECTION_KEYS as readonly string[]).includes(v);
}

export function collectionLabel(key: string): string {
  return COLLECTIONS.find((c) => c.key === key)?.label ?? key;
}

/** Best guess from free-text fabric/category on the product, used to prefill a new listing. */
export function guessCollection(...hints: readonly string[]): CollectionKey | "" {
  const text = hints.join(" ").toLowerCase();
  const order: CollectionKey[] = ["organza", "tissue", "kalamkari", "kota", "matka", "mulberry", "modal", "linen", "chiffon", "silk", "cotton"];
  const alias: Partial<Record<CollectionKey, RegExp>> = { kota: /kota|kotta/, chiffon: /chiffon|georgette|crepe|satin/ };
  return order.find((k) => (alias[k] ?? new RegExp(k)).test(text)) ?? "";
}

/** Storefront prices are whole rupees: "₹17,500". */
export function formatPrice(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

/** URL-safe slug: "Raga Silk Saree" → "raga-silk-saree". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/_/g, " ")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 80)
    .replace(/-+$/, "");
}
