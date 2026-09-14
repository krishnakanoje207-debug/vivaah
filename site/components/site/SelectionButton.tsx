"use client";

import { useRef } from "react";
import { toggle, useIsSelected, type SelectionItem } from "@/lib/selection";
import { flyGarment } from "@/components/site/GarmentFlight";

/**
 * Gathers one piece into the selection, and launches the flight when it does.
 *
 * The launch point is found rather than passed: the button looks for the
 * nearest enclosing `[data-piece]` and takes the photograph inside it. Threading
 * a ref down from every card, rail item and product stage would put animation
 * plumbing into components whose job is to show a garment, and would be wrong
 * in a different way on each of them. It falls back to the button's own box, so
 * a piece with no photograph still flies something.
 *
 * Removing does not fly anything. A reversal is not an arrival, and sending the
 * cover backwards would make an undo feel like an event.
 */
export function SelectionButton({
  item,
  tone = "light",
  size = "md",
  className = "",
}: {
  item: SelectionItem;
  tone?: "light" | "dark";
  size?: "sm" | "md";
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const selected = useIsSelected(item.slug);

  const onClick = () => {
    const result = toggle(item);
    if (result !== "added") return;
    const host =
      ref.current?.closest<HTMLElement>("[data-piece]") ?? ref.current;
    const img = host?.querySelector("img") ?? ref.current;
    if (img) flyGarment(img as HTMLElement, item.image);
  };

  const pad = size === "sm" ? "px-4 py-2 text-caption" : "px-6 py-3";
  const skin = selected
    ? tone === "dark"
      ? "border border-porcelain-50/40 text-porcelain-50"
      : "border border-ink-900/25 text-ink-900"
    : tone === "dark"
      ? "border border-porcelain-50/40 text-porcelain-50 hover:bg-porcelain-50/10"
      : "border border-ink-900/25 text-ink-900 hover:bg-ink-900/[0.04]";

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      /* The label states what pressing it will DO when the piece is not yet
         gathered, and what is TRUE when it is — the second is not an
         instruction, so aria-pressed carries the state for a screen reader
         rather than the verb flipping to "Remove" and hiding the fact. */
      aria-pressed={selected}
      className={`press inline-flex items-center gap-2.5 rounded-control font-medium transition-colors duration-[180ms] ${pad} ${skin} ${className}`}
    >
      {selected ? (
        <>
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="text-gold-500"
          >
            <path
              d="M3 8.5 6.5 12 13 4.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          In your selection
        </>
      ) : (
        <>
          {/* The hanger, the same mark the tray and the flight's cover use, so
              the three read as one object moving between places. */}
          <svg
            width="16"
            height="13"
            viewBox="0 0 26 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M13 6.5c0-2 1.4-3 2.8-3 1.5 0 2.7 1.1 2.7 2.6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M13 6.5 3 13.4c-.8.6-.4 1.9.6 1.9h18.8c1 0 1.4-1.3.6-1.9L13 6.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          Add to my selection
        </>
      )}
    </button>
  );
}
