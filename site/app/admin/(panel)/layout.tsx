import type { Metadata } from "next";
import { AdminSidebar } from "./AdminSidebar";

export const metadata: Metadata = { title: "Admin" };

// The authenticated admin shell. Lives in the (panel) route group so the sidebar
// wraps every section EXCEPT /admin/login (which sits outside this group).
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-porcelain-50 md:flex">
      <AdminSidebar />
      <section className="min-w-0 flex-1 px-5 py-8 md:px-10 md:py-12">{children}</section>
    </div>
  );
}
