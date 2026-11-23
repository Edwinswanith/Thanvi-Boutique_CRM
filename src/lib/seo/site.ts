/**
 * Business facts used for SEO, structured data and llms.txt. Client-safe.
 *
 * Only facts published on thanviboutique.com are filled in. TODO(client): add
 * branch street addresses, phone numbers, social profiles and the exchange window
 * (days) — they strengthen local SEO and AI answers but must not be guessed.
 */

export const SITE = {
  name: "Thanvi Boutique",
  legalName: "Thanvi Boutique",
  tagline: "Wrap yourself in elegance",
  description:
    "Thanvi Boutique sells authentic handloom sarees online and in stores in Chennai, Madurai, Karaikudi and Coimbatore — silk, cotton, linen, tissue, organza, Kota, kalamkari and more, since 2016.",
  foundingYear: "2016",
  country: "IN",
  cities: ["Chennai", "Madurai", "Karaikudi", "Coimbatore"],
  logoPath: "/brand/thanvi-logo.png",
  currency: "INR",
  locale: "en_IN",
  returnPolicy: "Exchange only, no refunds.",
  /** TODO(client): number of days for exchanges; null = not published yet. */
  exchangeWindowDays: null as number | null,
  /** TODO(client): Instagram / Facebook / YouTube URLs. */
  sameAs: [] as string[],
  /** TODO(client): one entry per store — street, city, postcode, phone, opening hours. */
  stores: [] as { name: string; street: string; city: string; postalCode: string; telephone: string }[],
} as const;

/** Public origin of the storefront, e.g. https://thanviboutique.com (no trailing slash). */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl()}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
