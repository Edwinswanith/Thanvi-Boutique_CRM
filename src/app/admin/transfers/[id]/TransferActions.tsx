"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice, ScanInput } from "@/components/admin/ui";
import { api } from "@/lib/http";
import type { TransferView } from "@/server/services/transfers";

interface Props {
  transfer: TransferView;
  can: { approve: boolean; dispatch: boolean; receive: boolean; cancel: boolean };
  bins: { id: string; code: string }[];
}

export function TransferActions({ transfer, can, bins }: Props) {
  const router = useRouter();
  const [scanned, setScanned] = useState<string[]>([]);
  const [binId, setBinId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/transfers/${transfer.id}/${action}`, { method: "POST", body: body ?? {} });
      setScanned([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const addScan = (code: string) => setScanned((s) => (s.includes(code) ? s : [...s, code]));
  const expected = new Set(transfer.items.map((i) => i.code));
  const scanMode = can.dispatch ? "dispatch" : can.receive ? "receive" : null;
  if (!can.approve && !scanMode && !can.cancel) return null;

  return (
    <section className="panel rise rise-1 space-y-4 p-5">
      {can.approve && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm">The store is waiting for this stock. Approve it, then scan the pieces you send.</p>
          <button className="btn btn-primary" disabled={busy} onClick={() => act("approve")}>Approve request</button>
        </div>
      )}
      {scanMode && (
        <>
          <p className="display text-xl">{scanMode === "dispatch" ? "Scan pieces to send" : "Scan pieces as they arrive"}</p>
          {scanMode === "receive" && (
            <div>
              <label className="label" htmlFor="rcv-bin">Put received pieces into</label>
              <select id="rcv-bin" className="field code max-w-xs" value={binId} onChange={(e) => setBinId(e.target.value)}>
                <option value="">— Not shelved yet —</option>
                {bins.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
              </select>
            </div>
          )}
          <ScanInput onScan={addScan} label="Add" autoFocus />
          {scanned.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {scanned.map((c) => (
                <li key={c} className={`code flex items-center gap-1 rounded px-2 py-0.5 text-sm ${scanMode === "receive" && !expected.has(c) ? "bg-madder-wash text-madder" : "bg-gold-wash"}`}>
                  {c}
                  <button aria-label={`Remove ${c}`} onClick={() => setScanned((s) => s.filter((x) => x !== c))}>×</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            {scanMode === "dispatch" ? (
              <button className="btn btn-gold" disabled={busy || !scanned.length} onClick={() => act("dispatch", { codes: scanned })}>
                Mark sent ({scanned.length}) — stock leaves {transfer.from.code}
              </button>
            ) : (
              <>
                <button className="btn btn-gold" disabled={busy || !scanned.length} onClick={() => act("receive", { codes: scanned, binId: binId || null })}>
                  Receive scanned ({scanned.length})
                </button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => {
                  if (window.confirm("Close this transfer? Anything not yet scanned will be recorded as SHORT.")) void act("receive", { codes: scanned, binId: binId || null, final: true });
                }}>
                  Finish & record shortages
                </button>
              </>
            )}
          </div>
        </>
      )}
      {can.cancel && (
        <button className="text-xs font-semibold text-madder hover:underline" disabled={busy} onClick={() => window.confirm("Cancel this transfer?") && void act("cancel")}>
          Cancel transfer
        </button>
      )}
      {error && <Notice kind="err">{error}</Notice>}
    </section>
  );
}
