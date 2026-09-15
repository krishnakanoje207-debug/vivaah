"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ActionBar } from "@/components/site/ActionBar";
import { NewStockPopup } from "@/components/site/NewStockPopup";

// The storefront Nav/Footer must NOT appear on /admin (it defines its own chrome).
// Nav/Footer are passed in as already-created elements so Footer stays a server
// component; this client wrapper only decides whether to render them.
export function SiteChrome({
  nav,
  footer,
  children,
}: {
  nav: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const isAdmin = usePathname()?.startsWith("/admin") ?? false;
  return (
    <>
      {!isAdmin && nav}
      <main className="flex-1">{children}</main>
      {!isAdmin && footer}
      {/* Phone-only, and it decides for itself when to appear. Mounted here so
          it follows the same /admin rule as the rest of the storefront chrome. */}
      {!isAdmin && <ActionBar />}
      {!isAdmin && <NewStockPopup />}
    </>
  );
}
