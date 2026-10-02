"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/admin/login/actions";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile top bar (the owner works on her phone). */}
      <div className="flex items-center justify-between border-b border-ink-900/10 bg-porcelain-100 px-4 py-3 md:hidden">
        <span className="font-display text-lg text-ink-900">
          Vivaah <span className="text-gold-600">· Admin</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="rounded-control px-3 py-1.5 text-ink-600 hover:bg-porcelain-200"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <aside
        className={`${open ? "block" : "hidden"} border-b border-ink-900/10 bg-porcelain-100 md:block md:w-60 md:shrink-0 md:border-b-0 md:border-r`}
      >
        <div className="flex h-full flex-col p-4">
          <span className="mb-6 hidden px-2 font-display text-lg text-ink-900 md:block">
            Vivaah <span className="text-gold-600">· Admin</span>
          </span>

          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`rounded-control px-3 py-2 text-body transition-colors ${
                  isActive(link.href)
                    ? "bg-violet-800 text-porcelain-50"
                    : "text-ink-600 hover:bg-porcelain-200 hover:text-ink-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <form action={logout} className="mt-6 md:mt-auto md:pt-6">
            <button
              type="submit"
              className="w-full rounded-control border border-ink-900/20 px-3 py-2 text-body text-ink-600 transition-colors hover:border-ink-900/40 hover:text-ink-900"
            >
              Log out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
