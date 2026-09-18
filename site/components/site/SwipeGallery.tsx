"use client";

import { useRef } from "react";

/**
 * Swipeable photo gallery (DESIGN_SPEC §5b). Horizontal scroll-snap with an
 * edge-peek of the next photo; native swipe on touch, arrow buttons on desktop.
 * Images are turntable stills until real editorial photos exist.
 */
export function SwipeGallery({ images, alt }: { images: string[]; alt: string }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-card]");
    const amount = card ? card.offsetWidth + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <div
            key={src}
            data-card
            className="keyline relative aspect-[4/5] w-[78%] flex-none snap-center overflow-hidden rounded-card bg-stage sm:w-[46%]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {/* Lazy: the stills sit below the description on a product page,
                and the six of them were 164 KB fetched before first paint. The
                track scrolls sideways, so the two cards past the right edge are
                deferred too — which is what this is for, and Chrome's load
                distance is far wider than a card, so a swipe does not arrive on
                an empty frame. No srcset: these are turntable frames and the
                arc has no narrow copies (see RentalCard), and no intrinsic
                dimensions, because the card is already fixed at aspect-[4/5]
                and this takes arbitrary paths. */}
            <img
              src={src}
              alt={`${alt} — view ${i + 1}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Desktop arrows */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between sm:flex">
        <button
          type="button"
          aria-label="Previous photo"
          onClick={() => scrollByCard(-1)}
          className="pointer-events-auto ml-2 grid h-10 w-10 place-items-center rounded-full bg-porcelain-50/90 text-ink-900 shadow-card backdrop-blur transition-colors hover:bg-porcelain-50"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next photo"
          onClick={() => scrollByCard(1)}
          className="pointer-events-auto mr-2 grid h-10 w-10 place-items-center rounded-full bg-porcelain-50/90 text-ink-900 shadow-card backdrop-blur transition-colors hover:bg-porcelain-50"
        >
          ›
        </button>
      </div>
    </div>
  );
}
