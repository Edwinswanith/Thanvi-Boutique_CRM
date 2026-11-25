"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice, ScanInput } from "@/components/admin/ui";
import { api } from "@/lib/http";
import type { getStockCount } from "@/server/services/stockCounts";

type Count = Awaited<ReturnType<typeof getStockCount>>;

export function CountActions({ count, canEdit, canApprove }: { count: Count; canEdit: boolean; canApprove: boolean }) {
  const router = useRouter();
  const [codes, setCodes] = useState(count.scannedCodes);
  const [reason, setReason] = useState(count.reason);
  const [version, setVersion] = useState(count.version);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string }>();
  const [busy, setBusy] = useState(false);
  const endpoint = "/api/inventory/counts/" + count.id;

  async function run(action: "save" | "finish" | "cancel" | "approve") {
    setBusy(true);
    setNotice(undefined);
    try {
      if (action === "approve") await api(endpoint + "/approve", { method: "POST" });
      else if (action === "cancel") await api(endpoint, { method: "DELETE" });
      else {
        const saved = await api<Count>(endpoint, { method: "PATCH", body: { codes, reason, version, finish: action === "finish" } });
        setVersion(saved.version);
      }
      if (action === "save") setNotice({ kind: "ok", text: "Count progress saved." });
      else router.refresh();
    } catch (err) {
      setNotice({ kind: "err", text: err instanceof Error ? err.message : "Could not update this count" });
    } finally {
      setBusy(false);
    }
  }

  const counting = count.status === "open" && canEdit;
  const reviewing = count.status === "review";
  if (!counting && !reviewing) return null;
  return (
    <section className="panel space-y-4 p-5" aria-label={counting ? "Record scans" : "Review count"}>
      {counting && (
        <>
          <h2 className="display text-xl">Scan pieces ({codes.length})</h2>
          <ScanInput label="Add piece" autoFocus disabled={busy || codes.length >= 2000} onScan={(code) => {
            setCodes((previous) => previous.includes(code) ? previous : [...previous, code]);
            setNotice(undefined);
          }} />
          {codes.length > 0 && (
            <ul aria-label="Counted pieces" className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {codes.map((code) => (
                <li key={code}><button type="button" aria-label={"Remove " + code} disabled={busy} className="code rounded border border-line px-2 py-1 text-xs" onClick={() => setCodes((previous) => previous.filter((piece) => piece !== code))}>{code} ×</button></li>
              ))}
            </ul>
          )}
          <label className="block text-sm font-semibold">Reason for any differences
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="field mt-1 block" rows={2} maxLength={500} />
          </label>
        </>
      )}
      {reviewing && <p className="text-sm text-ink-soft">A manager can approve the missing and found pieces for this location.</p>}
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      <div className="flex flex-wrap gap-2">
        {counting && <button className="btn btn-ghost" disabled={busy} onClick={() => void run("save")}>Save progress</button>}
        {counting && <button className="btn btn-primary" disabled={busy} onClick={() => void run("finish")}>Submit count</button>}
        {reviewing && canApprove && <button className="btn btn-primary" disabled={busy} onClick={() => void run("approve")}>Approve adjustment</button>}
        {canEdit && <button className="btn btn-ghost" disabled={busy} onClick={() => void run("cancel")}>Cancel count</button>}
      </div>
    </section>
  );
}
