# Action roadmap — every page should end in a piece, not a postcode

Authored 14 September 2026, after the owner's note that reaching a garment
"deems the pages useless" because nothing on them can be acted on. This
supersedes the navigation-depth open task in CLAUDE.md: that task asked how many
*pages* a shopper crosses, and the measurement below shows page count was never
the binding constraint.

Deadline is soft. The ordering here is therefore by value per hour, and the
anti-goals at the foot are as binding as the stages — the risk to this project is
drift, not lateness.

---

## 1. The diagnosis, measured

Run against the live dev server, 14 Sep (`scrollcraft/builds/vivaah/probe-ends.mjs`):

    page                 sections   wa.me links   tel: links   terminates in
    /                       8            0             1       "Plan a visit" / "Open in Maps"
    /rentals                7            0             0       "How to find us" / "Open in maps"
    /rentals/[slug]         3            0             0       "See what else is in for rent"
    /retail                 5            0             0       "Plan a visit"
    /jewellery              5            0             1       "Plan a visit" / "Open in Maps"

Three facts fall out of that table.

**Not one WhatsApp link renders anywhere on the site.** `lib/enquiry.ts` is
written, correct, and honest — it composes the request message, states that a
request is not a reservation, and deliberately degrades to `/visit` rather than
open WhatsApp to nobody. But `hasRealPhone()` is false against the placeholder
`+91 00000 00000`, so every enquiry path in the tree is dark, and the helper is
wired into exactly one component (`NavratriBand`). The shop's actual sales
channel is built and switched off.

**Every page terminates in the same two links, regardless of what the visitor was
just looking at.** A shopper who has spent four minutes on one lehenga and a
shopper who has read the rent-versus-buy argument are both handed directions to a
building. The site's terminal verb is *travel to a shop* — the highest-friction
action in the funnel, and the only one on offer.

**The one product-level CTA promises something nothing behind it can do.**
`app/rentals/[slug]/page.tsx:389` is a hardcoded `/visit` link labelled "Reserve
this silhouette", under the words "Secure your dates with a small advance." No
dates are secured, no advance is taken, and the link goes to a directions page.
That is worse than having no button: it spends the visitor's intent and returns
nothing. It also does not use `enquiryHref`, so it will stay wrong on the day the
phone number lands.

Add the two composition findings from the same audit: the product page's first
viewport carries no name, no price and no action — only a breadcrumb over a
turntable, which lands on the garment's *back* — and below `md` the only contact
affordance on the entire site is inside the hamburger, so a phone visitor scrolls
8,211px of front door past nothing they can press.

## 2. The thesis

**One action, available everywhere, always naming a specific piece: _ask for this
piece_.**

Not "reserve" — Phase 2 owns reservations and the exclusion constraint that makes
them safe, and claiming it early is the mislabel above. Not "plan a visit" — that
is a fine secondary but it is a journey, not a decision. The action this shop can
actually honour today is the one the owner already performs by hand: a WhatsApp
message naming a garment, which she confirms herself.

`lib/enquiry.ts` already models this correctly, including the sentence that has
to travel with it (`REQUEST_NOTICE`). The work is not to invent a mechanism. It
is to turn it on, wire it everywhere, and give it a place in the composition on
each page.

This also settles the navigation-depth question without touching the room
sequence the owner deliberately moved to `/rentals` on 9 Sep: a shopper does not
need fewer pages if any page she is on can end the errand.

## 3. Stages

### Stage 0 — Turn the lights on (minutes, blocks everything after it)

Put the real phone number and shop address into `lib/site.ts`. On that one edit:
every `enquiryHref` in the tree stops degrading and becomes a real `wa.me` link,
the `tel:` links become dialable, and the empty 590x442 map box on the front door
fills in. Nothing else in this roadmap delivers its value until this is done, so
it goes first even though it is not design work.

### Stage 1 — The four render defects

None needs a design decision; all four are visible on a first visit.

1. The jewellery door's caption bar overflows its photograph by a measured 93px
   (`inset-x-4` sits on the 449px anchor, the image is capped at 340px).
2. The empty map box — resolved by Stage 0; until then it must not render at all,
   because a blank grey rectangle reads as broken where a missing one does not.
3. `SectionEdge` renders as three or four identical semicircular blobs at even
   spacing, reading as a scalloped border or an artifact rather than as torn
   paper. It is the site's signature boundary and the only element on the page
   that looks manufactured. Needs genuine per-instance irregularity, not a new
   seed on the same periodic profile.
4. The product stage lands on the garment's back. `SPIN_CATEGORIES` frames run
   front(001) to back(072); arrival must be 001.

### Stage 2 — The action system

The substance of this roadmap.

- **`RequestButton`** — one primitive over `enquiryHref`, carrying
  `REQUEST_NOTICE` wherever it appears, and keeping the existing degrade so the
  site is never broken if the number is ever cleared.
- **The product page's first viewport gets a verb.** Do not shrink the stage —
  it is the best thing on the site. Put the product line at its foot as a
  *plinth*: name, price per day, and the request, occupying the dead band that
  currently holds only "scroll to explore". This is the register the site already
  speaks in — the proof `figcaption`s, the jewellery band — so it adds an action
  without adding a new visual language.
- **Delete the false promise.** "Reserve this silhouette" becomes a real request
  naming the piece, and the "secure your dates with a small advance" copy goes
  with it until Phase 2 can honour it.
- **`ActionBar`** — persistent below `md`, appearing once the hero has passed and
  standing down at the footer. Contextual: the phone and WhatsApp generally, the
  named piece on a product page. Must coexist with `CookieConsent`, which already
  occupies `inset-x-0 bottom-0` at that width.
- **Every page's close gains a piece-level request** beside, not instead of,
  "Plan a visit". `/rentals` ends on the collection, so its close should ask for
  the date; `/jewellery` should ask with the outfit named.

### Stage 3 — Weight and speed

- `public/hero/hero-garden.png`: 2,137.5 KB to 100.6 KB as WebP q82, measured.
  It is the front door's LCP image, a photograph stored as PNG at 1247x696. The
  18 category JPGs give a further 319 KB.
- The attribute pass on 39 raw `img` tags: `loading="lazy"` below the fold
  (there is currently one lazy attribute in the whole codebase),
  `fetchPriority="high"` on the hero, intrinsic dimensions on the 24 that carry
  none. CLS measures 0.0000 today only because the Tailwind aspect classes
  happen to reserve the box; the attributes should make that certain.
- `loading.tsx` and `error.tsx` for `/` and `/rentals`, and `Suspense` around the
  database-dependent sections. There is no Suspense boundary anywhere in the app
  today, so `force-dynamic` makes the whole document wait on Neon — the measured
  3,875ms TTFB on the front door is the browser being shown nothing at all. The
  error state should carry the phone number: the shop's real fallback when
  software fails is a call.

### Stage 4 — Findability

`robots.ts`, `sitemap.ts` (disallowing `/admin`, enumerating slugs from
`getRentals()`), Open Graph tags with a real image — every WhatsApp share of this
shop currently shows a bare URL, and WhatsApp is how these customers send links.
Plus the two double-suffixed titles, the four routes serving the root
description, the 16 empty alt attributes that need either `aria-hidden` or a
sentence, and a privacy section on `/policies`, which the already-shipping cookie
banner requires.

### Stage 5 — Deploy

`wrangler login`, both gates green, ship. Blocked today only on the expired token.

## 4. Anti-goals

Real work, deliberately not in this roadmap, because none of it stops a shopper
contacting the shop about a garment:

- The booking engine and the thank-you page. Phase 2, and Stage 2 is explicitly
  designed so that nothing has to be unsaid when they land.
- Re-opening the navigation-depth redesign — filtering tiles in place, a sticky
  jump to the collection, moving the rooms. Section 2 dissolves the symptom; the
  rooms stay where the owner put them on 9 Sep.
- Analytics. The consent gate stays empty until there is a reason to measure.
- `aria-invalid` on the admin forms, the favicon set, owner photography.
- Any new page, any new section, any new motion device.

## 5. Open decisions a builder must not invent

- The real phone number and address (Stage 0) come from the owner. Never invent
  a plausible one; the placeholder degrade exists precisely so the site is honest
  while they are missing.
- The Room II purchase figure stays `TODO(owner)`.
- Request copy stays as `REQUEST_NOTICE` words it. A request is not a
  reservation, and no button anywhere may imply otherwise before Phase 2.
