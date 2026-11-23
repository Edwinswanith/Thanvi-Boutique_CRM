import type { Metadata } from "next";
import Link from "next/link";
import { LinkPending } from "@/components/shop/LinkPending";
import { ProductGrid } from "@/components/shop/ProductCard";
import { FaqList } from "@/components/seo/FaqList";
import { JsonLd } from "@/components/seo/JsonLd";
import { guideFor } from "@/lib/seo/guides";
import { breadcrumbJsonLd, collectionJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { COLLECTIONS } from "@/lib/storefront/collections";
import { listPublished, liveCollections } from "@/server/services/storefront";

type Search = Promise<{ fabric?: string; sort?: string }>;

/** Fabric pages get their own title/description; sort order never creates a separate canonical page. */
export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const { fabric } = await searchParams;
  const current = COLLECTIONS.find((f) => f.key === fabric);
  const guide = current ? guideFor(current.key) : undefined;
  const canonical = current ? `/shop/sarees?fabric=${current.key}` : "/shop/sarees";
  if (!current || !guide) {
    return {
      title: { absolute: "Buy Handloom Sarees Online – All Sarees | Thanvi Boutique" },
      description: "Browse every handloom saree at Thanvi Boutique: silk, cotton, linen, tissue, organza, Kota, kalamkari, matka and modal. Shop online or in our Tamil Nadu stores.",
      alternates: { canonical },
    };
  }
  return { title: { absolute: guide.seoTitle }, description: guide.seoDescription, alternates: { canonical }, openGraph: { title: guide.seoTitle, description: guide.seoDescription, url: canonical } };
}

const SORTS = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
] as const;

function hrefFor(fabric: string | undefined, sort: string | undefined): string {
  const params = new URLSearchParams();
  if (fabric) params.set("fabric", fabric);
  if (sort && sort !== "featured") params.set("sort", sort);
  const q = params.toString();
  return q ? `/shop/sarees?${q}` : "/shop/sarees";
}

export default async function CollectionPage({ searchParams }: { searchParams: Search }) {
  const { fabric, sort } = await searchParams;
  const current = COLLECTIONS.find((f) => f.key === fabric);
  const sarees = await listPublished({ collection: current?.key, sort });
  const live = new Set((await liveCollections()).map((c) => c.key));
  const chips = COLLECTIONS.filter((c) => live.has(c.key));
  const activeSort = SORTS.some((s) => s.key === sort) ? sort : "featured";
  const guide = current ? guideFor(current.key) : undefined;
  const name = current ? `${current.label} sarees` : "All sarees";
  const path = current ? `/shop/sarees?fabric=${current.key}` : "/shop/sarees";
  const crumbs = [{ name: "Home", path: "/shop" }, { name: "Sarees", path: "/shop/sarees" }, ...(current ? [{ name: current.label, path }] : [])];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={collectionJsonLd(name, path, sarees)} />
      {guide && <JsonLd data={faqJsonLd(guide.faqs)} />}
      <nav aria-label="Breadcrumb" className="text-xs text-ink-soft">
        <Link href="/shop" className="hover:text-ink">Home</Link> <span aria-hidden>/</span>{" "}
        {current ? <><Link href="/shop/sarees" className="hover:text-ink">Sarees</Link> <span aria-hidden>/</span> <span>{current.label}</span></> : <span>Sarees</span>}
      </nav>
      <header className="mt-4 max-w-2xl">
        <h1 className="display text-4xl sm:text-5xl">{name}</h1>
        <p className="mt-3 text-ink-soft">{current ? current.blurb : "Every weave we carry, from everyday cottons to bridal silks."}</p>
      </header>

      <div className="mt-8 flex flex-col gap-4 border-y border-line py-4">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <FabricChip href={hrefFor(undefined, sort)} active={!current} label="All" />
          {chips.map((f) => (
            <FabricChip key={f.key} href={hrefFor(f.key, sort)} active={current?.key === f.key} label={f.label} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="text-ink-soft">{sarees.length} saree{sarees.length === 1 ? "" : "s"}</span>
          <span className="text-line-strong" aria-hidden>|</span>
          <div className="flex gap-3" role="group" aria-label="Sort">
            {SORTS.map((s) => (
              <Link key={s.key} href={hrefFor(current?.key, s.key)} aria-current={activeSort === s.key ? "true" : undefined}
                className={`link-grow ${activeSort === s.key ? "font-semibold" : "text-ink-soft hover:text-ink"}`}>
                {s.label}
                <LinkPending />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10">
        {sarees.length ? <ProductGrid products={sarees} priorityCount={4} /> : <p className="py-20 text-center text-ink-soft">No sarees here yet. <Link href="/shop/sarees" className="underline">See all sarees</Link>.</p>}
      </div>

      {current && guide && (
        <section className="mt-24 grid gap-10 border-t border-line pt-14 lg:grid-cols-[1fr_1.4fr] lg:gap-16" aria-label={`${current.label} saree guide`}>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.3em] text-gold">SAREE GUIDE</p>
            <h2 className="display mt-2 text-3xl sm:text-4xl">About {current.label.toLowerCase()} sarees</h2>
            <div className="zari-rule mt-3 w-20" />
            <p className="mt-6 leading-relaxed text-ink/85">{guide.intro}</p>
          </div>
          <FaqList faqs={guide.faqs} title={`${current.label} sarees: your questions`} />
        </section>
      )}
    </div>
  );
}

function FabricChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} aria-current={active ? "true" : undefined}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition-all duration-200 active:scale-95 ${active ? "border-ink bg-ink text-paper shadow-[0_6px_16px_-8px_rgba(37,36,43,.6)]" : "border-line-strong bg-card hover:-translate-y-0.5 hover:border-ink"}`}>
      {label}
      <LinkPending />
    </Link>
  );
}
