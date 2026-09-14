import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Page not found" };

/**
 * 404 — "Typographic poster" grammar (DESIGN_SPEC_V3 §2.7, §4.2).
 * Ground porcelain-50, type carries the page, hero is the drawn hanger
 * (§3.4, third and last sanctioned self-drawing stroke), close is two real
 * escape routes. Server component on purpose: no GSAP, no client JS, the
 * only motion is a CSS stroke-dash draw.
 */
export default function NotFound() {
  return (
    <section className="bg-porcelain-50 pt-24 pb-28 md:pt-32 md:pb-36">
      <div className="shell">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          {/* Hero: the drawn hanger. First on mobile, right-hand plate on desktop. */}
          <figure className="md:order-2 flex justify-center" aria-hidden="true">
            <svg
              viewBox="0 0 240 160"
              fill="none"
              className="w-full max-w-[17rem] md:max-w-[21rem]"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* The rail */}
              <path
                className="nf-rail"
                pathLength="1"
                d="M8 40H232"
                stroke="var(--color-ink-400)"
                strokeWidth="2"
              />
              {/* The hanger: one continuous stroke, hook over the rail and back
                  up to the shoulder apex. Empty, which is the whole point. */}
              <path
                className="nf-hanger"
                pathLength="1"
                d="M137 57C146 55 149 45 142 39C135 32 120 37 120 50L120 80C108 88 76 108 64 120C58 125 60 130 66 130L174 130C180 130 182 125 176 120C164 108 132 88 120 80"
                stroke="var(--color-violet-800)"
                strokeWidth="3"
              />
            </svg>
          </figure>

          <div className="md:order-1">
            <p className="eyebrow">Page not found</p>
            <h1 className="mt-3 text-h1">
              This piece is <em className="italic">not here</em>
            </h1>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button href="/rentals" variant="primary">
                Browse the rental collection
              </Button>
              <Button href="/retail" variant="ghost">
                Browse the retail collection
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Self-drawing stroke (§3.4): 1100ms total, power1.inOut, draws once and
          holds. The rail lays down first so the hook has something to hang on.
          Reduced motion renders both paths complete and static, never blank. */}
      <style>{`
        .nf-rail,
        .nf-hanger {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation-name: nf-draw;
          animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
          animation-fill-mode: forwards;
        }
        .nf-rail { animation-duration: 450ms; }
        .nf-hanger { animation-duration: 950ms; animation-delay: 150ms; }

        @keyframes nf-draw {
          to { stroke-dashoffset: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .nf-rail,
          .nf-hanger {
            animation-name: none;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </section>
  );
}
