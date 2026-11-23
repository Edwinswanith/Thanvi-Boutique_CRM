import type { Metadata } from "next";
import { Cabin, IBM_Plex_Mono } from "next/font/google";
import { SITE, siteUrl } from "@/lib/seo/site";
import "./globals.css";

/* Cabin is the typeface on thanviboutique.com; Plex Mono is for codes and amounts. */
const cabin = Cabin({ variable: "--font-cabin", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Thanvi Boutique", template: "%s · Thanvi Boutique" },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { siteName: SITE.name, locale: SITE.locale, type: "website", images: [{ url: SITE.logoPath, width: 500, height: 500, alt: SITE.name }] },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        {/* Marks JS as available before paint so scroll-reveal never hides content for no-JS visitors. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className={`${cabin.variable} ${plexMono.variable} relative min-h-screen`}>
        <div className="relative z-[1]">{children}</div>
      </body>
    </html>
  );
}
