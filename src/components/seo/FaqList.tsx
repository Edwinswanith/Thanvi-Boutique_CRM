import type { Faq } from "@/lib/seo/guides";

/**
 * Visible Q&A. Answer engines quote these; Google requires FAQ markup to match
 * what's on the page, so the same list feeds faqJsonLd().
 */
export function FaqList({ faqs, title = "Frequently asked questions" }: { faqs: readonly Faq[]; title?: string }) {
  return (
    <section aria-labelledby="faq-title">
      <h2 id="faq-title" className="display text-2xl sm:text-3xl">{title}</h2>
      <div className="mt-5 divide-y divide-line border-y border-line">
        {faqs.map((f, i) => (
          <details key={f.q} open={i === 0} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
              <h3>{f.q}</h3>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line-strong text-ink-soft transition-transform duration-300 group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="pb-5 text-sm leading-relaxed text-ink-soft">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
