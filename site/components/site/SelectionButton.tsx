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
  /** `icon` is the catalogue form: the mark alone, named for a screen reader. */
  size?: "sm" | "md" | "icon";
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const selected = useIsSelected(item.slug);

  const onClick = () => {
    const result = toggle(item);
    if (result !== "added") return;
    // The photograph if there is one, else the piece's own box — the product
    // stage draws its turntable into a canvas and has no <img> at all, and
    // launching from the garment's box still reads as the garment leaving,
    // where launching from the button reads as the button leaving.
    const host = ref.current?.closest<HTMLElement>("[data-piece]");
    const from = host?.querySelector("img") ?? host ?? ref.current;
    if (from) flyGarment(from as HTMLElement, item.image);
  };

  const icon = size === "icon";
  const pad = icon
    ? "h-10 w-10 justify-center"
    : size === "sm"
      ? "px-4 py-2 text-caption"
      : "px-6 py-3";
  // On a card the control sits over a photograph, so it carries its own ground
  // rather than a border: a keyline on an unknown image is unreadable half the
  // time, and the catalogue already has badges at the opposite corner.
  const skin = icon
    ? selected
      ? "rounded-full bg-violet-950 text-porcelain-50 shadow-card"
      : "rounded-full bg-porcelain-50/92 text-ink-900 shadow-card hover:bg-porcelain-50"
    : selected
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
      aria-label={
        icon
          ? selected
            ? `${item.name} is in your selection`
            : `Add ${item.name} to your selection`
          : undefined
      }
      className={`press inline-flex items-center gap-2.5 font-medium transition-colors duration-[180ms] ${icon ? "" : "rounded-control"} ${pad} ${skin} ${className}`}
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
          {!icon && "In your selection"}
        </>
      ) : (
        <>
          {/* The hanger, the same mark the tray carries, so pressing this and
              the piece landing there read as one object in two places. */}
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
          {!icon && "Add to my selection"}
        </>
      )}
    </button>
  );
}
