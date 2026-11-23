import { readFile } from "node:fs/promises";
import path from "node:path";
import { Types } from "mongoose";
import type { CollectionKey } from "@/lib/storefront/collections";
import { Product } from "@/models/Product";
import { Vendor } from "@/models/Vendor";
import { WebListing } from "@/models/WebListing";
import { deletePhotos, savePhoto } from "@/server/services/files";

/**
 * Showcase data for the storefront: 28 real Thanvi Boutique sarees (names, prices
 * and photos from thanviboutique.com) with SAMPLE copy. Everything created here is
 * flagged so `removeDemoCatalog()` can take it out again before go-live.
 */

const DEMO_VENDOR = "DEMO";

type Row = [slug: string, title: string, collection: CollectionKey, colour: string, rupees: number, featured?: boolean];

const ROWS: Row[] = [
  ["premium-mulberry-silk-milano-red", "Premium Mulberry Silk Saree", "silk", "Milano Red", 3250, true],
  ["heritage-tissue-cotton-seal-brown", "Heritage Tissue Cotton Saree", "tissue", "Seal Brown", 3500, true],
  ["floral-bird-embroidered-cerise-pink", "Floral Bird Embroidered Saree", "chiffon", "Cerise Pink", 1650, true],
  ["spring-bird-organza-purple", "Spring Bird Embroidered Saree", "organza", "Purple Dragon", 2350, true],
  ["coco-cotton-checks-trendy-green", "Coco Cotton Checks Saree", "cotton", "Trendy Green", 2950],
  ["luxury-kalamkari-quicksand", "Luxury Kalamkari Saree", "kalamkari", "Quicksand", 1350],
  ["pochampally-pattu-cadet-grey", "Pochampally Pattu Saree", "silk", "Cadet Grey", 3450],
  ["linen-mirror-dusky-rose", "Linen Mirror Saree", "linen", "Dusky Rose", 1350],
  ["tissue-saree-rose-gold", "Tissue Saree", "tissue", "Rose Gold", 2530],
  ["wave-painted-kota-twilight-lavender", "Wave Painted Saree", "kota", "Twilight Lavender", 1250],
  ["sequence-matka-thulian-pink", "Premium Sequence Matka Saree", "matka", "Thulian Pink", 15500],
  ["copper-zari-cotton-black", "Copper Zari Cotton Saree", "cotton", "Black", 2750],
  ["raga-silk-warm-blue", "Raga Silk Saree", "silk", "Warm Blue", 1350],
  ["metallic-matka-organza-persian-blue", "Metallic Matka Organza", "organza", "Persian Blue", 17500],
  ["classic-linen-checks", "Classic Linen Checks", "linen", "Multicolour", 3430],
  ["string-border-modal-trendy-green", "String Border Saree", "modal", "Trendy Green", 2350],
  ["macro-silk-maroon-oak", "Macro Silk Saree", "silk", "Maroon Oak", 1850],
  ["pallu-stripes-mulberry-black", "Pallu Stripes Mulberry", "mulberry", "Almost Black", 2350],
  ["kota-cotton-forest-green", "Kota Cotton Saree", "kota", "Forest Green", 1150],
  ["matka-silk-tissue-burnt-pink", "Matka Silk Tissue", "tissue", "Burnt Pink", 9500],
  ["floral-print-chiffon-olive-yellow", "Floral Print Saree", "chiffon", "Olive Yellow", 1050],
  ["mashru-cotton-silk-chathams-blue", "Mashru Cotton Silk Saree", "cotton", "Chathams Blue", 3250],
  ["metallic-linen-multicolour", "Metallic Linen Saree", "linen", "Multicolour", 8690],
  ["rashmika-kalamkari", "Rashmika Saree", "kalamkari", "Kalamkari Print", 1099],
  ["premium-modal-silk-fuel-yellow", "Premium Modal Saree", "silk", "Fuel Yellow", 2450],
  ["matka-plain-olive-green", "Matka Plain Saree", "matka", "Olive Green", 2760],
  ["rashmika-modal-smoky-black", "Rashmika 3.0 Saree", "modal", "Smoky Black", 1099],
  ["mulberry-cotton-crater-brown", "Mulberry Cotton Saree", "mulberry", "Crater Brown", 2625],
];

interface Copy { hsn: string; short: string; feel: string; wear: string; highlights: string[]; care: string }

const COPY: Record<CollectionKey, Copy> = {
  silk: { hsn: "5007", short: "Lustrous handwoven silk with a rich zari border.", feel: "a soft sheen and a fall that drapes beautifully", wear: "weddings, poojas and festive evenings", highlights: ["Handwoven silk", "Zari border", "Blouse piece included"], care: "Dry clean only. Store folded in a muslin cloth, away from damp." },
  cotton: { hsn: "5208", short: "Breathable handloom cotton, made for long days.", feel: "a crisp hand-feel that softens with every wash", wear: "office days, daytime functions and everyday elegance", highlights: ["Handloom cotton", "Breathable", "Blouse piece included"], care: "Gentle hand wash in cold water the first time. Starch lightly for a crisp drape." },
  linen: { hsn: "5309", short: "Crisp, cool linen with an easy, modern drape.", feel: "a natural slub texture that stays cool in the heat", wear: "brunches, workdays and summer gatherings", highlights: ["Pure linen blend", "Lightweight", "Blouse piece included"], care: "Hand wash cold or dry clean. Iron while slightly damp." },
  tissue: { hsn: "5407", short: "Light-catching tissue weave with a festive glow.", feel: "a featherlight shimmer that catches every light", wear: "receptions, festive mornings and celebrations", highlights: ["Tissue weave", "Zari sheen", "Blouse piece included"], care: "Dry clean only. Avoid direct perfume on the zari." },
  chiffon: { hsn: "5407", short: "Flowing chiffon with delicate prints and embroidery.", feel: "an airy, fluid drape that moves with you", wear: "parties, evening events and travel", highlights: ["Soft chiffon", "Easy to drape", "Blouse piece included"], care: "Gentle hand wash or dry clean. Do not wring." },
  organza: { hsn: "5407", short: "Sheer organza with embroidered and metallic details.", feel: "a sheer, sculpted drape with a gentle crispness", wear: "engagements, receptions and statement evenings", highlights: ["Organza", "Hand embroidery", "Blouse piece included"], care: "Dry clean only. Store rolled to avoid creases." },
  kota: { hsn: "5208", short: "Featherlight Kota cotton, hand-painted and printed.", feel: "the signature Kota check weave, airy and light", wear: "summer days, office wear and casual outings", highlights: ["Kota weave", "Featherlight", "Blouse piece included"], care: "Hand wash cold separately. Dry in shade." },
  kalamkari: { hsn: "5208", short: "Kalamkari stories in earthy, natural tones.", feel: "hand-drawn kalamkari motifs on a soft base", wear: "cultural events, workdays and gifting", highlights: ["Kalamkari print", "Natural tones", "Blouse piece included"], care: "Hand wash cold separately the first few times. Dry in shade." },
  matka: { hsn: "5007", short: "Textured matka silk with a rich, earthy character.", feel: "the nubby texture of matka silk with a subtle glow", wear: "festive occasions and evening functions", highlights: ["Matka silk", "Textured weave", "Blouse piece included"], care: "Dry clean only." },
  modal: { hsn: "5516", short: "Soft modal cotton for easy, everyday drapes.", feel: "a silky-soft hand-feel that drapes effortlessly", wear: "everyday wear, office days and travel", highlights: ["Modal cotton", "Silky soft", "Blouse piece included"], care: "Gentle hand wash cold. Dry in shade." },
  mulberry: { hsn: "5208", short: "Mulberry cotton with bold pallu stripes.", feel: "a smooth mulberry-cotton blend with a graceful fall", wear: "daytime functions and smart everyday looks", highlights: ["Mulberry cotton", "Striped pallu", "Blouse piece included"], care: "Gentle hand wash cold or dry clean." },
};

function describe(title: string, colour: string, c: Copy): string {
  return [
    `The ${title} in ${colour.toLowerCase()} has ${c.feel}. Each piece is chosen by hand at Thanvi Boutique, so every drape feels personal.`,
    `Wear it for ${c.wear}. Pair it with temple jewellery for a classic look, or keep it minimal for a modern finish.`,
  ].join("\n\n");
}

export interface DemoResult { created: number; skipped: number }

/** Idempotent: sarees whose web address already exists are skipped. */
export async function seedDemoCatalog(assetDir: string): Promise<DemoResult> {
  const vendor = await Vendor.findOneAndUpdate(
    { code: DEMO_VENDOR },
    { $setOnInsert: { code: DEMO_VENDOR, name: "Demo catalog (thanviboutique.com)" } },
    { upsert: true, returnDocument: "after" },
  );
  let created = 0;
  let skipped = 0;
  for (const [i, [slug, title, collection, colour, rupees, featured]] of ROWS.entries()) {
    if (await WebListing.exists({ slug })) { skipped += 1; continue; }
    const c = COPY[collection];
    const bytes = await readFile(path.join(assetDir, `${slug}.jpg`));
    const photoId = await savePhoto(new File([bytes], `${slug}.jpg`, { type: "image/jpeg" }), "demo-seed");
    const product = await Product.create({
      sku: `DEMO-${String(i + 1).padStart(2, "0")}`, name: title, category: "Saree", hsn: c.hsn, mrp: rupees * 100,
      vendorId: vendor!._id, color: colour, fabric: collection, photoIds: [photoId],
    });
    await WebListing.create({
      productId: product._id, slug, title, collectionKey: collection, colour, shortDescription: c.short,
      description: describe(title, colour, c), highlights: c.highlights, care: c.care, photoIds: [photoId],
      featured: Boolean(featured), status: "published", publishedAt: new Date(Date.now() - i * 60_000), demo: true,
    });
    created += 1;
  }
  return { created, skipped };
}

/** Removes every demo listing, its product, photos and the demo vendor. */
export async function removeDemoCatalog(): Promise<number> {
  const listings = await WebListing.find({ demo: true }).lean<{ productId: Types.ObjectId; photoIds: string[] }[]>();
  await deletePhotos(listings.flatMap((l) => l.photoIds));
  await Product.deleteMany({ _id: { $in: listings.map((l) => l.productId) } });
  await WebListing.deleteMany({ demo: true });
  await Vendor.deleteOne({ code: DEMO_VENDOR });
  return listings.length;
}
