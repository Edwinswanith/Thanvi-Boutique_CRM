import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToBag } from "@/components/shop/AddToBag";
import { Gallery } from "@/components/shop/Gallery";
import { ProductGrid } from "@/components/shop/ProductCard";
import { FaqList } from "@/components/seo/FaqList";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, faqJsonLd, productFaq, productJsonLd } from "@/lib/seo/jsonld";
import { collectionLabel, formatPrice } from "@/lib/storefront/collections";
import { getPublishedBySlug, relatedPublished, type StoreProductDetail } from "@/server/services/storefront";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getPublishedBySlug((await params).slug);
  if (!p) return { title: "Saree not found" };
  return {
    title: { absolute: p.seo.title },
    description: p.seo.description,
    alternates: { canonical: `/shop/sarees/${p.slug}` },
    openGraph: { title: p.seo.title, description: p.seo.description, url: `/shop/sarees/${p.slug}`, images: p.photos.slice(0, 4).map((url) => ({ url, alt: p.title })), type: "website" },
    other: { "product:price:amount": (p.price / 100).toFixed(2), "product:price:currency": "INR" },
  };
}

const POLICIES = [
  { title: "Exchange only", body: "We don't offer refunds, but you can exchange within the window shown at checkout." },
  { title: "Try it in store", body: "Drape it first at Chennai, Madurai, Karaikudi or Coimbatore." },
  { title: "One code, one piece", body: "Your saree is tagged with its own code and tracked from our godown to your door." },
];

function Details({ p }: { p: StoreProductDetail }) {
  const sections = [
    ...(p.highlights.length ? [{ title: "Highlights", body: <ul className="space-y-1.5">{p.highlights.map((h) => <li key={h} className="flex gap-2"><span className="text-gold" aria-hidden>✦</span>{h}</li>)}</ul> }] : []),
    ...(p.care ? [{ title: "Care", body: <p>{p.care}</p> }] : []),
    ...POLICIES.map((x) => ({ title: x.title, body: <p>{x.body}</p> })),
  ];
  return (
    <div className="mt-8 divide-y divide-line border-y border-line">
      {sections.map((s, i) => (
        <details key={s.title} open={i === 0} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            {s.title}
            <span className="grid h-6 w-6 place-items-center rounded-full border border-line-strong text-ink-soft transition-transform duration-300 group-open:rotate-45" aria-hidden>+</span>
          </summary>
          <div className="pb-5 text-sm leading-relaxed text-ink-soft">{s.body}</div>
        </details>
      ))}
    </div>
  );
}

export default async function ProductPage({ params }: { params: Params }) {
  const p = await getPublishedBySlug((await params).slug);
  if (!p) notFound();
  const fabric = p.collection ? collectionLabel(p.collection) : "Sarees";
  const related = await relatedPublished(p.slug, 4);
  const paragraphs = p.description.split(/\n\s*\n/).filter(Boolean);
  const faqs = productFaq(p);
  const crumbs = [
    { name: "Home", path: "/shop" },
    ...(p.collection ? [{ name: fabric, path: `/shop/sarees?fabric=${p.collection}` }] : [{ name: "Sarees", path: "/shop/sarees" }]),
    { name: p.title, path: `/shop/sarees/${p.slug}` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <JsonLd data={productJsonLd(p)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={faqJsonLd(faqs)} />
      <nav aria-label="Breadcrumb" className="text-xs text-ink-soft">
        <Link href="/shop" className="link-grow hover:text-ink">Home</Link> <span aria-hidden>/</span>{" "}
        {p.collection && <><Link href={`/shop/sarees?fabric=${p.collection}`} className="link-grow hover:text-ink">{fabric}</Link> <span aria-hidden>/</span>{" "}</>}
        <span>{p.title}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="relative lg:sticky lg:top-36 lg:self-start">
          <div className="absolute -top-3 -left-3 hidden h-2/3 w-2/3 border border-gold-bright/50 lg:block" aria-hidden />
          <Gallery photos={p.photos} alt={`${p.title}${p.colour ? ` in ${p.colour}` : ""}`} />
        </div>

        <div className="rise lg:pt-6">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gold uppercase">{fabric} saree</p>
          <h1 className="display mt-3 text-4xl leading-tight sm:text-5xl">{p.title}</h1>
          {p.shortDescription && <p className="mt-3 text-lg text-ink-soft">{p.shortDescription}</p>}
          {p.colour && <p className="mt-2 text-sm text-ink-soft">Colour: <span className="text-ink">{p.colour}</span></p>}
          <p className="mt-6 text-3xl font-semibold">{formatPrice(p.price)}</p>
          <div className="zari-rule my-7 w-full" />
          <AddToBag item={{ slug: p.slug, title: p.title, price: p.price, image: p.photos[0] ?? "", colour: p.colour, collection: p.collection ? fabric : "" }} />
          {paragraphs.length > 0 && (
            <div className="mt-8 space-y-4 leading-relaxed text-ink/85">{paragraphs.map((t) => <p key={t.slice(0, 40)}>{t}</p>)}</div>
          )}
          <Details p={p} />
        </div>
      </div>

      <div className="mt-20 max-w-3xl">
        <FaqList faqs={faqs} title={`About the ${p.title}`} />
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gold">YOU MAY ALSO LIKE</p>
          <h2 className="display mt-2 text-3xl">More {fabric.toLowerCase()} and beyond</h2>
          <div className="mt-8"><ProductGrid products={related} /></div>
        </section>
      )}
    </div>
  );
}
