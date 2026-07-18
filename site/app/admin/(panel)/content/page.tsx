import { sql } from "@/lib/db";
import { ContentEditor, type Block } from "./ContentEditor";

export const dynamic = "force-dynamic";

type ContentRow = { key: string; content: { en?: string; hi?: string } | null };

export default async function AdminContentPage() {
  const rows = await sql<ContentRow>`
    select key, content from site_content order by key
  `;
  const blocks: Block[] = rows.map((r) => ({
    key: r.key,
    en: r.content?.en ?? "",
    hi: r.content?.hi ?? "",
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <p className="eyebrow">Vivaah</p>
        <h1 className="mt-1 font-display text-h2 text-ink-900">Content</h1>
        <p className="mt-2 max-w-xl text-body text-ink-600">
          Editable copy for the public site, in English and Hindi. As pages are wired up,
          these blocks will surface on the storefront.
        </p>
      </header>

      <ContentEditor blocks={blocks} />
    </div>
  );
}
