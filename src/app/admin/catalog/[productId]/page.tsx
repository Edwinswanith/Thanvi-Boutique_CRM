import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingEditor } from "@/components/admin/catalog/ListingEditor";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { AppError } from "@/lib/api";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { getListingEditor } from "@/server/services/catalog";

export const metadata: Metadata = { title: "Edit listing" };

export default async function ListingPage({ params }: { params: Promise<{ productId: string }> }) {
  const { actor, allowed } = await pageActor("catalog.view");
  if (!allowed) return <Forbidden />;
  const { productId } = await params;
  const view = await getListingEditor(actor, productId).catch((e: unknown) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });

  return (
    <>
      <Link href="/admin/catalog" className="mb-3 inline-block text-sm text-ink-soft hover:text-ink">← Online catalog</Link>
      <PageHeader eyebrow={`Website listing · ${view.product.sku}`} title={view.content.title || view.product.name}
        description={view.exists ? undefined : "This product isn't on the website yet. We've filled in what we know from stock. Add photos and copy, then publish."} />
      <ListingEditor initial={view} canEdit={can(actor, "catalog.edit")} canApprove={can(actor, "catalog.approve")} />
    </>
  );
}
