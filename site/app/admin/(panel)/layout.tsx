import type { Metadata } from "next";
import { AdminSidebar } from "./AdminSidebar";
import { requireAdmin } from "@/lib/requireAdmin";

export const metadata: Metadata = { title: "Admin" };

// The authenticated admin shell. Lives in the (panel) route group so the sidebar
// wraps every section EXCEPT /admin/login (which sits outside this group).
//
// requireAdmin() here, not only in the actions: middleware checks the signature
// and the expiry but cannot see whether the session has been revoked, because
// that needs a query and middleware runs on the Edge
// (SECURITY_HARDENING_SPEC S2). Every authenticated page renders through this
// layout, so this is the one place that covers all of them.
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-full bg-porcelain-50 md:flex">
      <AdminSidebar />
      <section className="min-w-0 flex-1 px-5 py-8 md:px-10 md:py-12">{children}</section>
    </div>
  );
}
