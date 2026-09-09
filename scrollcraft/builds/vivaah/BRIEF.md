# BRIEF — Vivaah Dresses and Suits

Status: **partially interviewed, 8 September 2026.** Answered topics carry the
user's own words. Open topics are marked OPEN and must be filled before Step 2
(grammar, gate, score). Authored decisions are labelled as such.

Build: full public-frontend rebuild of a LIVE site
(https://vivaah.vivaah.workers.dev), Next.js 16 + Tailwind v4 on Cloudflare
Workers. The admin panel at /admin is out of scope and is not touched.

---

## 1. Vibe, and references

References supplied (all sites, which the skill warns against, so they are
treated as *evidence of taste* and not as things to reproduce):

- locomotive.ca preloader: black ground, white wordmark, centred, holds then releases.
- locomotive.ca cookie panel: black panel, high-contrast serif heading, two hard-edged buttons, underlined secondary links.
- store.locomotive.ca: calm uniform product grid, plain price and stock status, slide-in cart drawer, no decoration competing with product.
- A photo-to-line-drawing split image (interior render dissolving into a blueprint/technical drawing across a diagonal seam).
- SVGator self-drawing stroke animation, example 4 (a shipping/logistics line illustration that draws itself).

User's own words on the palette question: *"well some components can be black
if needed if black isnt needed dont add, the current colour scheme suits the
site just as good."*

User's own words on type: *"we can keep fraunces, but didone is better choice we
can go with it too."*

**AUTHORED READ.** The through-line in those five references is not "black" and
it is not "Locomotive". It is **drawn line as a language**: a wordmark that
draws itself, a garment that resolves into its own pattern draft, a stroke that
completes to confirm something. That is the vibe to build, and it happens to be
true about the business, which cuts and fits real garments.

Vibe, authored, five words: **drawn, couture, unhurried, exact, ceremonial.**

## 2. The scroll journey

OPEN. The user has not given a section-by-section sequence in their own words.
Required before Step 2.

## 3. The energy curve

OPEN.

## 4. Feeling, stage by stage, and the ONE moment

OPEN. The peak is not yet chosen. Candidate seeded by reference 4 below.

## 5. The one thing no other site does

Seeded, not confirmed. Candidate: **the pattern-draft seam.** A flagship garment
photograph resolves into its own technical line drawing (the cut, the panels,
the embroidery placement) under the visitor's control, then resolves back. It
says "we know how this is made", which is the belief a rental shop needs to
install to justify its prices. No competitor in Indian bridal rental is doing it.

Derivation is local and free: edge-detect plus threshold in Pillow over the
owner's own photography, then hand-cleaned. Viable for 3 to 5 flagship pieces.
NOT viable site-wide across ~100 products, and it should be rare anyway.

## 6. Distance from premium-minimal

AUTHORED, from evidence. **Editorial, leaning premium-minimal.** The owner's
standing rejection of "generic AI-template" (DESIGN_SPEC v2) rules out
maximalist and playful. The Locomotive references rule out anything decorative.

## 7. One unbroken world, or distinct scenes?

OPEN, and this is the biggest structural fork. Note that the business has three
genuinely separate rooms (rentals, retail, jewellery), which argues against one
unbroken flight. The skill also bans the continuous chain unless the brief
literally demands it.

## 8. Assets

**Owned, already on disk:**
- `videos/heroSection/` — 151 hero frames, 720p, KlingAI watermark bottom-right (crop or overlay needed).
- `videos/lahenga1/` — 87 frames, ~225 degree arc, feeds the existing pendulum spin viewer.
- 16 curated self-hosted category images.
- 5 demo products in Neon. Stock placeholders still standing in for owner photography.

**Generation route: Google Flow, 250/day, user-driven.** The user generates from
prompts written here and returns the sources. kie.ai is NOT used: it costs
credits and the project is locked to zero rupees per month.

**Missing and blocking:** the owner's logo file (`site/public/brand/`). The
preloader concept depends on it. Interim: a drawn typographic wordmark.

---

## Locked project law this build inherits

- Palette stays **DESIGN_SPEC v2**: violet, gold, porcelain, on a **light**
  porcelain ground. Dark (violet-950) is used only where it earns its place, per
  the user: if black is not needed, do not add it.
- **90/8/2**: at least 90% porcelain and neutrals, about 8% violet tints, at
  most 2% gold. Gold is the jewellery of the UI, not a highlighter.
- **Female-only content.** Every prompt, image, clip and line of copy addresses
  women. No male models, no groom content.
- **Zero rupees per month, commercial use must be permitted** on every tool and
  asset in the chain.
- **No shipping.** Retail is reserve and collect at the shop. The vocabulary is
  reservation and pickup, never cart, checkout, delivery or order tracking.
- Payments are UPI plus a customer-submitted UTR, verified by hand in admin.
- Double-booking is prevented by a Postgres GiST exclusion constraint, never in
  application code.

## Authored decisions taken under the user's delegation

The user wrote: *"you can also add your own transitions and effects that could
look good and fit the category."* That delegates the motion vocabulary, and
nothing wider. It does not delegate the journey, the peak, or the structural
fork in topic 7.

1. **Display face becomes a Didone**, per the user's answer. Bodoni Moda or
   Playfair Display, both variable, both free for commercial use, both
   self-hosted through next/font. Fraunces is retired from display to avoid
   running two competing serifs. This is a DESIGN_SPEC change and is recorded
   as such.
2. **Preloader is once per session, capped, and skipped on deep links** and
   under reduced motion. It resolves into the nav wordmark rather than curtaining
   up on the hero.
3. **The cookie panel is built but not mounted** until an analytics script
   actually exists to withhold. The site currently sets one strictly necessary
   admin session cookie, which is consent-exempt. Shipping a consent banner now
   would advertise tracking that is not happening.
4. **Heading distortion is SVG feTurbulence plus feDisplacementMap**, not WebGL.
   Desktop pointer only, off on touch and under reduced motion, on two or three
   headings, never all of them. The audience is largely mid-range Android.
5. **The self-drawing stroke technique is reassigned** from the reference's
   delivery truck (there is no delivery) to the preloader wordmark, the
   "reserved, collect on <date>" confirmation, and the 404.

## Open questions blocking Step 2

Topics 2, 3, 4 and 7. Until they are answered the feeling curve cannot be
written, and the skill forbids planning acts before the curve exists.
