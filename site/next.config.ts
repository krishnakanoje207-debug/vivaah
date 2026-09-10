import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Baseline security headers. The CSP is deliberately frame-ancestors only:
  // the site inlines scripts/styles and embeds the Google Maps frame, so a full
  // script/style policy needs its own pass (see the security review).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing embeds this site; blocks clickjacking of the admin panel.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
        ],
      },
    ];
  },
};

export default nextConfig;

// Makes Cloudflare bindings available in `next dev` (getCloudflareContext).
initOpenNextCloudflareForDev();
