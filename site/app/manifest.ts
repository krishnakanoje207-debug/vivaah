import type { MetadataRoute } from "next";
import { SHOP } from "@/lib/site";

// LAUNCH_CHECKLIST item 6: what a phone uses when the site is added to its home
// screen. `browser` display on purpose: this is a shop's website, not an app,
// and it should open with its address bar. Icons from tools/make_logo_assets.py.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SHOP.name,
    short_name: SHOP.short,
    start_url: "/",
    display: "browser",
    background_color: "#fafaf7",
    theme_color: "#191129",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
