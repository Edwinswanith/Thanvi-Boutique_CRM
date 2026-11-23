"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/admin/ui";
import { api } from "@/lib/http";

interface Props {
  code: string;
  bins: { id: string; code: string }[];
  currentBinId: string | null;
}

export function MoveBin({ code, bins, currentBinId }: Props) {
  const router = useRouter();
  const [binId, setBinId] = useState(currentBinId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/items/${encodeURIComponent(code)}/bin`, { method: "PATCH", body: { binId: binId || null } });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not move");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rise rise-2 mt-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="label" htmlFor="move-bin">Move to bin</label>
        <select id="move-bin" className="field code min-w-48" value={binId} onChange={(e) => setBinId(e.target.value)}>
          <option value="">— Not shelved —</option>
          {bins.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
        </select>
      </div>
      <button className="btn btn-ghost" disabled={busy || binId === (currentBinId ?? "")} onClick={move}>{busy ? "Moving…" : "Move"}</button>
      {error && <Notice kind="err">{error}</Notice>}
    </div>
  );
}
