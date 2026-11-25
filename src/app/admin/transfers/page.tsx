import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/ui";
import { can, canAccessLocation } from "@/server/actor";
import { pageActor } from "@/server/page";
import { allLocationOptions, myLocations } from "@/server/services/myLocations";
import { listTransfers } from "@/server/services/transfers";
import { NewTransfer } from "./NewTransfer";

export const metadata: Metadata = { title: "Transfers" };

export default async function TransfersPage({ searchParams }: { searchParams: Promise<{ queue?: string; location?: string; mode?: string }> }) {
  const { actor, allowed } = await pageActor("transfers.view");
  if (!allowed) return <Forbidden />;
  const [transfers, mine, all, params] = await Promise.all([listTransfers(actor), myLocations(actor), allLocationOptions(), searchParams]);
  const selected = mine.find((location) => location.id === params.location);
  const inScope = selected ? transfers.filter((transfer) => transfer.from.id === selected.id || transfer.to.id === selected.id) : transfers;
  const incoming = inScope.filter((transfer) => transfer.status === "in_transit" && canAccessLocation(actor, transfer.to.id) && (!selected || selected.id === transfer.to.id));
  const history = inScope.filter((transfer) => transfer.status === "received" || transfer.status === "cancelled");
  const queues = [
    { key: "open", title: "Open", rows: inScope.filter((transfer) => transfer.status !== "received" && transfer.status !== "cancelled") },
    { key: "incoming", title: "Incoming", rows: incoming },
    { key: "differences", title: "Differences", rows: inScope.filter((transfer) => transfer.shortCodes.length || transfer.excessCodes.length) },
    { key: "history", title: "History", rows: history },
  ];
  const queue = queues.find((option) => option.key === params.queue) ?? queues[0];
  const allowSend = can(actor, "transfers.edit") && mine.length > 0 && all.length > 1;
  const allowRequest = mine.some((location) => location.type === "store") && all.some((location) => location.type === "godown");
  const initialMode = params.mode === "request" || params.mode === "direct" ? params.mode : undefined;

  return (
    <>
      <PageHeader title="Transfers" description="Request, send or receive stock. Each transfer keeps the same piece codes." />
      <nav aria-label="Transfer queues" className="mb-5 flex flex-wrap gap-2">
        {queues.map((option) => (
          <Link key={option.key} href={"/admin/transfers?queue=" + option.key + (selected ? "&location=" + selected.id : "")}
            aria-current={queue === option ? "page" : undefined}
            className={"rounded-full border px-3 py-1.5 text-sm " + (queue === option ? "border-ink bg-ink text-paper" : "border-line-strong text-ink")}>
            {option.title} <span className="code ml-1 text-xs">{option.rows.length}</span>
          </Link>
        ))}
      </nav>
      {queue.key === "open" && can(actor, "transfers.create") && (allowSend || allowRequest) && (
        <NewTransfer mine={mine} all={all} locationId={selected?.id} allowSend={allowSend} initialMode={initialMode} />
      )}
      <section aria-labelledby="transfer-list" className="mt-6">
        <h2 id="transfer-list" className="display mb-3 text-2xl">{queue.title} transfers</h2>
        <div className="panel divide-y divide-line">
          {queue.rows.map((transfer) => (
            <Link key={transfer.id} href={"/admin/transfers/" + transfer.id} className="grid gap-2 px-5 py-4 hover:bg-gold-wash/40 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
              <div>
                <p className="code font-semibold">{transfer.ref}</p>
                <p className="text-xs text-ink-soft">{new Date(transfer.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
              </div>
              <p className="text-sm">{transfer.from.name} → {transfer.to.name}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-ink-soft">
                  {transfer.items.length ? transfer.items.filter((item) => item.received).length + " of " + transfer.items.length + " received" : transfer.lines.reduce((total, line) => total + line.qty, 0) + " requested"}
                </span>
                <StatusBadge status={transfer.status} />
              </div>
            </Link>
          ))}
          {!queue.rows.length && <p className="px-5 py-6 text-sm text-ink-soft">No transfers in this queue.</p>}
        </div>
      </section>
    </>
  );
}
