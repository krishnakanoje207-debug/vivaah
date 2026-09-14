import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Nothing here was being served: /robots.txt was a 404 (audit, 14 Sep).
 *
 * `/admin` is disallowed explicitly. It is already behind a session check and
 * every Server Action re-checks it, so this is not the protection — it is to
 * keep a login form out of search results, where it is only ever noise.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
