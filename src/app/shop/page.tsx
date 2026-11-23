import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ProductGrid } from "@/components/shop/ProductCard";
import { Reveal } from "@/components/shop/Reveal";
import { collectionLabel } from "@/lib/storefront/collections";
import { listPublished, liveCollections, type StoreProduct } from "@/server/services/storefront";

export const metadata: Metadata = {
  title: { absolute: "Handloom Sarees Online – Silk, Cotton, Linen & Kota | Thanvi Boutique" },
  description: "Shop authentic handloom sarees online from Thanvi Boutique: silk, cotton, linen, tissue, organza, Kota and kalamkari. Since 2016, with stores in Chennai, Madurai, Karaikudi & Coimbatore.",
  alternates: { canonical: "/shop" },
};

const PROMISES = [
  { title: "Handloom, since 2016", body: "Cotton, silk, linen and Banarasi blends, sourced with the weavers who make them." },
  { title: "Every piece, tracked", body: "Each saree carries its own code from our godown to your doorstep, so what you see is what ships." },
  { title: "Try it in person", body: "See and drape any saree at our stores in Chennai, Madurai, Karaikudi and Coimbatore." },
];

function Hero({ picks }: { picks: StoreProduct[] }) {
  const [main, ...side] = picks;
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:pt-16">
        <div className="rise">
          <p className="text-[11px] font-semibold tracking-[0.35em] text-gold">THANVI BOUTIQUE · HANDLOOM SAREES</p>
          <h1 className="display mt-5 text-[44px] leading-[1.02] sm:text-6xl lg:text-7xl">
            Wrap yourself
            <br />
            in <span className="foil">elegance.</span>
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ink-soft">
            Silk for the wedding, cotton for every day, linen and tissue for everything between, all woven by hand.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop/sarees" className="btn btn-gold px-7 py-3 tracking-[0.12em]">SHOP SAREES</Link>
            <a href="#fabrics" className="btn btn-ghost px-7 py-3 tracking-[0.12em]">EXPLORE FABRICS</a>
          </div>
        </div>
        {main && (
          <div className="rise rise-2 relative grid h-[460px] grid-cols-[1.25fr_1fr] gap-3 sm:h-[560px]">
            <div className="absolute -top-4 -right-4 hidden h-[70%] w-[55%] border border-gold-bright/60 lg:block" aria-hidden />
            <HeroTile p={main} className="row-span-2 rounded-t-[160px] rounded-b-[4px]" sizes="(min-width: 1024px) 28vw, 55vw" />
            {side.map((p) => <HeroTile key={p.slug} p={p} className="rounded-[4px]" sizes="(min-width: 1024px) 22vw, 42vw" />)}
          </div>
        )}
      </div>
    </section>
  );
}

function HeroTile({ p, className, sizes }: { p: StoreProduct; className: string; sizes: string }) {
  return (
    <Link href={`/shop/sarees/${p.slug}`} className={`group relative overflow-hidden ${className}`}>
      {p.photos[0] && <Image src={p.photos[0]} alt={p.title} fill priority sizes={sizes} className="object-cover object-top transition-transform duration-[1.2s] ease-out group-hover:scale-105" />}
      <span className="absolute inset-x-3 bottom-3 translate-y-2 rounded-full bg-paper/90 px-3 py-1.5 text-center text-[11px] font-semibold opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        {p.title}
      </span>
    </Link>
  );
}

async function FabricArches() {
  const tiles = (await liveCollections()).filter((t) => t.cover);
  if (tiles.length === 0) return null;
  return (
    <section id="fabrics" className="mx-auto max-w-7xl scroll-mt-32 px-4 py-14 sm:px-6">
      <SectionTitle eyebrow="SHOP BY FABRIC" title="Find your weave" />
      <div className="no-scrollbar -mx-4 mt-8 flex snap-x gap-5 overflow-x-auto px-4 pb-2">
        {tiles.map((t, i) => (
          <Reveal key={t.key} delay={i * 50} className="shrink-0 snap-start">
            <Link href={`/shop/sarees?fabric=${t.key}`} className="group block w-[150px] text-center sm:w-[170px]">
              <div className="arch relative aspect-[3/4] overflow-hidden border border-gold-bright/50 p-1.5 transition-colors duration-300 group-hover:border-gold-bright">
                <div className="arch relative h-full w-full overflow-hidden">
                  <Image src={t.cover!} alt="" fill sizes="170px" className="object-cover object-top transition-transform duration-700 group-hover:scale-110" />
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold tracking-[0.14em] uppercase"><span className="link-grow">{collectionLabel(t.key)}</span></p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, href }: { eyebrow: string; title: string; href?: string }) {
  return (
    <Reveal className="flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold">{eyebrow}</p>
        <h2 className="display mt-2 text-3xl sm:text-4xl">{title}</h2>
        <div className="zari-rule mt-3 w-20" />
      </div>
      {href && <Link href={href} className="group shrink-0 text-sm font-semibold">View all <span className="inline-block transition-transform group-hover:translate-x-1" aria-hidden>→</span></Link>}
    </Reveal>
  );
}

function Promises() {
  return (
    <section className="relative my-10 overflow-hidden bg-ink text-paper">
      <div className="zari absolute inset-y-0 left-0 w-2" aria-hidden />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-3 md:px-10">
        {PROMISES.map((p, i) => (
          <Reveal key={p.title} delay={i * 120}>
            <p className="code text-xs text-gold-bright">0{i + 1}</p>
            <h3 className="display mt-2 text-2xl">{p.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-paper/65">{p.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default async function ShopHome() {
  const all = await listPublished();
  if (all.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-32 text-center">
        <h1 className="display text-4xl">Our online collection is coming soon</h1>
        <p className="mt-4 text-ink-soft">Visit us in Chennai, Madurai, Karaikudi or Coimbatore in the meantime.</p>
      </div>
    );
  }
  const heroPicks = all.filter((p) => p.photos[0]).slice(0, 3);
  const newArrivals = all.slice(3, 11);
  const festive = (await listPublished({ sort: "price-desc" })).slice(0, 4);
  return (
    <>
      <Hero picks={heroPicks} />
      <FabricArches />
      {newArrivals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <SectionTitle eyebrow="JUST IN" title="New arrivals" href="/shop/sarees" />
          <div className="mt-8"><ProductGrid products={newArrivals} /></div>
        </section>
      )}
      <Promises />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionTitle eyebrow="FOR THE BIG DAY" title="Festive & bridal picks" href="/shop/sarees?sort=price-desc" />
        <div className="mt-8"><ProductGrid products={festive} /></div>
      </section>
    </>
  );
}
