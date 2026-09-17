import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin sign in" };

// `?revoked=1` arrives from "Sign out of every device", and from any session
// that was still open when that ran. Without a word here the owner would be
// bounced to a bare login page with no idea why, which is exactly how people
// come to believe a site has logged them out at random
// (SECURITY_HARDENING_SPEC S2).
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ revoked?: string }>;
}) {
  const revoked = (await searchParams).revoked === "1";
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-porcelain-50 px-5 py-12">
      <div className="w-full max-w-sm rounded-card border border-ink-900/10 bg-white p-8 shadow-card">
        <div className="mb-7 text-center">
          <h1 className="font-display text-h3 text-ink-900">
            Vivaah <span className="text-gold-600">· Admin</span>
          </h1>
          <p className="mt-1 text-caption text-ink-600">Sign in to manage the shop.</p>
        </div>
        {revoked && (
          <p
            role="status"
            className="mb-5 rounded-control border border-gold-600/30 bg-gold-100/40 px-3 py-2.5 text-caption text-ink-900"
          >
            Every device has been signed out. Sign in again to carry on.
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
