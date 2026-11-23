"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Notice } from "@/components/admin/ui";
import { api } from "@/lib/http";
import { COLLECTIONS, formatPrice, slugify } from "@/lib/storefront/collections";
import { LIMITS, SEO_IDEAL, type ListingContent } from "@/lib/storefront/listing";
import type { ListingEditorView } from "@/server/services/catalog";
import { HighlightsField, Section, TextField } from "./fields";
import { PhotoManager } from "./PhotoManager";
import { PublishPanel } from "./PublishPanel";
import { SeoPreview } from "./SeoPreview";

interface ListingEditorProps {
  initial: ListingEditorView;
  canEdit: boolean;
  canApprove: boolean;
}

type Message = { kind: "ok" | "err"; text: string } | null;

export function ListingEditor({ initial, canEdit, canApprove }: ListingEditorProps) {
  const [view, setView] = useState(initial);
  const [content, setContent] = useState<ListingContent>(initial.content);
  const [slugTouched, setSlugTouched] = useState(initial.exists);
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const dirty = useMemo(() => JSON.stringify(content) !== JSON.stringify(view.content) || !view.exists, [content, view]);
  const disabled = !canEdit || busy !== null;
  const url = `/api/catalog/${view.product.id}`;

  const set = <K extends keyof ListingContent>(key: K, value: ListingContent[K]) => setContent((c) => ({ ...c, [key]: value }));
  const setTitle = (title: string) => setContent((c) => ({ ...c, title, slug: slugTouched ? c.slug : slugify(`${title} ${c.colour}`) }));

  const save = useCallback(async (): Promise<boolean> => {
    setBusy("save");
    setMessage(null);
    try {
      const next = await api<ListingEditorView>(url, { method: "PUT", body: content });
      setView(next);
      setContent(next.content);
      setSlugTouched(true);
      setMessage({ kind: "ok", text: next.status === "published" ? "Changes are live on the website." : "Draft saved." });
      return true;
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
      return false;
    } finally {
      setBusy(null);
    }
  }, [content, url]);

  async function publish(on: boolean) {
    if (on && dirty && !(await save())) return;
    setBusy("publish");
    setMessage(null);
    try {
      const next = await api<ListingEditorView>(`${url}/publish`, { method: "POST", body: { publish: on } });
      setView(next);
      setContent(next.content);
      setMessage({ kind: "ok", text: on ? "Published. It's now live on the website." : "Unpublished. It's hidden from the website." });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Couldn't update publishing" });
    } finally {
      setBusy(null);
    }
  }

  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; }, [save]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canEdit) void saveRef.current();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => { if (dirty && view.exists) e.preventDefault(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", onLeave); };
  }, [canEdit, dirty, view.exists]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        {message && <div className="pop-in"><Notice kind={message.kind}>{message.text}</Notice></div>}

        <Section title="Photos" description="Studio shots sell. Show the full drape, the pallu, the border and a close-up of the weave.">
          <PhotoManager photoIds={content.photoIds} onChange={(ids) => set("photoIds", ids)} max={LIMITS.photos} stockPhotoIds={view.product.photoIds} disabled={disabled} />
        </Section>

        <Section title="Product details" description={`SKU ${view.product.sku} · price ${formatPrice(view.product.mrp)} comes from the product's MRP.`}>
          <TextField label="Title" value={content.title} onChange={setTitle} max={LIMITS.title} disabled={disabled} placeholder="e.g. Pochampally Pattu Saree" />
          <TextField label="Web address" value={content.slug} prefix="/shop/sarees/" max={LIMITS.slug} disabled={disabled}
            onChange={(v) => { setSlugTouched(true); set("slug", v.toLowerCase().replace(/[^a-z0-9-]/g, "-")); }}
            hint={view.status === "published" ? "Changing this breaks links people have already shared." : "Fills in from the title. Lowercase letters, numbers and hyphens."} />
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="collection" className="label">Collection</label>
              <select id="collection" className="field" value={content.collection} disabled={disabled} onChange={(e) => set("collection", e.target.value)}>
                <option value="">Choose a collection…</option>
                {COLLECTIONS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <TextField label="Colour" value={content.colour} onChange={(v) => set("colour", v)} max={LIMITS.colour} disabled={disabled} placeholder="e.g. Cadet Grey" />
          </div>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" className="peer sr-only" checked={content.featured} disabled={disabled} onChange={(e) => set("featured", e.target.checked)} />
            <span className="relative h-6 w-11 rounded-full bg-line-strong transition-colors peer-checked:bg-gold-bright peer-focus-visible:outline-2 peer-focus-visible:outline-gold after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" aria-hidden />
            <span><b>Feature on the website</b> <span className="text-ink-soft">· shown first in lists and on the home page</span></span>
          </label>
        </Section>

        <Section title="Description" description="Write for the customer: how it feels, where to wear it, what makes it special.">
          <TextField label="Short description" value={content.shortDescription} onChange={(v) => set("shortDescription", v)} max={LIMITS.shortDescription} disabled={disabled}
            hint="One line under the title." placeholder="Featherlight raga silk with a temple border." />
          <TextField label="Full description" value={content.description} onChange={(v) => set("description", v)} max={LIMITS.description} disabled={disabled} multiline={7}
            hint="Leave a blank line between paragraphs." />
          <HighlightsField value={content.highlights} onChange={(v) => set("highlights", v)} max={LIMITS.highlights} maxLength={LIMITS.highlight} disabled={disabled} />
          <TextField label="Care instructions" value={content.care} onChange={(v) => set("care", v)} max={LIMITS.care} disabled={disabled} multiline={2} placeholder="Dry clean only. Store folded in a muslin cloth." />
        </Section>

        <Section title="Search & sharing" description="What Google and WhatsApp link previews show. Left blank, we use the title and description.">
          <TextField label="Search title" value={content.seoTitle} onChange={(v) => set("seoTitle", v)} max={LIMITS.seoTitle} ideal={SEO_IDEAL.title} disabled={disabled} placeholder={`${content.title || "Title"} | Thanvi Boutique`} />
          <TextField label="Search description" value={content.seoDescription} onChange={(v) => set("seoDescription", v)} max={LIMITS.seoDescription} ideal={SEO_IDEAL.description} disabled={disabled} multiline={3} />
          <SeoPreview content={content} />
        </Section>
      </div>

      <PublishPanel content={content} status={view.status} price={view.product.mrp} dirty={dirty} busy={busy} canEdit={canEdit} canApprove={canApprove}
        savedAt={view.updatedAt} onSave={() => void save()} onPublish={(on) => void publish(on)} />
    </div>
  );
}
