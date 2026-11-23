import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/admin") ? next : "/admin";
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink text-paper lg:block">
        <div className="zari absolute inset-y-0 right-0 w-3" aria-hidden />
        <div className="absolute -left-24 top-1/3 h-[520px] w-[520px] rounded-full border border-gold-bright/25" aria-hidden />
        <div className="absolute -left-10 top-[38%] h-[380px] w-[380px] rounded-full border border-gold-bright/15" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-14">
          <div className="rise">
            <BrandLogo tone="dark" priority className="h-auto w-64" />
            <p className="mt-3 text-[11px] font-semibold tracking-[0.42em] text-gold-bright">WRAP YOURSELF IN ELEGANCE</p>
          </div>
          <div className="rise rise-2 max-w-md">
            <h1 className="display text-5xl leading-[1.05]">
              Every saree,
              <br />
              <span className="foil">accounted for.</span>
            </h1>
            <p className="mt-6 text-paper/70">
              From the vendor&apos;s bundle to the customer&apos;s bag: one code, one history, across godowns, stores and online.
            </p>
          </div>
          <p className="code text-[11px] text-paper/40">*TB1000-001*</p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm rise rise-2">
          <BrandLogo tone="light" priority className="h-auto w-40 lg:hidden" />
          <p className="display mt-4 text-3xl lg:mt-0">Thanvi Boutique</p>
          <div className="zari-rule mt-3 mb-8 w-24" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-soft">Back office sign in</h2>
          <LoginForm next={safeNext} />
        </div>
      </section>
    </main>
  );
}
