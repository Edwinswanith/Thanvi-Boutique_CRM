import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { formatINR } from "@/lib/money";
import { pageActor } from "@/server/page";
import { listCatalog, type CatalogStatus } from "@/server/services/catalog";

export const metadata: Metadata = { title: "Online catalog" };

const TABS: { key: "all" | CatalogStatus; label: string }[] = [
  { key: "all", label: "All products" },
  { key: "published", label: "Live on website" },
  { key: "draft", label: "Drafts" },
  { key: "unlisted", label: "Not on website" },
];

const BADGE: Record<CatalogStatus, { label: string; cls: string }> = {
  published: { label: "Live", cls: "bg-leaf-wash text-leaf" },
  draft: { label: "Draft", cls: "bg-gold-wash text-ink" },
  unlisted: { label: "Not listed", cls: "bg-ink/8 text-ink-soft" },
};

const STEPS = [
  { n: "1", title: "Received into stock", body: "The godown receives the saree. It gets a SKU, MRP and a quick photo." },
  { n: "2", title: "Write & photograph", body: "Add studio photos, the title, description, highlights and search text here." },
  { n: "3", title: "Publish", body: "Check the list, press Publish, and it's live on the website. Unpublish any time." },
];

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { actor, allowed } = await pageActor("catalog.view");
  if (!allowed) return <Forbidden />;
  const sp = await searchParams;
  const status = TABS.some((t) => t.key === sp.status) ? (sp.status as "all" | CatalogStatus) : "all";
  const q = (sp.q ?? "").slice(0, 80);
  const { rows, counts } = await listCatalog(actor, { q, status });
  const href = (s: string) => `/admin/catalog?${new URLSearchParams({ ...(q ? { q } : {}), ...(s !== "all" ? { status: s } : {}) })}`;

  return (
    <>
      <PageHeader
        eyebrow="Website · Content"
        title="Online catalog"
        description="Photos, copy and search details for every product on the website. Price always comes from the product's MRP."
        actions={<Link href="/shop" target="_blank" className="btn btn-ghost">View website ↗</Link>}
      />

      <ol className="rise rise-1 mb-8 grid gap-3 md:grid-cols-3" aria-label="How a product gets onto the website">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-3 rounded-lg border border-line bg-card/70 p-4">
            <span className="code grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-xs text-gold-bright">{s.n}</span>
            <div>
              <p className="text-sm font-semibold">{s.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="rise rise-2 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Filter by status">
          {TABS.map((t) => (
            <Link key={t.key} href={href(t.key)} aria-current={status === t.key ? "page" : undefined}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm whitespace-nowrap transition-colors ${status === t.key ? "border-gold font-semibold" : "border-transparent text-ink-soft hover:text-ink"}`}>
              {t.label}
              <span className="code rounded-full bg-ink/6 px-1.5 text-[11px]">{counts[t.key]}</span>
            </Link>
          ))}
        </nav>
        <form action="/admin/catalog" className="mb-2 flex gap-2">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} className="field w-56" placeholder="Search name or SKU" aria-label="Search catalog" />
          <button className="btn btn-ghost">Search</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="panel p-10 text-center text-sm text-ink-soft">
          {counts.all === 0 ? "No products yet. Products appear here once stock is received at a godown." : "Nothing matches this filter."}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rows.map((r, i) => (
            <li key={r.productId} className="rise" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
              <Link href={`/admin/catalog/${r.productId}`} className="group block overflow-hidden rounded-lg border border-line bg-card transition-all hover:-translate-y-0.5 hover:border-gold-bright hover:shadow-[0_14px_30px_-20px_rgba(37,36,43,.5)]">
                <div className="relative aspect-[3/4] bg-gold-wash">
                  {r.coverPhotoId ? (
                    // eslint-disable-next-line @next/next/no-img-element -- authenticated GridFS photo
                    <img src={`/api/catalog/photos/${r.coverPhotoId}`} alt="" loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-ink-soft">No photo yet</div>
                  )}
                  <span className={`absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${BADGE[r.status].cls}`}>{BADGE[r.status].label}</span>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold">{r.title ?? r.name}</p>
                  <p className="mt-0.5 flex justify-between text-xs text-ink-soft">
                    <span className="code text-gold">{r.sku}</span>
                    <span className="code">{formatINR(r.mrp)}</span>
                  </p>
                  <p className="mt-2 text-xs font-semibold text-ink group-hover:text-gold">{r.status === "unlisted" ? "Create listing →" : "Edit listing →"}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
