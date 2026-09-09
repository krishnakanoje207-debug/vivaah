# Kombai shared contract — paste this ABOVE any page prompt

Every page prompt in `specs/KOMBAI_*_PROMPT.md` assumes this text has been pasted
first. It is the half of the brief that never changes: the palette, the type, the
motion rules, the hard constraints, and the contract with the existing codebase.

Written 9 September 2026, after the landing-page run. Sections C–K here are the
same ones that run produced good output against, with three additions marked
**NEW**: the components built since (`RippleHeading`, `WordmarkClose`), the house
voice, and the pages that are already done and must not be re-invented.

---

You are building one page of an existing Next.js 16 App Router site for a bridal
and occasion wear shop in India, "Vivaah Dresses and Suits". It runs three
businesses under one roof: **rentals** (bridal and festive wear, rented by the
date), **retail** (suits, kurtis, co-ord sets, kaftans, reserved online and
collected at the shop), and **jewellery** (rented alongside an outfit, never
sold). Tailwind CSS v4. GSAP + ScrollTrigger are available.

## The shop, in the owner's own words — invent nothing beyond this

**This is the complete set of facts. The shop is about a year old and has no
heritage to draw on. Anything not listed here does not exist.**

- **Opened** about a year ago. The owner is not certain of the year, so **never
  print a founding year, an anniversary, or "since 20XX"**. Newness may be
  implied; it must never be dated.
- **Two partners** run it together. Not a family business, nothing inherited. No
  names, no roles, no invented relationship between them.
- **Rentals and retail began on the same day.** No origin story where one came
  first, and neither has seniority.
- **Known for: the stock is updated day to day.** What is on the rail this week
  was not there last month.
- Every rental is handled personally, by the same two people, each time.
- **Not yet answered:** why customers come back, and the town. Both stay as a
  visible `TODO(owner)` string. Do not write around them.

**Banned outright:** legacy, lineage, generations, tradition, "years of
experience", "trusted since", "a family name", "timeless elegance", "curated for
your lifestyle", "a passion for craftsmanship", and any claim of the shop's age.
The owner has twice rejected work for reading like a generic AI template, and
this register is how that happens.

**The honest angle, and the better one: this is a shop that changes.** The stock
turns over day to day and two people handle everything themselves. A rental chain
can claim neither. Write toward freshness and personal handling.

## Voice **NEW**

Plain, specific, unhurried. Short sentences that say a real thing. The landing
page's register, which every other page should match:

> "New pieces on the rail, most days."
> "We are two partners. We handle every rental ourselves."
> "Before anything goes back on the rail."
> "Nothing is posted. Rentals are reserved by the date, retail is reserved and
> collected, jewellery goes out with an outfit."

Never: "Curated for your lifestyle", "day-wear elegance to festive soirées",
"discover our collection", "elevate your look".

## C. Palette — these tokens only, no other colours

```
violet-950  #191129   violet-900 #221636   violet-800 #2f1e4d (primary button)
violet-700  #40296a   violet-500 #6e56a6   violet-300 #b3a4d6   violet-100 #ede9f7
porcelain-50 #fafaf7  porcelain-100 #f2f1ec  porcelain-200 #e4e2da  stage #ecebe7
ink-900 #241d31       ink-600 #5d5668       ink-400 #8e8798
gold-600 #a9853a (on light)  gold-500 #c2a155 (on dark)  gold-100 #f4eedc
```

**Proportion rule, strictly enforced: at least 90% porcelain and neutrals, about
8% violet tints, at most 2% gold.** Gold is the jewellery of the interface, not a
highlighter: hairlines, eyebrows, small ornament, one accent word. Never a large
fill.

Approved text pairs only: ink-900 or ink-600 on porcelain; porcelain-50 on
violet-950/900/800; gold-600 on porcelain at 16px+ or 500 weight; gold-500 on
dark violet. Everything clears WCAG AA (4.5:1 body, 3:1 large display).

## D. Type

- Display: **Bodoni Moda**, variable, `opsz` axis, weight 500, never bold.
- Body and UI: **Instrument Sans**, 400/500/600.
- **Exactly one italic accent word per section.** Bodoni's italic is the brand's
  one flourish; twice in a section it becomes decoration.
- Hindi is a future requirement, so never bake text into images.

## E. Motion

Animate **only** `transform`, `opacity` and `clip-path`. Never `width`, `height`,
`top` or `left`. Never `transition: all`. Every effect needs a
`prefers-reduced-motion: reduce` path that renders the final state with no
animation. The audience is largely mid-range Android: nothing costing a filter
pass per frame on touch.

Site defaults, match them: reveals 0.7s `power2.out`, 70ms stagger, once at 80%
viewport; hovers 180ms; hover scale never above 1.03.

**Two signature devices exist and ship as components (see §K). Import them, never
rebuild them:**

- **Torn-paper section edges.** Sections never meet along a straight line. The
  upper ground tears and hangs over the one below, the strip curling back and
  casting a shadow on what it reveals. The grounds themselves still meet along
  one hard edge: **no gradient, no crossfade, no soft blend between two sections,
  ever.** This is the single most important visual rule on the site.
- **A gold keyline frame** on the one or two photographs the page most wants you
  to look at: two hairlines plus four fixed-size corner brackets, drawn. Not on
  every image, or it stops meaning anything. Never baroque or filigree.

## F. Imagery (use these paths; invent or hotlink nothing else)

```
/categories/bridal-lehengas.jpg   /categories/side-lehengas.jpg
/categories/sarees.jpg            /categories/ready-to-wear-sarees.jpg
/categories/rajasthani-poshak.jpg /categories/chaniya-cholis.jpg
/categories/indo-western.jpg      /categories/gowns.jpg
/categories/party-wear-suits.jpg  /categories/short-kurtis.jpg
/categories/co-ord-sets.jpg       /categories/kaftans.jpg
/categories/three-piece-suits.jpg /categories/one-piece.jpg
/categories/night-suits.jpg       /categories/kurta-pant-sets.jpg
/flagship/sarees.jpg              /hero/hero-still.webp  /hero/hero-poster.webp
```

Licensed stock standing in for the owner's photography, which arrives later, so
the layout must survive a swap to differently-cropped images. Use plain `<img>`
with `object-cover`, **not** `next/image`.

**Off limits:** anything under `/threshold/` (that film belongs to `/rentals`),
`/flagship/draft-lehenga.png` (the `/rentals` pattern seam), and the two
`/hero/*.mp4` files (retired, and watermarked in the bottom-right corner).

## G. Hard constraints — violating any one fails the work

1. **Female-only.** Every model, illustration and line of copy addresses women.
   No male models, no groom content, nothing addressed to a couple.
2. **No shipping.** Never use cart, checkout, delivery, shipping, order tracking
   or "add to bag". Retail is *reserve and collect at the shop*; rentals are
   *reserve the dates, collect, return*.
3. **No em dashes in visible copy.** Use a comma, period, colon or parentheses.
4. **No gradient or blurred boundaries between sections.**
5. **No logo.** The wordmark is typographic and already built (§K).
6. **No invented facts** about the business, its history, awards, customer
   numbers or prices.
7. **Zero external dependencies beyond GSAP.** No image CDNs, icon packs, UI
   kits, or fonts other than the two named.
8. The page must work with JavaScript disabled well enough to read and navigate.

## H. What "good" looks like

The standing directive is **"subtle yet extremely beautiful, unmistakably
non-template"**. Two specific failure modes:

- **Every section the same shape** (eyebrow, heading, paragraph, grid). Vary the
  composition genuinely: change where the image sits, change the column split,
  let one section be full-bleed and the next be a narrow measure.
- **Half-empty sections.** Content in the left 45% with the rest blank reads as
  unfinished, not editorial.

Real buttons are welcome: violet-800 primary, ghost variant with a 1px border.
10px radius on controls, 14px on cards.

### H.1 Design for the desktop first **NEW — owner feedback, 9 September 2026**

The landing-page run came back reading as "a mobile site stretched wide", and the
owner said so. **This is the most likely way the next page fails.** What causes
it, and what to do instead:

- **A single narrow measure down the middle.** Every section putting one column
  of text at the left of a 1200px shell, stacked vertically, is a phone layout
  that happens to be running on a 1920px screen. On desktop the page must use its
  **horizontal** axis: two and three column splits, text set against image across
  the full width, a caption in a margin, a heading that spans while its body sits
  in one narrow column beside it.
- **`.shell` is not the only width.** It is 1200px and it is right for reading
  measures, but a section may break out of it. Full-bleed image bands, a grid
  that runs to the viewport edge, an image bleeding off one side while the text
  stays inside the shell: all of these are wanted, and a page where every single
  section is shell-width is the failure being described.
- **Vary where things sit.** Section 1 image right, section 2 image left and
  bleeding off the edge, section 3 centred and full width, section 4 a wide grid.
  Position is the main tool for making sections feel different, and it is free.
- **Let the display type get genuinely large on desktop.** `text-h1` and
  `text-h2` are fluid and already scale, but a heading capped at `max-w-[13ch]`
  on a 1920px screen wastes the page. Give the big headings room to be big.
- **Height is not composition.** If a desktop section is very tall and mostly
  empty, the fix is to lay its content out sideways, not to add more padding.
- **Then check the phone.** Every one of these collapses to a single column at
  390px, which is easy. The reverse is not, which is why the desktop composition
  is the one to design first.

Verify by screenshotting at **1440px and 1920px**, not only at 390px.

## I. Integration contract — read before writing any code

This is one route inside an app that already has a layout, a token system and a
component library.

**`app/layout.tsx` already provides all of these. Do not create any of them:**

- `<html>` and `<body>`, with font variables and base colours set.
- **Both fonts**, via `next/font/google`. Do not add a Google Fonts `<link>`, an
  `@import`, or a second font loader.
- The site **navigation** (`components/site/Nav.tsx`). **Do not build a header,
  nav bar, or wordmark lockup at the top of the page.**
- The site **footer** (`components/site/Footer.tsx`), which already prints the
  address, hours, phone and map link.
- The `<main>` wrapper. **Do not add your own `<main>`.**

Your page file exports a component whose markup starts at its first section and
ends at its last.

**You may create or change:** the one page file named in the page prompt, and new
components under `components/site/`.

**Do not touch, for any reason:** `app/globals.css` (tokens are locked),
`app/layout.tsx`, `Nav.tsx`, `Footer.tsx`, `lib/site.ts`, `lib/categories.ts`,
`lib/rentals.ts`, or any route other than the one you were given.

**No data layer.** No database calls, `fetch`, or server actions. Live catalogue
data is wired in separately afterwards. Where a page needs product or category
data, the page prompt says which constant to map over.

**Shop details come from `SHOP`.** Import `{ SHOP } from "@/lib/site"` and read
`SHOP.address`, `SHOP.hours`, `SHOP.phone`, `SHOP.mapsUrl`. **Never hardcode
them:** today's values are placeholders that become owner-editable settings.

## J. Tokens are Tailwind utilities, not hex strings

A `@theme` block in `app/globals.css` means **every colour, size, radius and
shadow in §C and §D already exists as an ordinary Tailwind class.** A raw hex, an
arbitrary value like `bg-[#fafaf7]`, or an inline `style` colour is a defect.

- **Colour:** `bg-violet-950`, `text-ink-600`, `border-gold-600`, `bg-stage`, …
- **Type scale:** `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-caption`,
  `text-eyebrow`. Each carries its own line-height, weight and tracking, so **do
  not stack `font-medium`, `tracking-tight` or `leading-*` on them.**
  `text-threshold` belongs to `/rentals`: never use it.
- **Radius:** `rounded-card` (14px), `rounded-control` (10px).
- **Shadow:** `shadow-card`, `shadow-lift`.

House utility classes, already defined:

- **`.shell`** — the standard content column (1200px max, centred, responsive
  gutters). Use it instead of `max-w-7xl mx-auto px-6`.
- **`.eyebrow`** — the small uppercase gold label (`.on-dark` variant).
- **`.arch`** — the signature jharokha arch for image tiles. The site's strongest
  single shape; every page should use it at least once.
- **`.ornament`** — gold hairline with a centred ✦.
- **`.grain`** — 2% film-grain overlay, dark sections only.
- **`.tabular`** — tabular figures, for any number.
- **`.on-dark`** — put on a dark section so nested eyebrows and focus rings flip.
- Do **not** use `.shell-rooms`; it belongs to the `/rentals` room index.

## K. Components that already exist — import, never re-implement

All in `components/site/`, all handling `prefers-reduced-motion` internally.

```tsx
import { SectionEdge } from "@/components/site/SectionEdge";
// The torn-paper boundary, at the seam between two sections.
//   paper  = the OUTGOING (upper) section's ground
//   reveal = the INCOMING (lower) section's ground
<SectionEdge paper="var(--color-porcelain-50)" reveal="var(--color-violet-950)" seed={3} />

import { GoldFrame } from "@/components/site/GoldFrame";
// tone="light" on porcelain, tone="dark" on violet. At most two per page.
<GoldFrame tone="light"><img src="…" alt="" className="h-full w-full object-cover" /></GoldFrame>

import { RippleHeading } from "@/components/site/RippleHeading";  // NEW
// Splits a heading into letters: waves them in on scroll, ripples them under the
// pointer. Takes a plain string child, no markup inside. Use it for the page's
// h1 and its section h2s. This is the site's heading treatment now.
<RippleHeading as="h1" className="text-h1 text-ink-900">New pieces on the rail, most days.</RippleHeading>

import { WordmarkClose } from "@/components/site/WordmarkClose";  // NEW
// The page's ending: the shop's name oversized and cropped by the bottom edge,
// on violet-950, with the real close passed as children. Landing page only for
// now; a page prompt will say if it applies.

import { Reveal } from "@/components/site/Reveal";
// Reveals children marked `data-reveal`: 0.7s power2.out, 70ms stagger, once.
<Reveal><h2 data-reveal>…</h2><p data-reveal>…</p></Reveal>

import { WipeIn } from "@/components/site/WipeIn";     // clip-path wipe; mark children `data-wipe`
import { Parallax } from "@/components/site/Parallax"; // { distance = 40 } px of travel
import { CountFigure } from "@/components/site/CountFigure"; // { value, prefix? } counts up, formats INR
import { CategoryTiles } from "@/components/site/CategoryTiles"; // category grid, takes { base, categories }
import { RentalCard } from "@/components/site/RentalCard";       // one rental tile
```

**Do not use:** `Threshold`, `RoomIndex`, `PatternSeam` (all `/rentals`);
`DistortHeading` (superseded by `RippleHeading`); `Hero`, `CategoryShowcase`,
`SareesFlagship`, `LehengasFlagship` (retired v2 sections, kept for reference
only — read them, never import them).

## Pages already built — do not re-invent, and do not copy wholesale **NEW**

- **`/` (landing)** — typographic hero on porcelain, story, three doors, proof,
  wordmark close. Torn edges throughout.
- **`/rentals`** — the "Threshold and rooms" grammar: a scroll-scrubbed film
  threshold, then rooms joined by hard cuts, the pattern seam as its peak. **This
  page's devices are its own.** No other page gets a scrubbed film, a room index,
  or a draggable seam.

Every new page must differ from both in composition, not merely in content. Two
pages running the same section shapes is the "one shape repeated" failure the
per-page approach exists to prevent.

## Review checklist (run after Kombai returns)

- [ ] Every business claim traces to a fact above; `TODO(owner)` blanks still visible.
- [ ] No founding year, no heritage register, no town named.
- [ ] Palette proportion holds (measure it): gold ≤ 2%.
- [ ] Every text pair clears AA at its real rendered size, over its real background.
- [ ] No em dash in any visible string. No cart/checkout/delivery/shipping words.
- [ ] No male models or groom content.
- [ ] No `transition: all`; no animated width/height/top/left; reduced-motion path everywhere.
- [ ] No gradient or crossfade between two section grounds.
- [ ] No `<html>`, `<body>`, `<main>`, header, nav, footer or wordmark lockup in the page file.
- [ ] No Google Fonts link or `@import`.
- [ ] No raw hex, no `bg-[#…]`, no inline `style` colour.
- [ ] `.shell` on constrained sections; `.arch` used at least once.
- [ ] `SectionEdge`, `GoldFrame`, `RippleHeading` imported, not re-implemented.
- [ ] `Reveal`/`WipeIn`/`Parallax` used rather than hand-written GSAP.
- [ ] No DB call, `fetch` or server action added.
- [ ] `globals.css`, `layout.tsx`, `Nav.tsx`, `Footer.tsx` unmodified.
- [ ] Renders correctly at 390px, 768px, 1440px and 1920px, verified by screenshot.
- [ ] Composition genuinely differs from `/` and `/rentals`.
