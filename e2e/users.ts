/** Throwaway accounts that only exist in the e2e database (reset on every run). */
export const E2E_USERS = {
  superAdmin: { email: "e2e-superadmin@thanvi.test", password: "e2e-Setup-pass-1", name: "E2E Super Admin", roleSlug: "super-admin" },
  owner: { email: "e2e-owner@thanvi.test", password: "e2e-Owner-pass-1", name: "E2E Owner", roleSlug: "owner" },
} as const;
