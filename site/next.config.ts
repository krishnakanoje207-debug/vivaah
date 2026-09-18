import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Baseline security headers. The Content-Security-Policy is NOT here: it
  // carries a per-request nonce and so is built in middleware.ts, which is also the
  // only place that can mint one (SECURITY_HARDENING_SPEC S3). Setting a second
  // CSP here would be intersected with that one and could only ever subtract
  // from it by accident.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing embeds this site; blocks clickjacking of the admin panel.
          // The modern equivalent is CSP frame-ancestors, which middleware.ts sets;
          // this stays for browsers that only understand the old header.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
        ],
      },
    ];
  },
};

export default nextConfig;

// Makes Cloudflare bindings available in `next dev` (getCloudflareContext).
initOpenNextCloudflareForDev();
