/** Throwaway accounts that only exist in the e2e database (reset on every run). */
export const E2E_USERS = {
  superAdmin: { email: "e2e-superadmin@thanvi.test", password: "e2e-Setup-pass-1", name: "E2E Super Admin", roleSlug: "super-admin" },
  owner: { email: "e2e-owner@thanvi.test", password: "e2e-Owner-pass-1", name: "E2E Owner", roleSlug: "owner" },
  head: { email: "e2e-head@thanvi.test", password: "e2e-Role-pass-1", name: "E2E Manager Head", roleSlug: "manager-head" },
  manager: { email: "e2e-manager@thanvi.test", password: "e2e-Role-pass-1", name: "E2E Shop Manager", roleSlug: "manager", locationCodes: ["SH1"] },
  salesperson: { email: "e2e-salesperson@thanvi.test", password: "e2e-Role-pass-1", name: "E2E Salesperson", roleSlug: "salesperson", locationCodes: ["SH1"] },
  godownReceiving: { email: "e2e-godown1@thanvi.test", password: "e2e-Role-pass-1", name: "E2E Receiving", roleSlug: "godown-staff", locationCodes: ["GD1"] },
  godownDistribution: { email: "e2e-godown2@thanvi.test", password: "e2e-Role-pass-1", name: "E2E Distribution", roleSlug: "godown-staff", locationCodes: ["GD2"] },
  editor: { email: "e2e-editor@thanvi.test", password: "e2e-Role-pass-1", name: "E2E Content Editor", roleSlug: "content-editor" },
  vendor: { email: "e2e-vendor@thanvi.test", password: "e2e-Role-pass-1", name: "E2E Vendor", roleSlug: "vendor" },
} as const;
