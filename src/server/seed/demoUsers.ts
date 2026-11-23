import { Location } from "@/models/Location";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import { hashPassword } from "@/server/auth/password";

/**
 * One sample login per role, for walking the client through each person's view.
 * All use the `@thanvi.test` address, so `removeDemoUsers()` can delete them.
 * The shared password comes from SEED_DEMO_PASSWORD and is never stored in code.
 */

export const DEMO_EMAIL_DOMAIN = "@thanvi.test";
const DEMO_EMAIL = /^demo-.*@thanvi\.test$/;

interface DemoUser { key: string; name: string; roleSlug: string; locations: string[] }

export const DEMO_USERS: readonly DemoUser[] = [
  { key: "owner", name: "Thanvi (Owner)", roleSlug: "owner", locations: [] },
  { key: "head", name: "Revathi (Manager Head)", roleSlug: "manager-head", locations: [] },
  { key: "store", name: "Karthik (Store Manager)", roleSlug: "manager", locations: ["SH1"] },
  { key: "web", name: "Divya (E-commerce Manager)", roleSlug: "manager", locations: ["WEB"] },
  { key: "sales", name: "Priya (Salesperson)", roleSlug: "salesperson", locations: ["SH1"] },
  { key: "godown", name: "Murugan (Godown Staff)", roleSlug: "godown-staff", locations: ["GD1", "GD2"] },
  { key: "content", name: "Anjali (Content Editor)", roleSlug: "content-editor", locations: [] },
];

export const demoEmail = (key: string): string => `demo-${key}${DEMO_EMAIL_DOMAIN}`;

/** Idempotent: existing demo logins are left as they are. */
export async function seedDemoUsers(password: string): Promise<string[]> {
  if (password.length < 10) throw new Error("SEED_DEMO_PASSWORD must be at least 10 characters");
  const passwordHash = await hashPassword(password);
  const created: string[] = [];
  for (const u of DEMO_USERS) {
    const email = demoEmail(u.key);
    if (await User.exists({ email })) continue;
    const role = await Role.findOne({ slug: u.roleSlug }).lean();
    if (!role) throw new Error(`Role ${u.roleSlug} missing: run npm run seed first`);
    const locations = await Location.find({ code: { $in: u.locations } }).select("_id").lean();
    await User.create({ name: u.name, email, passwordHash, roleId: role._id, locationIds: locations.map((l) => l._id) });
    created.push(email);
  }
  return created;
}

export async function removeDemoUsers(): Promise<number> {
  return (await User.deleteMany({ email: DEMO_EMAIL })).deletedCount;
}
