"use client";

import { useState } from "react";
import { Barcode } from "@/components/Barcode";
import { formatSeriesCode, isCode39Safe, itemCode } from "@/lib/code39";
import { api } from "@/lib/http";
import type { SeriesView } from "@/server/services/numberSeries";

interface Props {
  initial: SeriesView[];
  canEdit: boolean;
}

export function NumberingManager({ initial, canEdit }: Props) {
  const [series, setSeries] = useState(initial);
  const sku = series.find((s) => s.key === "sku");
  const others = series.filter((s) => s.key !== "sku");
  const replace = (s: SeriesView) => setSeries((prev) => prev.map((p) => (p.key === s.key ? s : p)));

  return (
    <div className="space-y-8">
      {sku && <SeriesEditor series={sku} canEdit={canEdit} onSaved={replace} featured />}
      <section className="rise rise-3">
        <h2 className="display mb-3 text-2xl">Other series</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {others.map((s) => <SeriesEditor key={s.key} series={s} canEdit={canEdit} onSaved={replace} />)}
        </div>
      </section>
    </div>
  );
}

interface EditorProps {
  series: SeriesView;
  canEdit: boolean;
  featured?: boolean;
  onSaved: (s: SeriesView) => void;
}

function SeriesEditor({ series, canEdit, featured, onSaved }: EditorProps) {
  const [prefix, setPrefix] = useState(series.prefix);
  const [next, setNext] = useState(String(series.next));
  const [padding, setPadding] = useState(String(series.padding));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const nextNum = Number.parseInt(next, 10);
  const pad = Number.parseInt(padding, 10);
  const prefixOk = isCode39Safe(prefix);
  const valid = prefixOk && Number.isInteger(nextNum) && nextNum >= 0 && Number.isInteger(pad) && pad >= 1 && pad <= 10;
  const preview = valid ? formatSeriesCode(prefix, nextNum, pad) : "";
  const dirty = prefix !== series.prefix || nextNum !== series.next || pad !== series.padding;

  async function save() {
    if (nextNum < series.next && !window.confirm(`Moving the start back from ${series.next} to ${nextNum} can create duplicate codes. Continue?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const saved = await api<SeriesView>(`/api/number-series/${encodeURIComponent(series.key)}`, {
        method: "PATCH",
        body: { prefix, next: nextNum, padding: pad },
      });
      onSaved(saved);
      setMsg({ ok: true, text: "Saved" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save" });
    } finally {
      setBusy(false);
    }
  }

  const fields = (
    <div className={`grid gap-3 ${featured ? "sm:grid-cols-3" : "grid-cols-3"}`}>
      <div>
        <label className="label" htmlFor={`${series.key}-prefix`}>Prefix</label>
        <input id={`${series.key}-prefix`} className={`field code uppercase ${prefixOk ? "" : "border-madder"}`} maxLength={10}
          disabled={!canEdit} value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} />
      </div>
      <div>
        <label className="label" htmlFor={`${series.key}-next`}>Next number</label>
        <input id={`${series.key}-next`} className="field code" inputMode="numeric" disabled={!canEdit} value={next}
          onChange={(e) => setNext(e.target.value.replace(/\D/g, ""))} />
      </div>
      <div>
        <label className="label" htmlFor={`${series.key}-pad`}>Digits</label>
        <input id={`${series.key}-pad`} className="field code" type="number" min={1} max={10} disabled={!canEdit} value={padding}
          onChange={(e) => setPadding(e.target.value)} />
      </div>
    </div>
  );

  const footer = canEdit && (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-sm">
        {!prefixOk && <span className="text-madder">Only A–Z, 0–9 and - . $ / + % are allowed</span>}
        {msg && <span role="status" className={msg.ok ? "text-leaf" : "text-madder"}>{msg.text}</span>}
      </span>
      <button className="btn btn-primary" disabled={!valid || !dirty || busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
    </div>
  );

  if (!featured) {
    return (
      <article className="panel p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="font-semibold">{series.label}</p>
          <p className="code text-sm text-gold">{preview || "—"}</p>
        </div>
        {fields}
        {footer}
      </article>
    );
  }

  return (
    <section className="panel rise rise-1 grid overflow-hidden lg:grid-cols-[1fr_340px]">
      <div className="p-6">
        <p className="code text-[11px] uppercase tracking-[0.24em] text-gold">Primary</p>
        <h2 className="display text-3xl">{series.label}</h2>
        <p className="mt-1 mb-5 text-sm text-ink-soft">
          A new SKU is issued for every product received. Each physical piece then gets <span className="code">SKU-001</span>, <span className="code">SKU-002</span>…
        </p>
        {fields}
        {footer}
      </div>
      <LabelPreview sku={preview} />
    </section>
  );
}

function LabelPreview({ sku }: { sku: string }) {
  const piece = sku ? itemCode(sku, 1) : "";
  return (
    <div className="relative flex flex-col items-center justify-center gap-3 bg-ink px-6 py-8">
      <div className="zari absolute inset-y-0 left-0 w-1.5" aria-hidden />
      <p className="code text-[10px] tracking-[0.3em] text-gold-bright">LABEL PREVIEW · CODE 39</p>
      <div className="w-full max-w-[280px] rounded-sm bg-white px-4 pt-3 pb-2 shadow-[0_18px_40px_-20px_rgba(0,0,0,.6)]">
        <div className="flex items-baseline justify-between text-[10px] text-ink">
          <span className="display text-sm">Thanvi</span>
          <span className="code">MRP ₹ 4,850</span>
        </div>
        <p className="truncate text-[11px] text-ink-soft">Kanchipuram silk · Peacock blue</p>
        {piece ? <Barcode value={piece} height={10} className="mt-2 [&_svg]:h-auto [&_svg]:w-full" /> : <p className="py-6 text-center text-xs text-madder">Fix the settings to preview</p>}
      </div>
      <p className="text-center text-xs text-paper/60">First piece of the next product: <span className="code text-paper">{piece || "—"}</span></p>
    </div>
  );
}
