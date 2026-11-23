import { Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { collectionLabel, isCollectionKey, type CollectionKey } from "@/lib/storefront/collections";
import { effectiveSeo } from "@/lib/storefront/listing";
import { Product } from "@/models/Product";
import { WebListing } from "@/models/WebListing";

/**
 * Public, read-only storefront queries. Only `published` listings are ever
 * returned, and no internal data (cost, vendor, SKU, stock) leaves this file.
 */

export interface StoreProduct {
  slug: string;
  title: string;
  collection: CollectionKey | "";
  colour: string;
  price: number;
  photos: string[];
  shortDescription: string;
  featured: boolean;
}

export interface StoreProductDetail extends StoreProduct {
  description: string;
  highlights: string[];
  care: string;
  seo: { title: string; description: string };
}

export type StoreSort = "featured" | "price-asc" | "price-desc" | "newest";

interface ListingLean {
  productId: Types.ObjectId;
  slug: string;
  title: string;
  collectionKey?: string;
  colour?: string;
  shortDescription?: string;
  description?: string;
  highlights?: string[];
  care?: string;
  photoIds?: string[];
  seoTitle?: string;
  seoDescription?: string;
  featured?: boolean;
  publishedAt?: Date | null;
}

export const mediaUrl = (photoId: string) => `/api/media/${photoId}`;

async function withPrices(listings: ListingLean[]): Promise<StoreProductDetail[]> {
  const products = await Product.find({ _id: { $in: listings.map((l) => l.productId) } }).select("mrp").lean<{ _id: Types.ObjectId; mrp: number }[]>();
  const price = new Map(products.map((p) => [String(p._id), p.mrp]));
  return listings
    .filter((l) => price.has(String(l.productId)))
    .map((l) => ({
      slug: l.slug,
      title: l.title,
      collection: isCollectionKey(l.collectionKey) ? l.collectionKey : "",
      colour: l.colour ?? "",
      price: price.get(String(l.productId))!,
      photos: (l.photoIds ?? []).map(mediaUrl),
      shortDescription: l.shortDescription ?? "",
      featured: Boolean(l.featured),
      description: l.description ?? "",
      highlights: l.highlights ?? [],
      care: l.care ?? "",
      seo: effectiveSeo({
        title: l.title, seoTitle: l.seoTitle ?? "", seoDescription: l.seoDescription ?? "",
        shortDescription: l.shortDescription ?? "", description: l.description ?? "",
      }),
    }));
}

const summary = ({ slug, title, collection, colour, price, photos, shortDescription, featured }: StoreProductDetail): StoreProduct =>
  ({ slug, title, collection, colour, price, photos, shortDescription, featured });

export async function listPublished(opts: { collection?: string; sort?: string; limit?: number } = {}): Promise<StoreProduct[]> {
  await connectDb();
  const filter = { status: "published" as const, ...(isCollectionKey(opts.collection) ? { collectionKey: opts.collection } : {}) };
  const listings = await WebListing.find(filter).sort({ featured: -1, publishedAt: -1, _id: -1 }).limit(500).lean<ListingLean[]>();
  const rows = (await withPrices(listings)).map(summary);
  const sorted = opts.sort === "price-asc" ? [...rows].sort((a, b) => a.price - b.price)
    : opts.sort === "price-desc" ? [...rows].sort((a, b) => b.price - a.price)
    : rows;
  return opts.limit ? sorted.slice(0, opts.limit) : sorted;
}

export async function getPublishedBySlug(slug: string): Promise<StoreProductDetail | null> {
  await connectDb();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const listing = await WebListing.findOne({ slug, status: "published" }).lean<ListingLean>();
  if (!listing) return null;
  return (await withPrices([listing]))[0] ?? null;
}

/** Same collection first, then everything else that's live. */
export async function relatedPublished(slug: string, count = 4): Promise<StoreProduct[]> {
  const all = await listPublished();
  const self = all.find((p) => p.slug === slug);
  const others = all.filter((p) => p.slug !== slug);
  return [...others.filter((p) => p.collection === self?.collection), ...others.filter((p) => p.collection !== self?.collection)].slice(0, count);
}

/** Collections that have at least one live product, in display order. */
export async function liveCollections(): Promise<{ key: CollectionKey; cover: string | null }[]> {
  await connectDb();
  const rows = await WebListing.aggregate<{ _id: string; cover: string | null }>([
    { $match: { status: "published" } },
    { $sort: { featured: -1, publishedAt: -1 } },
    { $group: { _id: "$collectionKey", cover: { $first: { $arrayElemAt: ["$photoIds", 0] } } } },
  ]);
  return rows.filter((r) => isCollectionKey(r._id)).map((r) => ({ key: r._id as CollectionKey, cover: r.cover ? mediaUrl(r.cover) : null }));
}

/** A photo is public only while a published listing uses it. */
export async function isPublishedPhoto(photoId: string): Promise<boolean> {
  await connectDb();
  if (!Types.ObjectId.isValid(photoId)) return false;
  return Boolean(await WebListing.exists({ status: "published", photoIds: photoId }));
}

/** Fresh bag data for the given slugs (public, published only, max 50). */
export async function publishedBySlugs(slugs: readonly string[]): Promise<{ slug: string; title: string; price: number; image: string; colour: string; collection: string }[]> {
  await connectDb();
  const clean = [...new Set(slugs)].filter((s) => /^[a-z0-9-]{1,80}$/.test(s)).slice(0, 50);
  if (clean.length === 0) return [];
  const listings = await WebListing.find({ slug: { $in: clean }, status: "published" }).lean<ListingLean[]>();
  return (await withPrices(listings)).map((p) => ({
    slug: p.slug, title: p.title, price: p.price, image: p.photos[0] ?? "", colour: p.colour, collection: p.collection ? collectionLabel(p.collection) : "",
  }));
}

/** Everything a sitemap / llms.txt needs about live products. */
export async function publishedForIndex(): Promise<(StoreProduct & { updatedAt: Date })[]> {
  await connectDb();
  const listings = await WebListing.find({ status: "published" }).sort({ publishedAt: -1 }).limit(5000).lean<(ListingLean & { updatedAt: Date })[]>();
  const updated = new Map(listings.map((l) => [l.slug, l.updatedAt]));
  return (await withPrices(listings)).map((p) => ({ ...summary(p), updatedAt: updated.get(p.slug) ?? new Date() }));
}
