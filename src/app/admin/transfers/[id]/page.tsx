import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/ui";
import { AppError } from "@/lib/api";
import { can, canAccessLocation } from "@/server/actor";
import { pageActor } from "@/server/page";
import { listBins } from "@/server/services/bins";
import { getTransfer } from "@/server/services/transfers";
import { TransferActions } from "./TransferActions";

export const metadata: Metadata = { title: "Transfer" };

export default async function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor, allowed } = await pageActor("transfers.view");
  if (!allowed) return <Forbidden />;
  let t;
  try {
    t = await getTransfer(actor, (await params).id);
  } catch (err) {
    return <div className="panel mx-auto mt-16 max-w-md p-8 text-center"><p className="display text-2xl">{err instanceof AppError ? err.message : "Not found"}</p></div>;
  }
  const atSource = canAccessLocation(actor, t.from.id);
  const atDest = canAccessLocation(actor, t.to.id);
  const destBins = atDest && t.status === "in_transit" ? await listBins(actor, t.to.id) : [];
  const timeline = [
    ["Requested", t.requestedBy, t.createdAt],
    ["Approved", t.approvedBy, null],
    ["Dispatched", t.dispatchedBy, t.dispatchedAt],
    ["Received", t.receivedBy, t.receivedAt],
  ] as const;

  return (
    <>
      <PageHeader eyebrow={`Transfer · ${t.from.code} → ${t.to.code}`} title={t.ref} description={`${t.from.name} to ${t.to.name}${t.note ? ` — ${t.note}` : ""}`} actions={<StatusBadge status={t.status} />} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <TransferActions
            transfer={t}
            can={{
              approve: atSource && can(actor, "transfers.approve") && t.status === "requested",
              dispatch: atSource && can(actor, "transfers.edit") && t.status === "approved",
              receive: atDest && can(actor, "transfers.edit") && t.status === "in_transit",
              cancel: can(actor, "transfers.edit") && (t.status === "requested" || t.status === "approved"),
            }}
            bins={destBins.map((b) => ({ id: b.id, code: b.code }))}
          />
          {t.lines.length > 0 && (
            <section className="panel rise rise-2 p-5">
              <h2 className="display mb-2 text-xl">Requested</h2>
              <ul className="space-y-1 text-sm">{t.lines.map((l, i) => <li key={i}><span className="code mr-2 font-semibold">{l.qty}×</span><span className="code text-gold">{l.sku}</span> {l.description}</li>)}</ul>
            </section>
          )}
          {t.items.length > 0 && (
            <section className="panel rise rise-3 p-5">
              <h2 className="display mb-2 text-xl">Pieces ({t.items.filter((i) => i.received).length}/{t.items.length} received)</h2>
              <ul className="code grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
                {t.items.map((i) => <li key={i.code} className={i.received ? "text-leaf" : t.shortCodes.includes(i.code) ? "text-madder" : ""}>{i.received ? "✓" : t.shortCodes.includes(i.code) ? "✗" : "·"} {i.code}</li>)}
              </ul>
              {t.shortCodes.length > 0 && <p className="mt-3 text-sm text-madder">Short (sent but not received): {t.shortCodes.join(", ")}</p>}
              {t.excessCodes.length > 0 && <p className="mt-1 text-sm text-madder">Excess (scanned but not on this transfer): {t.excessCodes.join(", ")}</p>}
            </section>
          )}
        </div>
        <aside className="panel rise rise-2 h-fit p-5">
          <h2 className="label">Timeline</h2>
          <ol className="space-y-3">
            {timeline.map(([label, who, at]) => (
              <li key={label} className={who ? "" : "opacity-40"}>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-ink-soft">{who || "—"}{at ? ` · ${new Date(at).toLocaleString("en-IN")}` : ""}</p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
}
