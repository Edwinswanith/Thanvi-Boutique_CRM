import { permissionsFor, SYSTEM_MODULES, type SystemModule } from "@/lib/rbac/permissions";
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
  {
    key: "2026-11-23-payables-module",
    run: async () => {
      await Role.updateOne({ slug: "owner" }, { $addToSet: { permissions: { $each: permissionsFor(["payables"]) } } });
    },
  },
  {
    key: "2026-11-23-vendor-directory-access",
    run: async () => {
      await Role.updateOne({ slug: "vendor" }, { $pull: { permissions: /^vendors\./ } });
    },
  },
  {
    key: "2026-11-25-role-workspaces",
    run: async () => {
      await Role.updateOne(
        { slug: "owner", builtIn: true },
        { $addToSet: { permissions: { $each: permissionsFor([...Object.keys(SYSTEM_MODULES) as SystemModule[], "counts"]) } } },
      );
      await Role.updateMany(
        { slug: { $in: ["manager-head", "manager"] }, builtIn: true },
        { $addToSet: { permissions: { $each: permissionsFor(["counts"], ["view", "create", "edit", "approve"]) } } },
      );
      await Role.updateOne(
        { slug: "godown-staff", builtIn: true },
        { $addToSet: { permissions: { $each: permissionsFor(["counts"], ["view", "create", "edit"]) } } },
      );
      await Role.updateOne({ slug: "godown-staff", builtIn: true }, { $pull: { permissions: "vendors.view" } });
      await Role.updateOne(
        { slug: "manager-head", builtIn: true },
        { $pull: { permissions: /^(taxes|vendors|catalog)\./ } },
      );
      for (const [slug, priorName, name] of [
        ["owner", "Owner", "Owner / Admin"],
        ["super-admin", "Super Admin", "Setup Admin"],
        ["manager", "Manager", "Shop Manager"],
      ]) {
        if (!(await Role.exists({ name }))) await Role.updateOne({ slug, builtIn: true, name: priorName }, { $set: { name } });
      }
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
