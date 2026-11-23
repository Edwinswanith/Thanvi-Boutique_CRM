import { z } from "zod";
import { COLLECTION_KEYS } from "@/lib/storefront/collections";
import { LIMITS } from "@/lib/storefront/listing";

const text = (max: number) => z.string().trim().max(max);
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid photo");

export const listingSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Web address needs at least 3 characters")
    .max(LIMITS.slug)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens"),
  title: text(LIMITS.title).min(1, "Add a title"),
  collection: z.union([z.enum(COLLECTION_KEYS), z.literal("")]),
  colour: text(LIMITS.colour),
  shortDescription: text(LIMITS.shortDescription),
  description: text(LIMITS.description),
  highlights: z.array(text(LIMITS.highlight).min(1)).max(LIMITS.highlights),
  care: text(LIMITS.care),
  photoIds: z.array(objectId).max(LIMITS.photos, `Up to ${LIMITS.photos} photos`)
    .refine((ids) => new Set(ids).size === ids.length, "A photo is listed twice"),
  seoTitle: text(LIMITS.seoTitle),
  seoDescription: text(LIMITS.seoDescription),
  featured: z.boolean(),
});

export type ListingInput = z.infer<typeof listingSchema>;

export const publishSchema = z.object({ publish: z.boolean() });

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  status: z.enum(["all", "published", "draft", "unlisted"]).optional().default("all"),
});
