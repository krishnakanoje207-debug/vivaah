# Main landing page — Kombai task prompt

Prepared 9 Sep 2026, after the owner's decision to split the site: the
"Threshold and rooms" grammar moved to `/rentals`, and the main landing page is
being rebuilt from scratch with a new hero.

**§A was filled from the owner's own account on 9 September 2026.** Two blanks
remain (`TODO(owner)`) and are marked as such deliberately: they are still
unanswered, not overlooked. Kombai will invent something plausible if it is
allowed to, and invented heritage copy is exactly the "generic AI template" the
owner rejected twice already, so §A.1 below states what the facts rule out.

Paste everything between the rules. Review afterwards with the checklist at the
bottom (ours, not Kombai's).

**§I is the most load-bearing section.** This page plugs into an app that already
has a layout, a token system and a component library, and that is where this task
is most likely to fail, not in the design.

---

Design and build the **main landing page** for a bridal and occasion wear shop in
India, as a Next.js 16 App Router page (`app/page.tsx`) using Tailwind CSS v4.
The shop is "Vivaah Dresses and Suits". It runs three businesses under one roof:
**rentals** (bridal and festive wear, rented by the date), **retail** (suits,
kurtis, co-ord sets, kaftans, reserved online and collected at the shop), and
**jewellery** (rented alongside an outfit, never sold).

This page is not a booking funnel. **It has to tell the shop's story.** A visitor
who never books anything should still come away knowing who these people are and
why the clothes are worth trusting. The booking machinery lives on other pages.

## A. The shop's story — use these facts, invent nothing

**From the owner, 9 September 2026. This is the complete set, and it is short on
purpose: the shop is about a year old and there is no heritage to draw on.
Anything not listed here does not exist. Do not write around a gap.**

- **Opened:** about a year ago. The owner was not certain of the year, so **do
  not print a founding year, an anniversary, or "since 20XX" anywhere on the
  page.** The shop's newness may be implied. It must never be dated.
- **Who runs it:** two partners, together. Not a family business, not a single
  proprietor, nothing inherited. Say "two partners" or let them speak as "we".
  Never invent their names, their roles, or the relationship between them.
- **Rentals and retail began at the same time.** There is no origin story in
  which one came first and the other was added later. Never write "we started
  by renting and then...", and never give either side seniority over the other.
  One shop, two ways to take a garment home.
- **What the shop is known for:** the stock is updated day to day. What is on
  the rail this week is not what was on it last month. New pieces keep arriving.
- **How they run it:** sincerely, and every rental is handled to the best of
  their abilities, personally, by the same two people each time.
- **Why customers come back:** `TODO(owner)` — not yet answered. Do not invent a
  reason. Leave the page able to absorb this later without restructuring.
- **The town/area:** `TODO(owner)` — not yet given, and the address in
  `lib/site.ts` is still a placeholder. Do not name a town, region or
  neighbourhood anywhere.

Write the page's copy from those facts only. Where a fact is missing, leave a
clearly marked `TODO` string rather than inventing a sentence around it. No
stock founder-story language ("a passion for craftsmanship", "timeless elegance",
"a legacy of excellence"). Plain, specific, unhurried sentences.

### A.1 What these facts rule out, and what they open up

A one-year-old shop has no heritage, and heritage copy is exactly the generic
register the owner has already rejected twice. **Banned outright: legacy,
lineage, generations, tradition, "years of experience", "trusted since",
"a family name", and any claim of age.** The shop cannot make those claims and
must not appear to.

The honest angle is the opposite of heritage, and it is the better one: **this is
a shop that changes.** The stock turns over day to day, and two people handle
every rental themselves rather than passing it to staff. A large rental chain
can claim neither. Write the page toward freshness, movement and personal
handling. That is its emotional centre, and it is true.

## B. Page structure

1. **Hero.** Full-bleed, above the fold, and it must carry the brand rather than
   a product. It is NOT the scroll-scrubbed film from the old home page: that
   film has moved to `/rentals` and must not be reused here. Propose a hero that
   works from a still photograph plus type. Available imagery is listed in §F.
2. **The story.** The shop in the owner's own words from §A, framed as §A.1
   directs (a shop that changes, handled by two people), never as heritage. It is
   the emotional centre and needs real space on the page, but it has very few
   facts to fill that space with, so **give it that space through composition**
   (scale, one photograph, generous air, a single figure) **rather than through
   more sentences.** Padding it to length is how this section fails.
3. **The three doors.** Rentals, retail, jewellery, given equal weight and
   clearly distinguished by *material* rather than by three identical cards.
   Each links to `/rentals`, `/retail`, `/jewellery`.
4. **Proof.** Something that shows the shop knows garments: a detail, a process,
   a hand at work. Not testimonials.
5. **Visit.** Address, hours, a map link, and a clear invitation to come in and
   try things on. Fitting happens in person; that is the whole model.

## C. Palette — use these tokens exactly, no other colours

```
violet-950  #191129   violet-900 #221636   violet-800 #2f1e4d (primary button)
violet-700  #40296a   violet-500 #6e56a6   violet-300 #b3a4d6   violet-100 #ede9f7
porcelain-50 #fafaf7  porcelain-100 #f2f1ec  porcelain-200 #e4e2da  stage #ecebe7
ink-900 #241d31       ink-600 #5d5668       ink-400 #8e8798
gold-600 #a9853a (accents on light)  gold-500 #c2a155 (accents on dark)  gold-100 #f4eedc
```

**Proportion rule, strictly enforced: at least 90% porcelain and neutrals, about
8% violet tints, at most 2% gold.** Gold is the jewellery of the interface, not a
highlighter. It belongs on hairlines, eyebrows, small ornament and one accent
word, never on large fills.

Approved text pairs only: ink-900 or ink-600 on porcelain; porcelain-50 on
violet-950/900/800; gold-600 on porcelain at 16px+ or 500 weight; gold-500 on
dark violet. Everything must clear WCAG AA (4.5:1 body, 3:1 large display).

## D. Type

- Display: **Bodoni Moda** (variable, `opsz` axis), weight 500, never bold.
  Tighten tracking as size grows: h1 −0.01em, h2 −0.004em, h3 +0.002em.
- Body and UI: **Instrument Sans**, 400/500/600.
- Exactly one italic accent word per section, no more. Bodoni's italic is the
  brand's one flourish; used twice in a section it becomes decoration.
- Hindi is a future requirement, so never bake text into images.

## E. Motion and effects

Animate **only** `transform`, `opacity` and `clip-path`. Never animate `width`,
`height`, `top` or `left`. Never use `transition: all`. Every effect must have a
`prefers-reduced-motion: reduce` path that renders the final state with no
animation. The audience is largely mid-range Android: nothing that costs a
filter pass per frame on touch devices.

Defaults already in use across the site, match them: reveals are 0.7s
`power2.out` with a 70ms stagger, firing once at 80% viewport; hovers are 180ms;
hover scale never exceeds 1.03. GSAP + ScrollTrigger are available.

Two signature devices exist on the site and should be echoed, not re-invented.
**Both already ship as components: import them per §K, do not rebuild them.**
They are described here so you know what they are for, not so you can write them:

- **Torn-paper section edges.** Sections do not meet along a straight line. The
  upper section's ground tears and hangs over the section below, with the torn
  strip curling back, catching light along its ridge and casting a shadow on
  what it reveals. The grounds themselves still meet along one hard edge: **no
  gradient, no crossfade, no soft blend between two sections, ever.** That is the
  single most important visual rule on this site.
- **A gold keyline frame** on the one or two photographs the page most wants you
  to look at: two hairlines plus four fixed-size corner brackets, drawn, never a
  stretched image. Not on every image, or it stops meaning anything. Do NOT use
  baroque or filigree frames.

## F. Imagery available (use these paths; do not invent or hotlink any others)

```
/categories/bridal-lehengas.jpg   /categories/side-lehengas.jpg
/categories/sarees.jpg            /categories/ready-to-wear-sarees.jpg
/categories/rajasthani-poshak.jpg /categories/chaniya-cholis.jpg
/categories/indo-western.jpg      /categories/gowns.jpg
/categories/party-wear-suits.jpg  /categories/short-kurtis.jpg
/categories/co-ord-sets.jpg       /categories/kaftans.jpg
/categories/three-piece-suits.jpg /categories/one-piece.jpg
/categories/night-suits.jpg       /categories/kurta-pant-sets.jpg
/flagship/sarees.jpg              /hero/hero-poster.webp  /hero/hero-still.webp
/hero/hero-intro.mp4              /hero/hero-loop.mp4
```

These are licensed stock standing in for the owner's photography, which arrives
later, so the layout must survive a swap to differently-cropped images. Use
plain `<img>` with `object-cover`, not `next/image`.

**Which hero assets are safe.** `/hero/hero-still.webp` and `/hero/hero-poster.webp`
are fine. The two mp4s belong to the retired v2 hero; the source frames they came
from carry a generator watermark in the bottom-right corner, which that component
handled by cropping, so if you use them, check that corner in a rendered
screenshot before relying on them. **Off limits entirely:** anything under
`/threshold/` (that film belongs to `/rentals`) and `/flagship/draft-lehenga.png`
(the pattern-draft line drawing, which belongs to the `/rentals` seam).

## G. Hard constraints — a violation of any of these fails the work

1. **Female-only.** Every model, illustration and line of copy addresses women.
   No male models, no groom content, nothing addressed to a couple.
2. **No shipping.** The shop does not post anything. Never use cart, checkout,
   delivery, shipping, order tracking, or "add to bag". Retail is *reserve and
   collect at the shop*; rentals are *reserve the dates, collect, return*.
3. **No em dashes anywhere in visible copy.** Use a comma, a period, a colon or
   parentheses.
4. **No gradient or blurred boundaries between sections** (see §E).
5. **No logo.** The wordmark is typographic: "Vivaah" in Bodoni with
   "DRESSES & SUITS" beneath it in 0.5rem uppercase at 0.22em tracking. The
   owner's logo file has not arrived.
6. **No invented facts** about the business, its history, its awards, its number
   of customers, or its prices.
7. **Zero external dependencies beyond GSAP.** No image CDNs, no icon packs, no
   UI kits, no fonts other than the two named above.
8. The page must work with JavaScript disabled well enough to read the story and
   reach the three doors.

## H. What "good" looks like here

The owner's standing directive is **"subtle yet extremely beautiful,
unmistakably non-template"**, and they have twice rejected work for looking
generic. Two specific failure modes to avoid:

- A page where every section is the same shape: eyebrow, heading, paragraph,
  grid. Vary the composition genuinely between sections.
- Half-empty sections. If a section puts its content in the left 45% and leaves
  the rest blank, it reads as unfinished rather than as editorial.

Real buttons are welcome and currently missing from the site's newer work:
violet-800 primary, and a ghost variant with a 1px border. 10px corner radius on
controls, 14px on cards.

## I. Integration contract — read before writing any code

This is not a standalone HTML document. It is one route inside a Next.js app that
already has a layout, a design system and a component library.

**`app/layout.tsx` already provides every one of the following. Do not create any
of them:**

- `<html>` and `<body>`, with the font variables and base colours already set.
- **Both fonts**, loaded through `next/font/google`: Bodoni Moda as a variable
  instance with the `opsz` axis, and Instrument Sans. Do not add a Google Fonts
  `<link>`, an `@import`, or a second font loader. They are already loaded.
- The site **navigation** (`components/site/Nav.tsx`), above every page.
  **Do not build a header, a nav bar, or a wordmark lockup at the top of the page.**
- The site **footer** (`components/site/Footer.tsx`), which already prints the
  address, hours, phone and map link.
- The `<main>` element that wraps the page. **Do not add your own `<main>`.**

So `app/page.tsx` exports a component whose markup starts at the page's first
section and ends at its last. Nothing around it.

**Files you may create or change:** `app/page.tsx` (rewrite it), and new
components under `components/site/`.

**Files you must not touch, for any reason:** `app/globals.css` (the tokens are
locked; adding one is a spec change), `app/layout.tsx`, `components/site/Nav.tsx`,
`components/site/Footer.tsx`, `lib/site.ts`, `lib/categories.ts`, `lib/rentals.ts`,
and anything under `app/rentals/`, `app/retail/`, `app/jewellery/`, `app/admin/`.

**No data layer.** Do not add database calls, `fetch`, server actions, or imports
from `lib/rentals`. Live catalogue data is wired in separately after this page
lands. Build the page from the static content §A gives you.

**Shop details come from `SHOP`.** In the Visit section, import
`{ SHOP } from "@/lib/site"` and read `SHOP.address`, `SHOP.hours`, `SHOP.phone`,
`SHOP.mapsUrl`. **Never hardcode them:** today's values are placeholders that
become owner-editable settings later. Note that the footer already lists all four
a screen below, so the Visit section must not just repeat that list. It is an
invitation to come in and try things on, composed differently, and it links to
the existing `/visit` route.

## J. Tokens are Tailwind utilities, not hex strings

Tailwind v4 is configured through a `@theme` block in `app/globals.css`, so
**every colour, size, radius and shadow named in §C and §D already exists as an
ordinary Tailwind class.** A raw hex value, an arbitrary value like
`bg-[#fafaf7]`, or an inline `style` colour is a defect: it silently opts out of
the design system and out of the Hindi work that comes later.

- **Colour:** `bg-violet-950`, `text-ink-600`, `border-gold-600`,
  `bg-porcelain-100`, `bg-stage`, and so on for every token in §C.
- **Type scale:** `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-caption`,
  `text-eyebrow`. Each already carries its own line-height, weight and tracking
  from §D, so **do not stack `font-medium`, `tracking-tight` or `leading-*` on
  top of them.** `text-threshold` exists but belongs to `/rentals`: not here.
- **Radius:** `rounded-card` (14px), `rounded-control` (10px).
- **Shadow:** `shadow-card`, `shadow-lift`.

House utility classes, already defined. Use them rather than re-inventing:

- **`.shell`** — the standard content column: 1200px max, centred, with the
  site's own responsive gutters. Use it for every constrained section instead of
  `max-w-7xl mx-auto px-6`.
- **`.eyebrow`** — the small uppercase gold label (`.on-dark` for dark grounds).
- **`.arch`** — the signature jharokha arch for image tiles. It is the site's
  strongest single shape; this page should use it at least once.
- **`.ornament`** — gold hairline with a centred ✦.
- **`.grain`** — a 2% film-grain overlay, dark sections only.
- **`.tabular`** — tabular figures, for any number.
- Do **not** use `.shell-rooms`; it exists only for the `/rentals` room index.

## K. Components that already exist — import these, never re-implement

Everything below lives in `components/site/` and already handles
`prefers-reduced-motion` internally. Re-implementing any of it is a defect.

**The two signature devices from §E:**

```tsx
import { SectionEdge } from "@/components/site/SectionEdge";
// The torn-paper boundary. Place it at the seam between two sections.
//   paper  = the OUTGOING (upper) section's ground colour
//   reveal = the INCOMING (lower) section's ground colour
//   seed   = change for a different rip; the same seed always renders the same
<SectionEdge paper="var(--color-porcelain-50)" reveal="var(--color-violet-950)" seed={3} />

import { GoldFrame } from "@/components/site/GoldFrame";
// Two hairlines plus four fixed-size corner brackets around a photograph.
//   tone="light" on porcelain (gold-600), tone="dark" on violet (gold-500)
// At most two photographs on the page may wear one.
<GoldFrame tone="light">
  <img src="/categories/sarees.jpg" alt="" className="h-full w-full object-cover" />
</GoldFrame>
```

**Motion. Use these instead of hand-writing GSAP:**

```tsx
import { Reveal } from "@/components/site/Reveal";
// Reveals the children you mark with `data-reveal`: 0.7s power2.out, 70ms
// stagger, firing once at 80% viewport. Props: { stagger = 0.07, as = "div" }
<Reveal><h2 data-reveal>...</h2><p data-reveal>...</p></Reveal>

import { WipeIn } from "@/components/site/WipeIn";     // clip-path wipe; mark children `data-wipe`
import { Parallax } from "@/components/site/Parallax"; // { distance = 40 } px of travel
import { CountFigure } from "@/components/site/CountFigure"; // { value, prefix? } counts up, formats INR
```

**Do not use on this page:**

- `Threshold`, `RoomIndex`, `PatternSeam` — they belong to `/rentals`.
- `DistortHeading` — the site's budget for heading distortion is three placements
  site-wide; two are spent on `/rentals` and the third is reserved.
- `Hero`, `CategoryShowcase`, `SareesFlagship`, `LehengasFlagship` — the retired
  v2 home sections, kept in the tree for reference. Read them, do not import them.

**Keep the preloader.** `app/page.tsx` renders `<Preloader />` as its first
element today. It is the site's front-door moment and belongs on this page. Keep
the import, keep it first, do not restyle it.

---

## Review checklist (ours, run after Kombai returns)

- [ ] Every claim about the business traces to a §A bullet. The two
      `TODO(owner)` blanks are still visibly TODO, not quietly written around.
- [ ] No founding year, anniversary or "since 20XX" appears anywhere.
- [ ] No heritage register: no legacy, lineage, generations, tradition,
      "years of experience", or any claim of the shop's age.
- [ ] No town, region or neighbourhood is named.
- [ ] Rentals and retail are never given different origins or seniority.
- [ ] "Two partners", never "family", never invented names or roles.
- [ ] Palette proportion holds: measure it, do not eyeball it. Gold ≤ 2%.
- [ ] Every text pair clears AA at its real rendered size, measured over the
      actual background (including over photographs).
- [ ] No em dash in any visible string.
- [ ] No male models or groom content in any image or line.
- [ ] No cart/checkout/delivery/shipping vocabulary anywhere.
- [ ] No `transition: all`; no animated width/height/top/left; every effect has a
      reduced-motion path.
- [ ] No gradient or crossfade between two section grounds.
- [ ] The hero does not reuse `/threshold/*` (that film belongs to `/rentals`).
- [ ] Sections differ from one another in composition, not just in content.
- [ ] Renders correctly at 390px, 768px, 1440px and 1920px, verified by
      screenshot and not by reading the markup.
- [ ] Bodoni Moda is loaded as a variable instance with the `opsz` axis, not a
      static weight subset.

Integration (§I–§K), the half most likely to come back wrong:

- [ ] `app/page.tsx` contains no `<html>`, `<body>`, `<main>`, header, nav,
      footer or wordmark lockup.
- [ ] No Google Fonts `<link>` or `@import` was added; fonts come from the layout.
- [ ] No raw hex, no `bg-[#…]` arbitrary value, no inline `style` colour anywhere.
- [ ] `.shell` carries the constrained sections; `.arch` appears at least once.
- [ ] `SectionEdge` and `GoldFrame` are imported, not re-implemented.
- [ ] `Reveal` / `WipeIn` / `Parallax` are used rather than hand-written GSAP.
- [ ] No `DistortHeading`, `Threshold`, `RoomIndex` or `PatternSeam` on this page.
- [ ] `<Preloader />` still renders first.
- [ ] The Visit section reads `SHOP` from `lib/site`, hardcodes nothing, and does
      not simply repeat the footer's list.
- [ ] No database call, `fetch` or server action was added.
- [ ] `globals.css`, `layout.tsx`, `Nav.tsx` and `Footer.tsx` are unmodified
      (`git diff --stat` proves it).
