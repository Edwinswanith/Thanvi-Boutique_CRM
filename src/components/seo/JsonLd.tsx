import { toJsonLdScript } from "@/lib/seo/jsonld";

/** Renders schema.org structured data. Escaped so content can't break out of the tag. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLdScript(data) }} />;
}
