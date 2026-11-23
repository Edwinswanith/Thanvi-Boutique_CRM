import { permissionsFor } from "@/lib/rbac/permissions";
import { AppMeta } from "@/models/AppMeta";
import { InvoiceSettings } from "@/models/InvoiceSettings";
import { Role } from "@/models/Role";
import { TaxRule } from "@/models/TaxRule";

interface Migration {
  key: string;
  run: () => Promise<void>;
}

/** Starting GST rules. Marked draft: the client's CA must confirm before go-live. */
export const DEFAULT_TAX_RULES = [
  {
    name: "Sarees & fabrics",
    hsnPrefixes: ["50", "52", "53", "54", "55"],
    slabs: [{ upTo: null, rate: 5 }],
    note: "Woven fabrics incl. sarees (silk 5007, cotton 52xx, synthetic 54xx). Confirm with CA.",
  },
  {
    name: "Readymade garments",
    hsnPrefixes: ["61", "62", "63"],
    slabs: [
      { upTo: 250_000, rate: 5 },
      { upTo: null, rate: 18 },
    ],
    note: "Apparel: 5% up to ₹2,500 per piece, 18% above. Confirm with CA.",
  },
];

/** Append-only list: never edit a migration once it has shipped, add a new one. */
const MIGRATIONS: Migration[] = [
  {
    key: "2026-11-19-taxes-module",
    run: async () => {
      await Role.updateOne({ slug: "owner" }, { $addToSet: { permissions: { $each: permissionsFor(["taxes"]) } } });
      await Role.updateOne({ slug: "manager-head" }, { $addToSet: { permissions: "taxes.view" } });
      await Role.updateOne({ slug: "godown-staff" }, { $addToSet: { permissions: "vendors.create" } });
    },
  },
  {
    key: "2026-11-19-billing-defaults",
    run: async () => {
      await InvoiceSettings.updateOne({ key: "default" }, { $setOnInsert: { key: "default" } }, { upsert: true });
      if ((await TaxRule.countDocuments()) === 0) await TaxRule.insertMany(DEFAULT_TAX_RULES);
    },
  },
  {
    key: "2026-11-19-catalog-module",
    run: async () => {
      await Role.updateOne({ slug: "owner" }, { $addToSet: { permissions: { $each: permissionsFor(["catalog"]) } } });
      await Role.updateOne(
        { slug: "manager-head" },
        { $addToSet: { permissions: { $each: permissionsFor(["catalog"], ["view", "create", "edit", "approve"]) } } },
      );
    },
  },
];

export async function runMigrations(): Promise<string[]> {
  const applied: string[] = [];
  for (const m of MIGRATIONS) {
    if (await AppMeta.exists({ key: m.key })) continue;
    await m.run();
    await AppMeta.create({ key: m.key });
    applied.push(m.key);
  }
  return applied;
}
