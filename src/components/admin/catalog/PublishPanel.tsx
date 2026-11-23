"use client";

import { collectionLabel, formatPrice } from "@/lib/storefront/collections";
import { canPublish, publishChecklist, type ListingContent } from "@/lib/storefront/listing";
import { photoSrc } from "./PhotoManager";

export type EditorStatus = "unlisted" | "draft" | "published";

interface PublishPanelProps {
  content: ListingContent;
  status: EditorStatus;
  price: number;
  dirty: boolean;
  busy: "save" | "publish" | null;
  canEdit: boolean;
  canApprove: boolean;
  savedAt: string | null;
  onSave: () => void;
  onPublish: (publish: boolean) => void;
}

const STATUS_COPY: Record<EditorStatus, { label: string; cls: string; dot: string }> = {
  unlisted: { label: "Not on website", cls: "text-ink-soft", dot: "bg-line-strong" },
  draft: { label: "Draft · not visible", cls: "text-ink", dot: "bg-gold-bright" },
  published: { label: "Live on website", cls: "text-leaf", dot: "bg-leaf animate-pulse" },
};

export function PublishPanel(p: PublishPanelProps) {
  const checklist = publishChecklist(p.content);
  const ready = canPublish(p.content);
  const live = p.status === "published";
  const s = STATUS_COPY[p.status];
  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <div className="panel p-5">
        <p className={`flex items-center gap-2 text-sm font-semibold ${s.cls}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden />
          {s.label}
        </p>
        <p className="mt-1 text-xs text-ink-soft" aria-live="polite">
          {p.dirty ? "You have unsaved changes" : p.savedAt ? `Saved ${new Date(p.savedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : "Not saved yet"}
        </p>

        <ul className="mt-4 space-y-1.5" aria-label="Publishing checklist">
          {checklist.map((c) => (
            <li key={c.key} className="flex items-center gap-2 text-sm">
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-all duration-300 ${c.ok ? "scale-100 bg-leaf text-white" : c.required ? "bg-madder-wash text-madder" : "bg-ink/6 text-ink-soft"}`} aria-hidden>
                {c.ok ? "✓" : c.required ? "!" : "·"}
              </span>
              <span className={c.ok ? "text-ink" : "text-ink-soft"}>{c.label}</span>
              {!c.required && !c.ok && <span className="ml-auto text-[10px] uppercase tracking-wider text-ink-soft">tip</span>}
              <span className="sr-only">{c.ok ? "done" : c.required ? "required" : "recommended"}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 grid gap-2">
          {p.canEdit && (
            <button type="button" onClick={p.onSave} disabled={!p.dirty || p.busy !== null} className="btn btn-ghost w-full">
              {p.busy === "save" ? <Spinner /> : null}
              {live ? "Save changes" : "Save draft"}
              <kbd className="code ml-1 hidden rounded border border-line px-1 text-[10px] text-ink-soft sm:inline">⌘S</kbd>
            </button>
          )}
          {p.canApprove && !live && (
            <button type="button" onClick={() => p.onPublish(true)} disabled={!ready || p.busy !== null} className="btn btn-gold w-full py-2.5">
              {p.busy === "publish" ? <Spinner /> : null}
              {p.dirty ? "Save & publish" : "Publish"}
            </button>
          )}
          {p.canApprove && live && (
            <button type="button" onClick={() => p.onPublish(false)} disabled={p.busy !== null} className="btn btn-danger w-full">
              {p.busy === "publish" ? <Spinner /> : null}
              Unpublish
            </button>
          )}
          {!ready && p.canApprove && !live && <p className="text-xs text-ink-soft">Finish the items marked ! to publish.</p>}
          {!p.canApprove && <p className="text-xs text-ink-soft">Your role can edit but not publish. Ask a manager to publish.</p>}
          {live && p.content.slug && (
            <a href={`/shop/sarees/${p.content.slug}`} target="_blank" rel="noreferrer" className="mt-1 text-center text-sm font-semibold underline decoration-gold-bright underline-offset-4">
              View on website ↗
            </a>
          )}
        </div>
      </div>

      <div className="panel p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Shop card preview</p>
        <div className="mx-auto mt-3 max-w-[200px]">
          <div className="aspect-[3/4] overflow-hidden rounded-[3px] bg-gold-wash">
            {p.content.photoIds[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- authenticated GridFS photo
              <img src={photoSrc(p.content.photoIds[0])} alt="" className="h-full w-full object-cover object-top" />
            ) : (
              <div className="grid h-full place-items-center text-xs text-ink-soft">Cover photo</div>
            )}
          </div>
          <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-gold">
            {[p.content.collection ? collectionLabel(p.content.collection) : "Collection", p.content.colour].filter(Boolean).join(" · ")}
          </p>
          <p className="text-sm leading-snug">{p.content.title || "Product title"}</p>
          <p className="text-sm font-semibold">{formatPrice(p.price)}</p>
        </div>
      </div>
    </aside>
  );
}

function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />;
}
