"use client";

import Link from "next/link";
import { SHOP } from "@/lib/site";

/**
 * When a page fails.
 *
 * There was no error boundary anywhere in the app, so a thrown query took the
 * whole route to Next's default screen — which on a production build is a bare
 * "Application error" with no way out.
 *
 * It carries the phone number, because this shop's actual fallback when
 * software fails is that someone calls it. A retry button alone would be
 * technically correct and useless to a customer with a wedding in nine days.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="on-dark flex min-h-[70svh] items-center justify-center bg-violet-950 px-5 py-24">
      <div className="max-w-[46ch] text-center">
        <p className="eyebrow on-dark">Something went wrong</p>
        <h1 className="mt-5 font-display text-h2 text-porcelain-50">
          This page did not load.
        </h1>
        <p className="mt-6 text-porcelain-50/80">
          It is us, not you. Try again in a moment, or call the shop and we
          will answer whatever you were looking for.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          <button
            type="button"
            onClick={reset}
            className="press rounded-control bg-porcelain-50 px-6 py-3 font-medium text-violet-950 transition-colors duration-[180ms] hover:bg-gold-100"
          >
            Try again
          </button>
          <a
            href={`tel:${SHOP.phone.replace(/\s/g, "")}`}
            className="text-caption text-gold-500 underline-offset-4 hover:underline"
          >
            {SHOP.phone}
          </a>
          <Link
            href="/"
            className="text-caption text-porcelain-50/70 underline-offset-4 hover:text-porcelain-50 hover:underline"
          >
            Back to the front door
          </Link>
        </div>

        {/* The digest is the only handle on a Worker-side failure, and asking a
            customer to read it out is more use than asking her to describe it. */}
        {error.digest && (
          <p className="mt-10 text-caption text-porcelain-50/40">
            Reference {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
