import { collectionLabel, formatPrice } from "@/lib/storefront/collections";
import type { Faq } from "./guides";
import { absoluteUrl, SITE, siteUrl } from "./site";

/** schema.org JSON-LD builders. Pure: the pages render them in <script type="application/ld+json">. */

export interface SeoProduct {
  slug: string;
  title: string;
  collection: string;
  colour: string;
  price: number;
  photos: string[];
  shortDescription: string;
  description: string;
  care: string;
  seo: { title: string; description: string };
}

const ORG_ID = () => `${siteUrl()}/#organization`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "ClothingStore"],
    "@id": ORG_ID(),
    name: SITE.name,
    legalName: SITE.legalName,
    url: absoluteUrl("/shop"),
    logo: absoluteUrl(SITE.logoPath),
    image: absoluteUrl(SITE.logoPath),
    description: SITE.description,
    slogan: SITE.tagline,
    foundingDate: SITE.foundingYear,
    currenciesAccepted: SITE.currency,
    areaServed: { "@type": "Country", name: "India" },
    knowsAbout: ["Handloom sarees", "Silk sarees", "Cotton sarees", "Linen sarees", "Kota sarees", "Kalamkari sarees", "Organza sarees", "Tissue sarees"],
    address: { "@type": "PostalAddress", addressRegion: "Tamil Nadu", addressCountry: SITE.country },
    location: SITE.stores.length
      ? SITE.stores.map((s) => ({ "@type": "ClothingStore", name: s.name, telephone: s.telephone, address: { "@type": "PostalAddress", streetAddress: s.street, addressLocality: s.city, postalCode: s.postalCode, addressCountry: SITE.country } }))
      : SITE.cities.map((city) => ({ "@type": "Place", name: `${SITE.name}, ${city}`, address: { "@type": "PostalAddress", addressLocality: city, addressRegion: "Tamil Nadu", addressCountry: SITE.country } })),
    ...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl()}/#website`,
    name: SITE.name,
    url: absoluteUrl("/shop"),
    inLanguage: "en-IN",
    publisher: { "@id": ORG_ID() },
  };
}

function returnPolicy() {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: SITE.country,
    refundType: "https://schema.org/ExchangeRefund",
    ...(SITE.exchangeWindowDays
      ? { returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow", merchantReturnDays: SITE.exchangeWindowDays }
      : { returnPolicyCategory: "https://schema.org/MerchantReturnUnspecified" }),
  };
}

export function productJsonLd(p: SeoProduct) {
  const url = absoluteUrl(`/shop/sarees/${p.slug}`);
  const fabric = p.collection ? collectionLabel(p.collection) : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.title,
    description: p.seo.description || p.shortDescription,
    url,
    image: p.photos.map(absoluteUrl),
    brand: { "@type": "Brand", name: SITE.name },
    category: fabric ? `Apparel & Accessories > Clothing > Traditional Clothing > Sarees > ${fabric} sarees` : "Sarees",
    ...(fabric ? { material: fabric } : {}),
    ...(p.colour ? { color: p.colour } : {}),
    offers: {
      "@type": "Offer",
      url,
      price: (p.price / 100).toFixed(2),
      priceCurrency: SITE.currency,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": ORG_ID() },
      hasMerchantReturnPolicy: returnPolicy(),
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export function collectionJsonLd(name: string, path: string, products: Pick<SeoProduct, "slug" | "title" | "photos">[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url: absoluteUrl(path),
    isPartOf: { "@id": `${siteUrl()}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/shop/sarees/${p.slug}`), name: p.title })),
    },
  };
}

export function faqJsonLd(faqs: readonly Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

/** Product Q&A in the words people actually search and ask assistants. Also shown on the page. */
export function productFaq(p: SeoProduct): Faq[] {
  const fabric = p.collection ? collectionLabel(p.collection).toLowerCase() : "handloom";
  const faqs: Faq[] = [
    { q: `What is the price of the ${p.title}?`, a: `The ${p.title}${p.colour ? ` in ${p.colour.toLowerCase()}` : ""} costs ${formatPrice(p.price)} at ${SITE.name}.` },
    { q: `What fabric is the ${p.title}?`, a: `It is a ${fabric} saree${p.shortDescription ? `: ${p.shortDescription.replace(/\.$/, "")}` : ""}.` },
  ];
  if (p.care) faqs.push({ q: `How do I care for the ${p.title}?`, a: p.care });
  faqs.push(
    { q: `Can I return or exchange the ${p.title}?`, a: `${SITE.name}'s policy is exchange only: we don't offer refunds, but you can exchange the saree.` },
    { q: `Can I see the ${p.title} in a store?`, a: `Yes. ${SITE.name} has stores in ${SITE.cities.slice(0, -1).join(", ")} and ${SITE.cities.at(-1)}, where you can see and drape sarees before buying.` },
  );
  return faqs;
}

/** Serialises JSON-LD safely for inline <script> tags. */
export function toJsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
