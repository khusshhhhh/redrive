import { serializeJsonLd, type JsonLdNode } from "@/app/libs/structuredData";

/** Server-rendered schema.org block. Rendered in the HTML so crawlers that don't run JS still read it. */
export default function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
