"use client";

import { useState } from "react";
import { api } from "@/lib/http";
import type { LocationView } from "@/server/services/locations";
import { StoreWizard } from "./StoreWizard";

const TYPE_META: Record<LocationView["type"], { title: string; note: string }> = {
  godown: { title: "Godowns", note: "Receiving & distribution" },
  store: { title: "Stores", note: "Walk-in billing" },
  online: { title: "Online", note: "Website & Instagram" },
};

interface Props {
  initial: LocationView[];
  canCreate: boolean;
  canEdit: boolean;
}

export function StoresManager({ initial, canCreate, canEdit }: Props) {
  const [locations, setLocations] = useState(initial);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateLocation(loc: LocationView, body: { active?: boolean; acceptsVendorStock?: boolean }) {
    setError(null);
    try {
      const updated = await api<LocationView>(`/api/locations/${loc.id}`, { method: "PATCH", body });
      setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update");
    }
  }

  return (
    <div className="space-y-10">
      {canCreate && (
        <div className="rise rise-1 flex items-center justify-between rounded-lg border border-dashed border-gold/60 bg-gold-wash/50 px-6 py-5">
          <div>
            <p className="display text-xl">Opening a new store?</p>
            <p className="text-sm text-ink-soft">Three short steps. No developer needed.</p>
          </div>
          <button className="btn btn-gold" onClick={() => setWizardOpen(true)}>+ New location</button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-madder">{error}</p>}

      {(Object.keys(TYPE_META) as LocationView["type"][]).map((type, idx) => {
        const list = locations.filter((l) => l.type === type);
        if (!list.length) return null;
        return (
          <section key={type} className={`rise rise-${idx + 2}`}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="display text-2xl">{TYPE_META[type].title}</h2>
              <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">{TYPE_META[type].note}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((loc) => (
                <LocationCard key={loc.id} loc={loc} canEdit={canEdit}
                  onToggle={() => updateLocation(loc, { active: !loc.active })}
                  onReceiving={() => updateLocation(loc, { acceptsVendorStock: !loc.acceptsVendorStock })} />
              ))}
            </div>
          </section>
        );
      })}

      {wizardOpen && (
        <StoreWizard
          onClose={() => setWizardOpen(false)}
          onCreated={(loc) => {
            setLocations((prev) => [...prev, loc]);
            setWizardOpen(false);
          }}
        />
      )}
    </div>
  );
}

function LocationCard({ loc, canEdit, onToggle, onReceiving }: { loc: LocationView; canEdit: boolean; onToggle: () => void; onReceiving: () => void }) {
  return (
    <article className={`panel relative overflow-hidden p-5 ${loc.active ? "" : "opacity-60"}`}>
      <div className="zari absolute inset-x-0 top-0 h-1" aria-hidden />
      <div className="flex items-start justify-between">
        <span className="code rounded bg-ink px-2 py-0.5 text-xs text-paper">{loc.code}</span>
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${loc.active ? "text-leaf" : "text-madder"}`}>
          {loc.active ? "Active" : "Inactive"}
        </span>
      </div>
      <p className="display mt-3 text-xl">{loc.name}</p>
      <p className="mt-1 min-h-5 text-sm text-ink-soft">{[loc.address, loc.city].filter(Boolean).join(", ") || "—"}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-ink-soft">GSTIN</dt>
          <dd className="code">{loc.gstin || "—"}</dd>
        </div>
        {loc.type !== "godown" && (
          <div>
            <dt className="text-ink-soft">Invoice prefix</dt>
            <dd className="code">{loc.invoicePrefix}</dd>
          </div>
        )}
      </dl>
      {loc.type === "godown" && (
        <label className="mt-3 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={loc.acceptsVendorStock} disabled={!canEdit} onChange={onReceiving} />
          Receive vendor stock
        </label>
      )}
      {canEdit && (
        <button onClick={onToggle} className="mt-4 text-xs font-semibold text-ink-2 underline-offset-4 hover:underline">
          {loc.active ? "Deactivate" : "Reactivate"}
        </button>
      )}
    </article>
  );
}
