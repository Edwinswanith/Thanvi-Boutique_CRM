import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { getInvoiceSettings, listTaxRules } from "@/server/services/taxSettings";
import { InvoiceSettingsForm } from "./InvoiceSettingsForm";
import { TaxRulesEditor } from "./TaxRulesEditor";

export const metadata: Metadata = { title: "GST & invoice" };

export default async function GstPage() {
  const { actor, allowed } = await pageActor("taxes.view");
  if (!allowed) return <Forbidden />;
  const [rules, settings] = await Promise.all([listTaxRules(), getInvoiceSettings()]);
  const editable = can(actor, "taxes.edit");
  return (
    <>
      <PageHeader
        eyebrow="Business · Tax"
        title="GST & invoice"
        description="GST rates by HSN and price slab, and how your tax invoice looks. Rules marked draft must be confirmed by your CA before going live."
      />
      <TaxRulesEditor initial={rules} editable={editable} canCreate={can(actor, "taxes.create")} />
      <InvoiceSettingsForm initial={settings} editable={editable} />
    </>
  );
}
