import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getRentals } from "@/lib/rentals";
import { getJewellery } from "@/lib/jewellery";
import { getRetailSlugs } from "@/lib/retail";

/**
 * The six public pages, plus every rentable slug, every retail slug and every
 * jewellery piece.
 *
 * Built from `getRentals()` rather than a hand-kept list, because the catalogue
 * is owner-edited and a list maintained here would be wrong the first week she
 * adds a piece. `/admin` is absent, as robots.ts also says.
 *
 * `force-dynamic` for the same reason `/rentals` is: the slugs come from Neon
 * per request, so a build-time snapshot would go stale between deploys.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/rentals`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/retail`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/jewellery`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/visit`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/policies`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const items = await getRentals();
    for (const p of items) {
      pages.push({
        url: `${SITE_URL}/rentals/${p.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // A sitemap listing the six static pages is worth serving even when the
    // database is unreachable; failing the route outright is not.
  }

  try {
    for (const slug of await getRetailSlugs()) {
      pages.push({
        url: `${SITE_URL}/retail/${slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // Same reasoning as the rentals block above.
  }

  try {
    for (const p of await getJewellery()) {
      pages.push({
        url: `${SITE_URL}/jewellery/${p.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // Same reasoning as the rentals block above.
  }

  return pages;
}
