# `/visit` and `/policies` — Kombai task prompt

**Paste `specs/KOMBAI_SHARED_CONTRACT.md` first, then everything below the rule.**

Prepared 9 September 2026. Both pages exist and are plain: they work, and they
have no design. They are being rebuilt together because they share a grammar.

---

Build **two pages** in the same pass, in the same grammar:

- `app/visit/page.tsx`
- `app/policies/page.tsx`

## The grammar for both: a typographic poster

Neither page is a catalogue and neither is a story. They are **documents**, and
the design should be honest about that: type on porcelain, generous space, a
strong hierarchy, almost no photography. One photograph on `/visit` at most; none
on `/policies`.

This is the third distinct grammar on the site, and it is deliberately the
quietest. `/` is an essay, `/rentals` is a sequence of rooms, `/retail` and
`/jewellery` are catalogues. These two are printed matter.

Because there is so little imagery, **the composition has to do the work** — read
§H.1 carefully. A single narrow column of text down the middle of a 1920px screen
is exactly the failure the owner named. Use the horizontal axis: a heading that
spans wide with its body in one narrow measure beside it, labels in a left margin
against values in a wider column, a two-column split for the practical detail.

---

## Page 1: `/visit`

### What it is for

Fitting happens in person. Nothing is posted. This page is how a customer gets
herself into the shop, and it is the page every other page's close links to.

### Structure

1. **Head.** `RippleHeading` h1 and one sentence. The fitting-in-person model
   stated plainly.
2. **The practical block.** Address, hours, phone, and a map link. **All four come
   from `SHOP` in `@/lib/site`** (`SHOP.address`, `SHOP.hours`, `SHOP.phone`,
   `SHOP.mapsUrl`). Never hardcode them: they are placeholders today and become
   owner-editable settings. Note the site footer already lists all four a screen
   below, so this must not be a repeat of that list. Make it the centrepiece,
   set large, laid out as a poster would set it.
3. **What happens when she comes in.** Three or four steps: try pieces on, we pin
   and alter in the shop, jewellery matched to the outfit, dates held. Honest and
   short, composed sideways.
4. **What to bring.** The date she is dressing for, and anything she is matching
   to. One short block.
5. **Close.** A link onward to `/rentals` and `/retail`. **Do not use
   `WordmarkClose`.**

### Constraints

- **No map embed.** No Google Maps iframe, no third-party script, no image CDN
  (§G.7). A text link to `SHOP.mapsUrl` is the whole map.
- No booking form. Booking is Phase 2 and does not exist yet.
- No invented directions, landmarks, parking notes or travel advice. The town has
  not been given. Where a detail would be needed, use a visible `TODO(owner)`.

---

## Page 2: `/policies`

### What it is for

The rental terms: what is expected of a customer who takes a garment out, and
what the shop does in return. It is the page a careful person reads before
reserving, and it is the page that has to be unambiguous rather than beautiful.

### Structure

Read the existing `app/policies/page.tsx` for the current sections and **keep the
substance of every one of them.** This is a redesign, not a rewrite: do not delete
a term, do not soften a term, and do not invent a term that is not already there.
If a section reads awkwardly you may re-set the sentence, but the meaning must
survive intact.

Design it as a document with real hierarchy: numbered or lettered sections, a
clear heading per term, a readable measure, and a way to see the shape of the
whole page at a glance. A left-hand index of the sections that stays visible on
desktop would suit it, if it can be built without a scroll library.

### Constraints

- **Do not invent, alter or remove any policy.** This is the one page on the site
  where invented content has consequences for a real customer.
- No prices, no deposit figures, no penalty amounts unless they are already in the
  existing file.
- No photography.
- No `WordmarkClose`.
