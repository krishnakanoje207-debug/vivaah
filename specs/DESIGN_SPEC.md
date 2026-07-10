# Vivaah Design-Language Spec (F6) — v2.0

**v2 supersedes v1 after owner review of Preview 0.** Verdict on v1: well-built but **generic — "AI-made website vibes."** Root cause: the warm-beige + orange-CTA combination is the default aesthetic of a thousand template sites. v2 keeps what the owner liked (**the purple**) and rebuilds the rest around the shop's own poster: **violet, gold, white.**

**Governing principle (unchanged): subtle yet extremely beautiful — and now, unmistakably *this shop's*.** Every generic choice is a defect. When in doubt, ask: "would this exact element appear on any Tailwind template?" If yes, change it.

Brand facts: full name **“Vivaah Dresses and Suits”** — rentals (many categories), retail, and jewellery. Logo asset incoming from owner; Nav/Footer/metadata get a logo slot (text wordmark until the file arrives).

---

## 1. Palette — violet · gold · porcelain

Sources: the shop poster (violet/gold/white) and the reference product stage (near-white gallery grey). **Marigold, warm silk-beige, and rose are REMOVED** — they were the generic part.

```css
@theme {
  /* Violet — the brand pillar (kept from v1 feedback: "I like the purple") */
  --color-violet-950: #191129;  /* hero/night bg */
  --color-violet-900: #221636;  /* dark sections */
  --color-violet-800: #2F1E4D;  /* PRIMARY BUTTON bg, dark panels */
  --color-violet-700: #40296A;  /* button hover, dark borders */
  --color-violet-500: #6E56A6;  /* muted royal — icons, secondary on dark */
  --color-violet-300: #B3A4D6;  /* secondary text on dark */
  --color-violet-100: #EDE9F7;  /* tints, selected fills, badges on light */

  /* Porcelain — cool gallery neutrals (replaces warm silk) */
  --color-porcelain-50:  #FAFAF7;  /* page bg */
  --color-porcelain-100: #F2F1EC;  /* cards, panels */
  --color-porcelain-200: #E4E2DA;  /* borders, dividers */
  --color-stage:         #ECEBE7;  /* product stage — sampled to blend with the
                                      turntable frames' studio grey so garment
                                      photos sit seamlessly (reference-image look) */

  /* Ink — violet-cast text on light */
  --color-ink-900: #241D31;
  --color-ink-600: #5D5668;
  --color-ink-400: #8E8798;

  /* Gold — THE accent (antique, from the poster). Links, eyebrows, active
     states, hairlines, ornaments. Never large fills, never body text. */
  --color-gold-600: #A9853A;   /* links/accents on light (AA at 16px+) */
  --color-gold-500: #C2A155;   /* accents on dark, hover */
  --color-gold-100: #F4EEDC;   /* tint fills */

  /* Semantic (muted, cool-cast) */
  --color-success: #4C7A5E;
  --color-warning: #A07C2E;
  --color-danger:  #8C3A4C;    /* also destructive/error */
}
```

### Roles (this is the de-generic move)
- **Primary button = violet-800 with porcelain-50 text** (hover violet-700). NOT an orange/amber CTA — that was the template tell. On dark surfaces the primary button is gold-500 bg + violet-950 text (the poster pairing), max one per view.
- **Gold is the jewellery of the UI**: eyebrows, links, hairlines, the ✦, arc indicator, active states. ≤2% of any viewport.
- **90/8/2 rule stays**: ≥90% porcelain/violet neutrals · ~8% violet tints · ≤2% gold.
- Badges: violet-100 bg + violet-700 text (no rose).
- Dark sections keep the **2% grain**; light sections none.
- Product imagery always on `stage`/porcelain — garment is the only saturated thing on screen (reference-image discipline).

### Contrast pairs (AA — use only these)
ink-900 on porcelain-50/100/stage · ink-600 on porcelain-50 · porcelain-50 on violet-950/900/800 · violet-300 on violet-950/900 · gold-600 on porcelain-50 (≥16px or 500 weight) · gold-500 on violet-950/900 · violet-950 on gold-500 · porcelain-50 on danger.

## 2. Typography

- **Display: Fraunces** (unchanged — it's already distinctive; weight 340–420, never bold, `opsz` auto, italics for one editorial accent per section).
- **Body/UI: Instrument Sans** (Google, variable) — replaces Inter. Inter is the single most template-flavoured font on the web; Instrument Sans keeps the same clarity with more character. Weights 400/500; 600 only prices/buttons. Fallback stack keeps Inter → system.
- **Hindi:** Noto Serif Devanagari (display) + Mukta (body) via `:lang(hi)` — unchanged.
- Scale, tabular numerals, 11px/0.12em eyebrows — unchanged from v1.

## 3. Space, radius, elevation — unchanged from v1
(8px grid, py-24→36 sections, 1200px shell, 14px cards / 10px controls, the two shadows, 1px porcelain-200 borders on light / violet-700 on dark.)

### 3b. Signature motif — the jharokha arch (use with restraint)
One recurring shape that no template has: gallery/featured card images get a **soft arch top** (`border-radius: 50% 50% 14px 14px / 18% 18% 14px 14px` — a gentle mehrab curve, not a horseshoe). Applies to: featured-card images, category tiles, the /visit map frame. Does NOT apply to: the product-page stage (full-bleed), admin, forms. If it ever appears more than ~6 times in a viewport, reduce.

## 4. Motion language — unchanged from v1 defaults
(0.7s power2.out reveals, 70ms stagger, 180ms hovers, scale ≤1.03, scrub only hero + spin stage, reduced-motion = final state.) Addition:
- **Product-stage auto-swing** (§5b): the garment swings through its arc autonomously — frame 0→N→0, sweep duration scales with the arc (≈7s per 90°; lahenga1's ~225° ≈ 16–18s), sinusoidal ease at the ends (a pendulum settling, not a metronome). Pauses on pointer-down; resumes after 3s idle. Reduced-motion: static front frame, drag still works.

## 5. Page anatomies

### 5a. Homepage — structure unchanged, re-skinned
Hero (violet-950 + video) → dusk veil into **porcelain-50** → featured (arch cards) → how-it-works → occasions → retail strip → dark visit bookend. Copy updated to the full brand: rentals **and** retail **and** jewellery (see REVISION_1 §2 for name/tagline).

### 5b. Product page — REBUILT (owner's vision, per reference image)
Two-act layout, both desktop and mobile:
1. **Act 1 — the stage (100svh):** the garment alone on `stage` bg, blending seamlessly with the frames' own studio grey. Auto-swing loop per §4. A small **circular drag glyph** (28px ring, gold-600 stroke, drag arrows) floats near the garment centre until first interaction. Minimal chrome: breadcrumb + name (small, top-left), scroll cue (thin gold chevron, bottom-centre). Nav transparent over this section. NO price, NO panel — the dress gets the whole screen.
   *Honesty note:* our current frames include the mannequin (no ghost-mannequin shoot yet), so the garment doesn't float like the reference — the seamless stage + auto-swing delivers the same feel. Revisit when reshoots happen.
2. **Act 2 — the details (scroll):** name (display), price/advance, date fields, description, **swipeable real-photo gallery** (scroll-snap x, edge-peek next photo, swipe on touch / drag or arrows on desktop — sourced from the turntable stills until real editorial photos exist), **customer reviews** (see §6), jewellery pairing strip, booking panel, trial CTA.
- Mobile: identical order; stage is still 100svh with swipe-to-rotate.

### 5c. Gallery pages — now category-first
/rentals and /retail open with their **category rows** (arch tiles with real counts); “All” grid below. Category chips become functional links. (Category lists live in REVISION_1 §5 / schema seeds.)

## 6. Component idioms — v1 rules carry over, with these changes
- **Primary button:** violet-800/porcelain-50 (§1 roles). **Ghost:** 1px ink-900/25 on light, porcelain-50/30 on dark (unchanged shape).
- **Swatches, calendar, forms, toasts, sticky date bar:** unchanged geometry; all marigold references become **gold-600** (active/focus) and violet-100 (selected fills). Focus rings: gold-600 on light, gold-500 on dark.
- **Spin viewer:** stage bg `--color-stage` (not porcelain-100); arc indicator + drag glyph gold; “N° view” caption stays honest.
- **Review block (new):** per product — average as gold ✦ marks (✦✦✦✦✧, never yellow stars), count, then quoted reviews on porcelain-100 cards: text, name, “verified renter” tag (violet-100 badge) when linked to a booking. Empty state: “Be the first to review after your event.” Admin moderates before display.
- **Jewellery cross-sell drawer (new):** when a rental garment is added to a booking, a **side drawer** slides in (right, 360px desktop / bottom-sheet mobile, porcelain-50, shadow-lift): “Complete the look” + jewellery available for the same dates, each with one-tap Add. Dismissible, never modal-blocking, appears once per booking flow.

## 7. Imagery & tone — unchanged, plus
- Stage/product shots keep the studio-grey continuity trick (§5b).
- The shop logo (incoming) renders in Nav (≤28px tall) and Footer; keep the wordmark spacing rules when it lands.

## 8. Acceptance checklist (Opus, verify before redeploy)
- [ ] Zero marigold/rose/silk-beige values anywhere; only §1 tokens exist in CSS.
- [ ] No orange/amber CTA anywhere; primary buttons are violet (gold only on dark, max one).
- [ ] Gold ≤2% of any viewport; one primary button per view.
- [ ] Product stage blends with frame bg (no visible rectangle seam around the garment photos).
- [ ] Auto-swing: sinusoidal ends, pauses on touch, resumes after 3s, reduced-motion static.
- [ ] Arch motif on gallery/featured/category tiles only — nowhere else.
- [ ] Instrument Sans loaded (body no longer Inter); Fraunces weights ≤420.
- [ ] Reviews render with gold ✦ (no yellow); drawer never blocks the booking CTA.
- [ ] AA pairs hold in EN and HI stacks; reduced-motion full page intact.
