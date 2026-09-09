# `/retail` — Kombai task prompt

**Paste `specs/KOMBAI_SHARED_CONTRACT.md` first, then everything below the rule.**

Prepared 9 September 2026. The existing `/retail` page is being replaced: its copy
is in the exact register the owner has twice rejected ("Curated for your
lifestyle", "The Boutique Collection", "day-wear elegance to festive soirées").
None of it survives.

---

Build the **retail listing page** at `app/retail/page.tsx`.

## What this page is for

Retail is the half of the shop you **keep**. A customer reserves a piece online,
comes in, tries it on, and takes it home. There is no posting and no checkout:
the reservation holds the piece, the shop is where the transaction finishes.

This page is a **catalogue with a point of view**, not a story page. The landing
page already tells the shop's story and `/rentals` already argues the case for
renting. This page's job is to let a woman find the thing she wants and understand
how to get it. It should be quicker, plainer and more useful than either of them,
and it should feel like daylight: this is the everyday half of the shop, not the
wedding half.

## Structure

1. **Head.** One `RippleHeading` h1, a sentence, and the reserve-and-collect model
   stated once, plainly, near the top. Do not bury it in a footnote: it is the
   thing most visitors will not expect.
2. **The categories.** Eight of them, listed below. This is the page's spine and
   should take the most room. Give the grid a real composition rather than eight
   identical squares: the `.arch` shape, varied tile sizes, or a layout that lets
   a couple of categories run larger than the rest. It must survive a swap to the
   owner's photography, so no crop-dependent trickery.
3. **How reserving works.** Three or four steps, honestly told: reserve online,
   we hold it, come in and try it, take it home. Compose this sideways across the
   page rather than as a tall stack (§H.1).
4. **The cross-sell to rentals.** One quiet band: some pieces are for keeping and
   some are for one week only. Link to `/rentals`. It is a doorway, not a pitch.
5. **Close.** An invitation to come in, linking to `/visit`. **Do not use
   `WordmarkClose`** — that is the landing page's ending and it stops meaning
   anything if every page wears it.

## The categories — use exactly these, do not invent or rename

Map over `RETAIL_CATEGORIES` from `@/lib/categories`. Each entry has
`{ slug, name, count, image }`. Link each tile to `/retail?category=<slug>`.

```
three-piece-suits   3-Piece Suits          /categories/three-piece-suits.jpg
party-wear-suits    Party Wear Suits       /categories/party-wear-suits.jpg
one-piece           One Piece              /categories/one-piece.jpg
short-kurtis        Short Kurtis           /categories/short-kurtis.jpg
co-ord-sets         Co-ord Sets            /categories/co-ord-sets.jpg
kaftans             Kaftans                /categories/kaftans.jpg
night-suits         Night Suits            /categories/night-suits.jpg
kurta-pant-sets     Kurta Pant Sets        /categories/kurta-pant-sets.jpg
```

**`count` is a stub and is 0 for almost everything.** Do not print counts, do not
write "12 pieces available", and do not imply a catalogue size the shop has not
confirmed. Real inventory arrives later.

## Ground and boundaries

Daylight, so the page lives on the light end of the palette: porcelain-50 and
porcelain-100, with `stage` for one band if a third ground is wanted. **At most
one violet-950 section**, and only if the composition genuinely needs a dark beat.
Every section boundary carries a `SectionEdge` and the two grounds meet on a hard
edge.

## Things this page must not do

- No cart, no checkout, no "add to bag", no delivery or shipping language. The
  verb is **reserve**, and the place is **the shop**.
- No prices. None have been confirmed.
- No scrubbed film, no room index, no draggable seam. Those are `/rentals`'.
- No `WordmarkClose`.
- Do not repeat the landing page's section shapes. Its rhythm is
  hero → story → three doors → proof → close; this page is a catalogue and should
  not read as another essay.
