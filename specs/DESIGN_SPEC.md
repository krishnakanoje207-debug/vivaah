# Vivaah Design-Language Spec (F6) — v1.0

**Governing principle (user directive): subtle yet extremely beautiful.** Quiet luxury, not decoration. The lehengas are the ornament; the site is the silk it rests on. Every rule below exists to enforce restraint: if a choice feels "impressive", pick the quieter option. Opus: follow this exactly; do not invent colours, fonts, shadows, or animations not listed here.

---

## 1. Palette

Derived from the hero frames (dusk sky, marigold garlands, rose petals, fairy lights) but **desaturated for UI use** — the anime hero is the only place full saturation appears.

### Tokens (Tailwind v4 `@theme`)

```css
@theme {
  /* Dusk — the brand neutral (purple-ink, NOT vivid purple) */
  --color-dusk-950: #14111F;  /* hero/night section bg */
  --color-dusk-900: #1C1830;  /* dark section bg */
  --color-dusk-800: #262040;  /* dark elevated panels */
  --color-dusk-700: #332B52;  /* dark borders/hover */
  --color-dusk-500: #5D5382;  /* muted text on dark, icons */
  --color-dusk-300: #A79FC2;  /* secondary text on dark */
  --color-dusk-100: #E9E6F2;  /* tinted surfaces on light */

  /* Silk — warm off-whites; the default page background */
  --color-silk-50:  #FBF8F3;  /* page bg */
  --color-silk-100: #F6F1E9;  /* cards, panels */
  --color-silk-200: #EDE5D8;  /* borders, dividers, hover fills */

  /* Ink — text on light */
  --color-ink-900: #211D2E;   /* headings, body */
  --color-ink-600: #5A5468;   /* secondary text */
  --color-ink-400: #8B8598;   /* placeholders, captions */

  /* Marigold — THE accent. One per view. */
  --color-marigold-600: #C0761B; /* primary CTA bg, links, active states */
  --color-marigold-500: #D98A2B; /* hover of CTA on dark, highlights */
  --color-marigold-100: #F7E8D2; /* subtle selected-fill on light */

  /* Gold — hairlines & ornaments ONLY (never fills, never text blocks) */
  --color-gold-400: #C9AC6E;

  /* Rose & red — editorial garnish, small doses */
  --color-rose-500: #B76477;   /* badges ("Bridal pick"), rare heading accents */
  --color-red-700:  #8E3B4A;   /* destructive actions, error text */

  /* Semantic */
  --color-success: #4E7D5B;    /* available dates, confirmed */
  --color-warning: #A8742F;    /* pending verification */
  --color-danger:  #8E3B4A;    /* booked/unavailable, errors */
}
```

### Usage rules (this is what makes it subtle)
- **90/8/2 rule:** ≥90% of any viewport is silk/dusk neutrals; ~8% muted supporting colour; ≤2% marigold. **One marigold element per view** (the primary CTA). If two things want marigold, the second becomes an outlined ghost button.
- Gold appears only as **1px hairlines** (section dividers, card top-borders, focus rings on dark) and tiny ornaments (4px diamond ✦ separators). Never as button fills or large text.
- Rose/red never sit next to marigold in the same component.
- Dark sections (dusk-950/900) get a **2% film-grain noise overlay** (inline SVG feTurbulence, `opacity:.02`) to feel like velvet, not flat vector. Light sections get none.
- Product photos always sit on silk-100 panels — never on dark or saturated backgrounds; the garment must be the most colourful thing on screen.

### Contrast pairs (WCAG AA verified — use only these text/bg combos)
ink-900 on silk-50/100 · ink-600 on silk-50 · silk-50 on dusk-950/900 · dusk-300 on dusk-950 · marigold-600 on silk-50 (large text/links only) · ink-900 on marigold-500 (CTA) · silk-50 on red-700.

## 2. Typography

- **Display: Fraunces** (Google Fonts, variable — use `opsz` auto, weight **340–420 only**; light weights are the elegance). Headings never bold. `letter-spacing:-0.01em` above 40px. Italic Fraunces for editorial accents ("*the* bridal edit") — max one italic word-group per section.
- **Body/UI: Inter** (400/500; 600 only for prices and buttons). Body `line-height:1.65`, ink-600 for paragraphs, ink-900 for emphasis.
- **Hindi:** pair with **Noto Serif Devanagari** (display) + **Mukta** (body) via `:lang(hi)` font stacks — set this up in P0.2 even though the toggle ships later.
- Fluid scale (clamp): h1 40→64 · h2 30→42 · h3 22→28 · body 16→17 · caption 13. No font sizes outside the scale.
- Numerals in prices/calendars: `font-variant-numeric: tabular-nums`.
- ALL-CAPS only for 11px letter-spaced (0.12em) eyebrow labels above headings, ink-400/dusk-300.

## 3. Space, radius, elevation

- 8px base grid. Section vertical padding: **py-24 mobile → py-36 desktop** (generous air is the luxury signal). Content max-width 1200px; product grids 2-col mobile / 3-col desktop with 24–32px gutters, never 4-col (cards stay large).
- Radius: cards/panels **14px**, buttons/inputs **10px**, pills/swatches full. One radius language everywhere.
- Shadows (only these two): card `0 1px 2px rgba(23,20,35,.05), 0 12px 32px rgba(23,20,35,.07)`; hover/modal `0 16px 48px rgba(23,20,35,.14)`. No coloured glows.
- Borders: 1px silk-200 on light, 1px dusk-700 on dark. Hairline gold reserved per §1.

## 4. Motion language (GSAP)

Subtle = felt, not noticed. Defaults:
- Reveal-on-scroll: `opacity 0→1, y 14→0`, **0.7s, power2.out**, stagger 70ms, trigger at 80% viewport, once only. Never scale/rotate/blur reveals.
- Hover: 180ms ease-out; cards lift `y:-3px` + hover shadow; images inside cards scale **max 1.03** with overflow hidden; buttons darken one step (no transforms).
- Scroll-scrub belongs to exactly two things: the **hero** and the **360 spin-on-scroll cards**. Nothing else scrubs; no parallax backgrounds.
- Hero text/CTA: fade+rise 0.9s after camera settles (~5.7s), gold hairline draws in (scaleX 0→1, 0.6s) under the heading.
- Page transitions: none (App Router default). Loading states: 300ms skeleton shimmer in silk-200.
- `prefers-reduced-motion`: all reveals render final-state; hero shows poster still; viewer remains drag-only.

## 5. The design bridge (anime hero → real products)

The one hard problem: a saturated anime film must hand off to real product photos without feeling like two websites.
1. **Dusk veil:** hero (dusk-950) ends in a 160px gradient into silk-50; a 1px gold hairline with a centred ✦ marks the seam. The first product section ("Featured lehengas") begins inside that gradient, so the eye travels dark→light in one scroll.
2. **Echoed palette, not echoed style:** UI marigold/rose/gold are the hero's colours desaturated ~30%. The hero stays the only saturated element.
3. **Recurring motifs** carry the thread: gold hairlines, ✦ separators, Fraunces italic accents, grain on dark sections — present in both worlds.
4. Footer + testimonials return to dusk-900 (dark bookends: dark hero → light body → dark close).

## 6. Component idioms

- **Primary button:** marigold-600 bg, ink-900 text, 10px radius, px-6 py-3; hover → marigold-500 (dark) / -700-tone darken (light). **Ghost button:** 1px ink-900/silk-50 border, transparent.
- **Product card:** silk-100 panel, 14px radius, 4:5 image, name (Fraunces 22), price row (Inter 600 tabular), rose badge top-left when flagged. Rental cards host the spin-on-scroll canvas.
- **Swatch dots:** 14px circles, 1px ink-400 ring; active = 2px marigold ring + 2px offset; sold-out = 40% opacity + diagonal strike; ≥44px tap target.
- **Calendar days:** free = silk-50/ink-900; booked = silk-200 bg, ink-400 strikethrough; held/pending = warning-tint marigold-100; buffer = dotted silk-200 (tooltip "prep day"); selected range = marigold-100 fill with marigold-600 endpoints. Legend always visible.
- **360 viewer:** silk-100 stage, no border; pill hint "⟵ drag ⟶" ink-400 fades after first drag; thin gold arc indicator (stroke 2px) shows position — clamped arcs show partial arc honestly. No chrome buttons.
- **Sticky date bar (product page):** silk-50/90% blur backdrop, hairline bottom border, dates + one marigold "Check availability" CTA.
- **Forms:** silk-50 inputs, 1px silk-200 border → marigold-600 border on focus (no glow), labels 13px ink-600 above. Errors red-700 text + border, message under field.
- **Toasts/status:** ink-900 bg, silk-50 text, bottom-centre, 14px radius, auto-dismiss 4s.
- Focus-visible everywhere: 2px marigold-600 ring (light) / gold-400 (dark), 2px offset.

## 7. Imagery & content tone

- Real photography: consistent studio-grey/silk seamless (matches `tools/` prep pipeline), no filters, no AI upscaling artefacts on product truth-images.
- The WAN beauty clips (when they exist) render inside the same silk-100 card stage as the viewer — garnish, clearly separate from the accurate 360.
- Copy tone: warm, unhurried, few words. Headings ≤6 words. No exclamation marks, no "WOW", no emoji in UI copy (WhatsApp messages may use sparing emoji).

## 8. Acceptance checklist for P0.2 (Opus, verify before deploy)

- [ ] Only tokens from §1 exist in CSS (grep for stray hex values).
- [ ] One marigold element per viewport at every scroll position of the homepage.
- [ ] Dark sections have grain; light sections don't.
- [ ] Fraunces ≤420 weight; no bold headings anywhere.
- [ ] Reveals: opacity+14px rise only; nothing else animates on scroll except hero + spin cards.
- [ ] AA contrast holds in both `:lang(en)` and `:lang(hi)` font stacks.
- [ ] `prefers-reduced-motion` renders a fully static, complete page.
