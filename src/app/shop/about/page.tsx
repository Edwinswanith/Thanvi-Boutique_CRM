import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/seo/FaqList";
import { JsonLd } from "@/components/seo/JsonLd";
import { Reveal } from "@/components/shop/Reveal";
import type { Faq } from "@/lib/seo/guides";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl, SITE, siteUrl } from "@/lib/seo/site";
import { COLLECTIONS } from "@/lib/storefront/collections";

export const metadata: Metadata = {
  title: { absolute: "About Thanvi Boutique – Handloom Saree Store in Tamil Nadu" },
  description: "Thanvi Boutique has sold authentic handloom sarees since 2016, with stores in Chennai, Madurai, Karaikudi and Coimbatore and an online shop delivering across India.",
  alternates: { canonical: "/shop/about" },
};

const cityList = `${SITE.cities.slice(0, -1).join(", ")} and ${SITE.cities.at(-1)}`;
const fabricList = COLLECTIONS.map((c) => c.label.toLowerCase()).join(", ");

const FAQS: Faq[] = [
  { q: "Where are Thanvi Boutique's stores?", a: `Thanvi Boutique has stores in ${cityList}, in Tamil Nadu, India, and sells online at ${absoluteUrl("/shop")}.` },
  { q: "What does Thanvi Boutique sell?", a: `Handloom sarees in ${fabricList}, for everyday wear, office, festivals and weddings.` },
  { q: "Since when has Thanvi Boutique been in business?", a: `Thanvi Boutique was founded in ${SITE.foundingYear}.` },
  { q: "Can I buy Thanvi Boutique sarees online?", a: "Yes. You can browse by fabric, see photos, prices and care details, and order sarees online." },
  { q: "What is Thanvi Boutique's return policy?", a: `${SITE.returnPolicy} You can exchange a saree, but refunds aren't offered.` },
  { q: "Can I see a saree in person before buying?", a: `Yes. Visit any Thanvi Boutique store in ${cityList} to see and drape sarees before you buy.` },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "AboutPage", name: "About Thanvi Boutique", url: absoluteUrl("/shop/about"), about: { "@id": `${siteUrl()}/#organization` } }} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/shop" }, { name: "About", path: "/shop/about" }])} />
      <JsonLd data={faqJsonLd(FAQS)} />

      <nav aria-label="Breadcrumb" className="text-xs text-ink-soft">
        <Link href="/shop" className="hover:text-ink">Home</Link> <span aria-hidden>/</span> <span>About</span>
      </nav>

      <header className="rise mt-6 max-w-3xl">
        <p className="text-[11px] font-semibold tracking-[0.35em] text-gold">SINCE {SITE.foundingYear}</p>
        <h1 className="display mt-3 text-4xl leading-tight sm:text-6xl">Handloom sarees, <span className="foil">chosen by hand.</span></h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">
          {SITE.name} is a saree boutique from Tamil Nadu. Since {SITE.foundingYear} we have offered authentic handloom sarees crafted from cotton, silk, linen and Banarasi blends,
          working with artisans to keep traditional weaving alive.
        </p>
      </header>

      <div className="mt-14 grid gap-6 sm:grid-cols-3">
        {[
          { k: "Stores", v: cityList },
          { k: "Online", v: "Delivery across India" },
          { k: "Policy", v: SITE.returnPolicy },
        ].map((f, i) => (
          <Reveal key={f.k} delay={i * 90} className="rounded-lg border border-line bg-card p-5">
            <p className="text-[11px] font-semibold tracking-[0.25em] text-gold uppercase">{f.k}</p>
            <p className="mt-2 leading-relaxed">{f.v}</p>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-16">
        <h2 className="display text-3xl">Our fabrics</h2>
        <div className="zari-rule mt-3 w-20" />
        <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {COLLECTIONS.map((c) => (
            <li key={c.key}>
              <Link href={`/shop/sarees?fabric=${c.key}`} className="font-semibold"><span className="link-grow">{c.label} sarees</span></Link>
              <span className="text-ink-soft"> — {c.blurb}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      <div className="mt-20 max-w-3xl">
        <FaqList faqs={FAQS} />
      </div>
    </div>
  );
}
