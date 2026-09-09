# `/jewellery` — Kombai task prompt

**Paste `specs/KOMBAI_SHARED_CONTRACT.md` first, then everything below the rule.**

Prepared 9 September 2026. A jewellery page already exists at
`app/jewellery/JewelleryContent.tsx` and works, but it predates the current design
language and never received the pass the landing page and `/rentals` got. Rebuild
it in that language. Read the existing file for its structure and its category
names; keep nothing of its markup.

---

Rebuild the **jewellery page** at `app/jewellery/JewelleryContent.tsx` (a client
component; `app/jewellery/page.tsx` already imports it and sets the metadata, and
must not be changed).

## What this page is for

Jewellery is **rented, never sold, and almost always alongside an outfit**. It is
the third door, and it is the smallest of the three businesses: a customer taking
a lehenga for a wedding week also takes the set that matches it, on the same
dates, so nothing has to be hunted for separately.

That makes this page different from `/retail` in kind, not just in content. It is
**not a catalogue to browse for its own sake.** It is the answer to "what goes
with what I am already taking". Design it as a companion, and let the page say so.

## The one thing that makes this page distinctive

**This is the site's only dark listing page.** It lives on **violet-950**, with
gold as its accent, and metal as its material. Every other page is porcelain and
daylight. Gold is capped at 2% of the surface everywhere else on the site; this is
the page where that 2% does the most work, because it is the only page where the
subject genuinely is gold.

Use `.grain` on the dark ground, `.on-dark` so nested eyebrows flip to gold-500,
and `GoldFrame tone="dark"` on the one or two pieces the page most wants looked
at. Contrast still has to clear AA: porcelain-50 on violet-950 for body, gold-500
for accents on dark, never gold-600.

## Structure

1. **Head.** `RippleHeading` h1 on the dark ground. State the model in the first
   sentence: rented alongside an outfit, never sold, on the same dates.
2. **The pieces.** The categories from the existing `JewelleryContent.tsx`. On a
   dark ground a grid of bright metal on black reads as a vault, which is the
   feeling to reach for. Compose it sideways and vary the tile sizes (§H.1); eight
   identical squares is the failure.
3. **Matched to the outfit.** The cross-sell, and the reason the page exists: show
   a garment and its set together. Link to `/rentals`. This should be the page's
   strongest single composition.
4. **How it works.** Short. Same dates as the outfit, collected together, returned
   together. Three or four lines, laid out across the page.
5. **Close.** An invitation to come in and try pieces against an outfit, linking
   to `/visit`. **Do not use `WordmarkClose`.**

## Constraints particular to this page

- **Never "buy", "sale", "price" or "own".** Jewellery is rented. There is no
  version of this page where a piece is sold.
- No standalone booking flow. Jewellery goes out with an outfit, so every call to
  action leads toward an outfit, not toward a separate jewellery checkout.
- No prices. None have been confirmed.
- One dark page does not mean a dark site: do not restyle anything outside this
  file, and do not touch the shared components to make them darker.
- No scrubbed film, no room index, no draggable seam.
