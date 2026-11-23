import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/ui";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { allLocationOptions, myLocations } from "@/server/services/myLocations";
import { listTransfers } from "@/server/services/transfers";
import { NewTransfer } from "./NewTransfer";

export const metadata: Metadata = { title: "Stock requests" };

const STEPS = ["requested", "approved", "in_transit", "received"];

export default async function TransfersPage() {
  const { actor, allowed } = await pageActor("transfers.view");
  if (!allowed) return <Forbidden />;
  const [transfers, mine, all] = await Promise.all([listTransfers(actor), myLocations(actor), allLocationOptions()]);
  const open = transfers.filter((t) => t.status !== "received" && t.status !== "cancelled");
  const done = transfers.filter((t) => !open.includes(t));

  return (
    <>
      <PageHeader
        eyebrow="Operations · Movement"
        title="Stock requests & transfers"
        description="Stores request stock, godowns approve and dispatch by scanning, stores scan it in. Stock leaves the godown the moment it's sent and lands in the store only when scanned."
      />
      {can(actor, "transfers.create") && <NewTransfer mine={mine.filter((l) => l.type !== "online")} all={all.filter((l) => l.type !== "online")} />}

      {[["Open", open], ["Completed", done]].map(([title, list]) => (
        <section key={String(title)} className="rise rise-2 mt-8">
          <h2 className="display mb-3 text-2xl">{String(title)}</h2>
          <div className="panel divide-y divide-line">
            {(list as typeof transfers).map((t) => (
              <Link key={t.id} href={`/admin/transfers/${t.id}`} className="grid gap-2 px-5 py-4 transition-colors hover:bg-gold-wash/40 sm:grid-cols-[140px_1fr_auto] sm:items-center">
                <div>
                  <p className="code font-semibold">{t.ref}</p>
                  <p className="text-xs text-ink-soft">{new Date(t.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-sm"><span className="code">{t.from.code}</span> → <span className="code">{t.to.code}</span> <span className="text-ink-soft">· {t.from.name} to {t.to.name}</span></p>
                  <div className="mt-1.5 flex gap-1" aria-hidden>
                    {STEPS.map((s, i) => (
                      <span key={s} className={`h-1 w-10 rounded ${t.status === "cancelled" ? "bg-line" : STEPS.indexOf(t.status) >= i ? "bg-gold" : "bg-line"}`} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-ink-soft">{t.items.length ? `${t.items.length} pcs` : `${t.lines.reduce((a, l) => a + l.qty, 0)} requested`}</span>
                  <StatusBadge status={t.status} />
                </div>
              </Link>
            ))}
            {!(list as typeof transfers).length && <p className="px-5 py-8 text-center text-sm text-ink-soft">Nothing here.</p>}
          </div>
        </section>
      ))}
    </>
  );
}
