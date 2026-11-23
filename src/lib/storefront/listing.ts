/**
 * Website listing content rules shared by the admin editor (client) and the
 * catalog service (server). Pure: no server imports.
 */

export const LIMITS = {
  title: 120,
  slug: 80,
  colour: 60,
  shortDescription: 160,
  description: 4000,
  highlight: 120,
  highlights: 8,
  care: 500,
  photos: 10,
  seoTitle: 70,
  seoDescription: 170,
} as const;

/** Ideal lengths Google shows in results; the editor warns past these. */
export const SEO_IDEAL = { title: 60, description: 155 } as const;

export type ListingStatus = "draft" | "published";

export interface ListingContent {
  slug: string;
  title: string;
  collection: string;
  colour: string;
  shortDescription: string;
  description: string;
  highlights: string[];
  care: string;
  photoIds: string[];
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
}

export interface ChecklistItem {
  key: string;
  label: string;
  ok: boolean;
  /** Blocking items must pass before publishing; the rest are recommendations. */
  required: boolean;
}

/** What must (and should) be in place before a listing goes live. */
export function publishChecklist(c: ListingContent): ChecklistItem[] {
  return [
    { key: "title", label: "Product title", ok: c.title.trim().length >= 3, required: true },
    { key: "slug", label: "Web address (URL)", ok: c.slug.length >= 3, required: true },
    { key: "collection", label: "Collection chosen", ok: c.collection.length > 0, required: true },
    { key: "photo", label: "At least one photo", ok: c.photoIds.length >= 1, required: true },
    { key: "description", label: "Description (40+ characters)", ok: c.description.trim().length >= 40, required: true },
    { key: "photos3", label: "3 or more photos", ok: c.photoIds.length >= 3, required: false },
    { key: "short", label: "Short description", ok: c.shortDescription.trim().length > 0, required: false },
    { key: "seo", label: "Search title & description", ok: c.seoTitle.trim().length > 0 && c.seoDescription.trim().length > 0, required: false },
  ];
}

export function canPublish(c: ListingContent): boolean {
  return publishChecklist(c).every((i) => !i.required || i.ok);
}

/** What search engines and link previews will show, with sensible fallbacks. */
export function effectiveSeo(c: Pick<ListingContent, "title" | "seoTitle" | "seoDescription" | "shortDescription" | "description">): { title: string; description: string } {
  const title = c.seoTitle.trim() || `${c.title.trim()} | Thanvi Boutique`;
  const source = c.seoDescription.trim() || c.shortDescription.trim() || c.description.trim();
  const description = source.length > SEO_IDEAL.description ? `${source.slice(0, SEO_IDEAL.description - 1).trimEnd()}…` : source;
  return { title, description };
}
