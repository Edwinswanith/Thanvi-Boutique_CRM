import { Types } from "mongoose";
import { AppError } from "@/lib/api";
import { guessCollection, slugify } from "@/lib/storefront/collections";
import { canPublish, publishChecklist, type ListingContent } from "@/lib/storefront/listing";
import { catalogQuerySchema, listingSchema } from "@/lib/validation/catalog";
import { Product } from "@/models/Product";
import { WebListing } from "@/models/WebListing";
import type { Actor } from "@/server/actor";
import { writeAudit } from "./audit";
import { photosExist } from "./files";
import { escapeRegex } from "./stock";

/** Admin side of the website catalog: one WebListing per product. */

export type CatalogStatus = "published" | "draft" | "unlisted";

export interface CatalogRow {
  productId: string;
  sku: string;
  name: string;
  mrp: number;
  coverPhotoId: string | null;
  status: CatalogStatus;
  slug: string | null;
  title: string | null;
  updatedAt: string | null;
}

export interface CatalogList {
  rows: CatalogRow[];
  counts: Record<"all" | CatalogStatus, number>;
}

export interface ListingEditorView {
  product: { id: string; sku: string; name: string; mrp: number; category: string; fabric: string; photoIds: string[] };
  content: ListingContent;
  status: CatalogStatus;
  exists: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
}

interface ProductLean {
  _id: Types.ObjectId;
  sku: string;
  name: string;
  mrp: number;
  category: string;
  fabric?: string;
  color?: string;
  description?: string;
  photoIds?: string[];
}

type ListingLean = Omit<ListingContent, "collection"> & {
  collectionKey?: string;
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  status: "draft" | "published";
  publishedAt?: Date | null;
  updatedAt?: Date;
};

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

const toContent = (l: ListingLean): ListingContent => ({
  slug: l.slug, title: l.title, collection: l.collectionKey ?? "", colour: l.colour ?? "",
  shortDescription: l.shortDescription ?? "", description: l.description ?? "", highlights: l.highlights ?? [],
  care: l.care ?? "", photoIds: l.photoIds ?? [], seoTitle: l.seoTitle ?? "", seoDescription: l.seoDescription ?? "",
  featured: Boolean(l.featured),
});

async function findProduct(productId: string): Promise<ProductLean> {
  if (!Types.ObjectId.isValid(productId)) throw new AppError("Product not found", 404);
  const p = await Product.findById(productId).lean<ProductLean>();
  if (!p) throw new AppError("Product not found", 404);
  return p;
}

export async function listCatalog(_actor: Actor, query: unknown): Promise<CatalogList> {
  const { q, status } = catalogQuerySchema.parse(query);
  const search = q ? { $or: [{ sku: q.toUpperCase() }, { name: { $regex: escapeRegex(q), $options: "i" } }] } : {};
  const products = await Product.find(search).sort({ createdAt: -1 }).limit(500).lean<ProductLean[]>();
  const listings = await WebListing.find({ productId: { $in: products.map((p) => p._id) } }).lean<ListingLean[]>();
  const byProduct = new Map(listings.map((l) => [String(l.productId), l]));
  const all: CatalogRow[] = products.map((p) => {
    const l = byProduct.get(String(p._id));
    return {
      productId: String(p._id), sku: p.sku, name: p.name, mrp: p.mrp,
      coverPhotoId: l?.photoIds?.[0] ?? p.photoIds?.[0] ?? null,
      status: l ? l.status : "unlisted", slug: l?.slug ?? null, title: l?.title ?? null, updatedAt: iso(l?.updatedAt),
    };
  });
  const count = (s: CatalogStatus) => all.filter((r) => r.status === s).length;
  return {
    rows: status === "all" ? all : all.filter((r) => r.status === status),
    counts: { all: all.length, published: count("published"), draft: count("draft"), unlisted: count("unlisted") },
  };
}

function defaultsFrom(p: ProductLean): ListingContent {
  return {
    slug: slugify([p.name, p.color].filter(Boolean).join(" ")), title: p.name,
    collection: guessCollection(p.fabric ?? "", p.category, p.name), colour: p.color ?? "",
    shortDescription: "", description: p.description ?? "", highlights: [], care: "",
    photoIds: p.photoIds ?? [], seoTitle: "", seoDescription: "", featured: false,
  };
}

export async function getListingEditor(_actor: Actor, productId: string): Promise<ListingEditorView> {
  const p = await findProduct(productId);
  const l = await WebListing.findOne({ productId: p._id }).lean<ListingLean>();
  return {
    product: { id: String(p._id), sku: p.sku, name: p.name, mrp: p.mrp, category: p.category, fabric: p.fabric ?? "", photoIds: p.photoIds ?? [] },
    content: l ? toContent(l) : defaultsFrom(p),
    status: l ? l.status : "unlisted",
    exists: Boolean(l),
    publishedAt: iso(l?.publishedAt),
    updatedAt: iso(l?.updatedAt),
  };
}

function missingRequired(content: ListingContent): string {
  return publishChecklist(content).filter((i) => i.required && !i.ok).map((i) => i.label.toLowerCase()).join(", ");
}

export async function saveListing(actor: Actor, productId: string, input: unknown): Promise<ListingEditorView> {
  const p = await findProduct(productId);
  const data = listingSchema.parse(input);
  const before = await WebListing.findOne({ productId: p._id }).lean<ListingLean>();
  const clash = await WebListing.exists({ slug: data.slug, productId: { $ne: p._id } });
  if (clash) throw new AppError("Another product already uses this web address. Change the URL.", 409);
  if (!(await photosExist(data.photoIds))) throw new AppError("One of the photos no longer exists. Re-upload it.", 422);
  if (before?.status === "published" && !canPublish(data)) {
    throw new AppError(`A live listing needs: ${missingRequired(data)}. Unpublish it first to save it incomplete.`, 422);
  }
  const { collection, ...rest } = data;
  const after = await WebListing.findOneAndUpdate(
    { productId: p._id },
    { $set: { ...rest, collectionKey: collection, updatedBy: new Types.ObjectId(actor.id) }, $setOnInsert: { productId: p._id, status: "draft" } },
    { upsert: true, returnDocument: "after" },
  ).lean<ListingLean>();
  await writeAudit(actor, { action: before ? "listing.update" : "listing.create", entity: "webListing", entityId: String(after!._id), reference: p.sku, before, after });
  return getListingEditor(actor, productId);
}

export async function setPublished(actor: Actor, productId: string, publish: boolean): Promise<ListingEditorView> {
  const p = await findProduct(productId);
  const l = await WebListing.findOne({ productId: p._id }).lean<ListingLean>();
  if (!l) throw new AppError("Save the listing before publishing it", 404);
  const content = toContent(l);
  if (publish && !canPublish(content)) throw new AppError(`Before publishing, add: ${missingRequired(content)}`, 422);
  await WebListing.updateOne(
    { _id: l._id },
    { $set: { status: publish ? "published" : "draft", publishedAt: publish ? (l.publishedAt ?? new Date()) : l.publishedAt ?? null, updatedBy: new Types.ObjectId(actor.id) } },
  );
  await writeAudit(actor, { action: publish ? "listing.publish" : "listing.unpublish", entity: "webListing", entityId: String(l._id), reference: p.sku });
  return getListingEditor(actor, productId);
}
