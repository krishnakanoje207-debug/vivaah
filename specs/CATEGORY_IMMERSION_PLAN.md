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

### W1 — /visit + /policies re-skin (Claude, no credits) — *option 3, my half*
Match the shipped Editorial Luxe idiom: editorial headers with Fraunces italics, gold hairlines, arch map frame on /visit, staggered rhythm. No logic changes. /visit also hosts "Book a trial" targets from the hero + nav — keep anchors working.

### W2 — /jewellery re-skin (Kombai, when daily credits refill) — *option 3, Kombai's half*
One page-scoped Kombai task; reuse the master-prompt constraints from this session **plus**: no stock imagery (it violated this — enforce hard), don't touch slugs, don't run builds (shared `.next`). Review with the 7c57c05 checklist after.

### W3 — Sarees flagship section — **Fluid Saree template**
A full-viewport (100svh) immersive homepage section for sarees, harvested from the Fluid Saree variant: its softer/fluid art direction, gold-pill CTA, italic display headings. Placement: after featured rentals, before how-it-works. CTA → `/rentals?category=sarees` (slug is load-bearing). Imagery: owner photography or WAN-generated stills only.

### W4 — Lehengas flagship section — **Editorial Luxe + video, "fully immersed"**
The shipped 60/40 split-hero treatment (video block + editorial copy column + gold hairline separator) repurposed as a 100svh homepage section for lehengas. **Video dependency**: generate a lehenga beauty clip via **WAN 2.1 I2V on free Colab** (`tools/wan_i2v_colab.ipynb`) seeded from the owner's real lahenga1 frames (`videos/lahenga1/`) — brand-accurate, ₹0, no stock. Encode play-once→ping-pong per IMPLEMENTATION_PLAN §5 (same as hero). GTX 1650 never renders locally. CTA → `/rentals?category=bridal-lehengas`.
Ordering: W3 (sarees) then W4 (lehengas) back-to-back but with distinct art direction so they read as two curated rooms, not a repeated component.

### W5 — "Curated for your moment" section on each category page
Categories are **query-param filters** on /rentals and /retail (no per-category routes yet). Implement as a parameterized section on both gallery pages that renders when `?category=` is active: Fluid-Saree-style editorial intro ("Curated for your most memorable moments" voice) with the category name in Fraunces italic + supporting copy per category. If the owner later wants real category landing routes, this section becomes their hero — build it as a standalone component (`CuratedMoment.tsx`) so it lifts cleanly.

### W6 — "Browse by occasion" big-card section on the homepage
Replace the current occasion **chips** section with the Fluid Saree big-card version (kids `4-2-*`): three full-image cards (Bridal / Reception / Sangeet), porcelain-50 display titles, violet gradient scrims, arch tops per §3b. Links stay `/rentals?occasion=…`. Until owner photos exist, cards use violet-900 grain + gradient placeholders — **no stock**.

## Order & verification
W1 → W6 → W3 → W4 (video is the long pole — start the Colab run early, build W4 around the placeholder still until clips land) → W5. W2 rides Kombai's credit refills in parallel.
Every item: headless-Edge screenshots at 1440×900 + 390×844, **with `--force-prefers-reduced-motion` for final-state checks** (GSAP reveals capture at opacity 0 otherwise), plus DESIGN_SPEC §8 checklist. Delete `site/.next` before diagnosing any weird 404s if Kombai ran meanwhile.

## Open items for the owner (unchanged from 7c57c05)
- Split hero vs full-bleed §5a (the homepage hero itself).
- Kombai's copy voice ("bridal glow", "boutique", "perspectives").
