import { effectiveSeo, type ListingContent } from "@/lib/storefront/listing";

const SITE = "thanviboutique.com";

/** How the product will look in a Google result, using the same fallbacks as the live site. */
export function SeoPreview({ content }: { content: ListingContent }) {
  const seo = effectiveSeo(content);
  return (
    <figure className="rounded-lg border border-line bg-white p-4" aria-label="Search result preview">
      <figcaption className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Google preview</figcaption>
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[10px] font-bold text-gold-bright">T</span>
        <div className="leading-tight">
          <p className="text-[13px] text-[#202124]">Thanvi Boutique</p>
          <p className="truncate text-[12px] text-[#4d5156]">https://{SITE} › sarees › {content.slug || "…"}</p>
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-[19px] leading-snug text-[#1a0dab]">{seo.title}</p>
      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[#4d5156]">
        {seo.description || <span className="italic">Add a description so Google has something to show.</span>}
      </p>
    </figure>
  );
}
