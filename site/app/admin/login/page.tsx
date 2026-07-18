import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin sign in" };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-porcelain-50 px-5 py-12">
      <div className="w-full max-w-sm rounded-card border border-ink-900/10 bg-white p-8 shadow-card">
        <div className="mb-7 text-center">
          <h1 className="font-display text-h3 text-ink-900">
            Vivaah <span className="text-gold-600">· Admin</span>
          </h1>
          <p className="mt-1 text-caption text-ink-600">Sign in to manage the shop.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
