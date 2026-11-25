"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Notice } from "@/components/admin/ui";
import { api } from "@/lib/http";
import type { LocationOption } from "@/server/services/myLocations";

export function StartCount({ locations, locationId }: { locations: LocationOption[]; locationId?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const count = await api<{ id: string }>("/api/inventory/counts", {
        method: "POST",
        body: Object.fromEntries(new FormData(event.currentTarget)),
      });
      router.push("/admin/inventory/counts/" + count.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the count");
      setBusy(false);
    }
  }

  return (
    <form className="panel p-5" onSubmit={start}>
      <div className="grid items-end gap-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
        <label className="text-sm font-semibold">Location
          <select name="locationId" defaultValue={locationId ?? locations[0].id} className="field mt-1">
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">SKU (optional)
          <input name="sku" className="field code mt-1 uppercase" placeholder="All products" maxLength={40} />
        </label>
        <label className="text-sm font-semibold">Bin (optional)
          <input name="binCode" className="field code mt-1 uppercase" placeholder="All bins" maxLength={20} />
        </label>
        <button className="btn btn-primary" disabled={busy}>Start count</button>
      </div>
      {error && <div className="mt-3"><Notice kind="err">{error}</Notice></div>}
    </form>
  );
}
