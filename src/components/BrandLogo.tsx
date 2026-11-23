import Image from "next/image";

/**
 * Thanvi Boutique logo (from thanviboutique.com).
 * - "dark": original artwork on the logo charcoal (#25242b = --ink); use on ink panels.
 * - "light": charcoal keyed out and white strokes turned charcoal; use on cream/white and on invoices.
 */
type LogoTone = "dark" | "light";

interface BrandLogoProps {
  tone: LogoTone;
  className?: string;
  priority?: boolean;
}

const SRC: Record<LogoTone, string> = {
  dark: "/brand/thanvi-logo-dark.png",
  light: "/brand/thanvi-logo-light.png",
};

export function BrandLogo({ tone, className, priority }: BrandLogoProps) {
  return (
    <Image
      src={SRC[tone]}
      alt="Thanvi Boutique"
      width={374}
      height={253}
      priority={priority}
      className={className}
    />
  );
}
