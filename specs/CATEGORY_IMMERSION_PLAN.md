# Category Immersion Plan (F7) — sarees & lehengas flagship sections + Kombai canvas harvest

**Agreed 17 Jul 2026 (late night) with the user. Supersedes nothing — extends DESIGN_SPEC v2; all v2 tokens/rules apply unchanged.**

## Source designs — `.kombai/canvas/homepage.canvas`

The canvas file is an **HTML document** (despite the extension) holding three labelled homepage variants: `Editorial Luxe` (shipped, commit 7c57c05), `Fluid Saree`, `Minimalist Gallery`. Markup is inline with `data-kid` node ids and human-readable `data-name` attributes — extract sections by grepping `data-name`, not by parsing JSON.

Known landmarks (verified 17 Jul):
- **Fluid Saree hero**: kid `1-1-*` — description "Premium bridal and festive wear **curated for your most memorable moments**", gold-500 CTA pill (`rounded-[10px]`, violet-950 text) — the poster pairing.
- **Fluid Saree "Browse by occasion"**: heading kid `1-4-1-2` (h2, `font-display italic`); the **big-card version** is kids `4-2-*` — full-bleed image cards titled Bridal / Reception / Sangeet in porcelain-50 `text-4xl font-display` over dark imagery.
- Jharokha arch radius reappears in canvas (`50% 50% 14px 14px / 18% 18% 14px 14px`) — variants stay on-motif.
- ⚠️ Canvas markup embeds **stock imagery** — re-strip on every harvest (same rule as the 7c57c05 review): grep `unsplash|pexels` before committing anything extracted.

## Work items

### W0 — Revert homepage hero to full-bleed (owner decision 17 Jul) — **added 17 Jul**
Owner: the Kombai 60/40 split hero "looks messy" — restore the **Preview 1 full-bleed hero** (`Hero.tsx` as of commit `efe43b4`: media stack absolute behind overlaid copy, R1.1 autoplay-retry + no-flash loop swap, reduced-motion still). Resolves the §5a split-vs-full-bleed open item: **full-bleed**. ⚠️ The Kombai pass also touched `Nav.tsx` (over-dark detection) and `page.tsx`; keep the old hero's copy (not Kombai's "bridal glow" voice). *(Correction 18 Jul: the restored hero DOES carry `-mt-16` — the seam was screenshot-verified clean with Nav's over-dark detection, so this is fine as shipped.)*

### W1 — /visit + /policies re-skin (Claude, no credits) — *option 3, my half*
Match the shipped Editorial Luxe idiom: editorial headers with Fraunces italics, gold hairlines, arch map frame on /visit, staggered rhythm. No logic changes. /visit also hosts "Book a trial" targets from the hero + nav — keep anchors working.

### W2 — /jewellery re-skin (Kombai, when daily credits refill) — *option 3, Kombai's half*
One page-scoped Kombai task; reuse the master-prompt constraints from this session **plus**: no stock imagery (it violated this — enforce hard), don't touch slugs, don't run builds (shared `.next`). Review with the 7c57c05 checklist after.

### W3 — Sarees flagship section — **Fluid Saree template**
A full-viewport (100svh) immersive homepage section for sarees, harvested from the Fluid Saree variant: its softer/fluid art direction, gold-pill CTA, italic display headings. Placement: after featured rentals, before how-it-works. CTA → `/rentals?category=sarees` (slug is load-bearing). Imagery: owner photography or WAN-generated stills only.

### W4 — Lehengas flagship section — **full-bleed video, "fully immersed"**
**(Re-art-directed 17 Jul twice: owner rejected the 60/40 split as "messy" — see W0 — and retired ALL WAN/Colab generation. No video dependency.)** Full-bleed 100svh homepage section for lehengas built on the **owner's real lahenga1 frames** (the watermark-cleaned viewer frames — brand-accurate, actual inventory, ₹0): a light **porcelain stage room** (the reference look the owner loves — garment on seamless near-white stage, studio vignette) as deliberate contrast to W3's dark saree room. Motion: subtle only (slow Ken Burns scale, or the SpinViewer's pendulum in auto mode if trivially reusable — no new media generation). CTA → `/rentals?category=bridal-lehengas`.
Ordering: W3 (sarees) then W4 (lehengas) back-to-back but with distinct art direction so they read as two curated rooms, not a repeated component.

### W5 — "Curated for your moment" section on each category page
Categories are **query-param filters** on /rentals and /retail (no per-category routes yet). Implement as a parameterized section on both gallery pages that renders when `?category=` is active: Fluid-Saree-style editorial intro ("Curated for your most memorable moments" voice) with the category name in Fraunces italic + supporting copy per category. If the owner later wants real category landing routes, this section becomes their hero — build it as a standalone component (`CuratedMoment.tsx`) so it lifts cleanly.

### W6 — "Browse by category" big-card section on the homepage
**(User corrected 17 Jul: category cards, not occasion cards.)** Use the Fluid Saree big-card treatment (kids `4-2-*` show the pattern: full-image cards, porcelain-50 display titles, dark scrims) but populate with **categories**, arch tops per §3b, links `/rentals?category=…` / `/retail?category=…`.
**Implementation approved 18 Jul** — shipped as two horizontal scroll-rails (rent/own) of arch cards rather than a big-card grid; owner reviewed and approved ("category showcase is alright") — do not rework toward the canvas big-card layout.
**Thumbnails: DONE 17 Jul** — all 16 categories have self-hosted images in `site/public/categories/<slug>.jpg` (660×880, 3:4). Curated from the Kombai canvas image pool (11) + Pexels API search (5: short-kurtis, co-ord-sets, night-suits, kurta-pant-sets, kaftans). Licenses + source URLs in `public/categories/SOURCES.md`; user explicitly approved stock-as-placeholder, overriding §7 — swap for owner photography later. The gallery-page arch tiles already render them via `Category.image`.

## Order & verification
W1 → W6 → W3 → W4 (video is the long pole — start the Colab run early, build W4 around the placeholder still until clips land) → W5. W2 rides Kombai's credit refills in parallel.
Every item: headless-Edge screenshots at 1440×900 + 390×844, **with `--force-prefers-reduced-motion` for final-state checks** (GSAP reveals capture at opacity 0 otherwise), plus DESIGN_SPEC §8 checklist. Delete `site/.next` before diagnosing any weird 404s if Kombai ran meanwhile.

## Open items for the owner (unchanged from 7c57c05)
- Split hero vs full-bleed §5a (the homepage hero itself).
- Kombai's copy voice ("bridal glow", "boutique", "perspectives").
