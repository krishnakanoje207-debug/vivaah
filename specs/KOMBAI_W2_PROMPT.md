# W2 — /jewellery re-skin: Kombai task prompt (paste when credits refill)

Prepared 18 Jul 2026 (Fable). The 17 Jul master prompt lived only in that session's
context; this reconstructs it page-scoped for W2 per CATEGORY_IMMERSION_PLAN.
Paste everything between the rules into Kombai. Review afterwards with the
checklist at the bottom (ours, not Kombai's).

---

Re-skin the `/jewellery` page (`site/app/jewellery/page.tsx`) of this Next.js 16
App Router site to match the site's shipped "Editorial Luxe" idiom. It is currently
a `ComingSoon` stub; elevate it into a beautiful editorial teaser page. The
jewellery catalogue and booking arrive in a later phase — this page stays a
pre-launch teaser, no booking UI, no product grid.

**Idiom to match (see `site/app/visit/page.tsx` and `site/app/policies/page.tsx`
as the reference implementations):**
- `bg-porcelain-50` page, `shell` container, generous `pt-28/pb-28 md:pt-32/pb-36`.
- Editorial header: `eyebrow` class, `text-h1` Fraunces heading with exactly one
  `<em className="italic">` accent word, supporting paragraph in `text-ink-600`.
- Reuse existing components: `Reveal` (with `data-reveal` on children), `Ornament`
  (gold hairline), `Button` (`variant="primary"` = violet-800, never amber/orange).
- Palette discipline: ≥90% porcelain/violet neutrals, ~8% violet tints, ≤2% gold.
  Approved text/bg pairs only: ink-900 or ink-600 on porcelain; porcelain-50 on
  violet-950/900/800; gold-600 on porcelain (16px+/500 weight); gold-500 on dark violet.
- Content direction: jewellery is rented, usually paired with an outfit for the
  same dates. Tease that ("complete the look" voice), invite visitors to see
  pieces in person at the shop. CTA → `/visit` ("Book a trial" anchor works too);
  secondary link → `/rentals`. Keep `metadata.title = "Jewellery on rent"`.
- A dark violet-900/950 panel section is welcome as contrast (max one gold-on-dark
  button), matching the site's dark-bookend rhythm.

**Hard constraints — violating any of these fails the task:**
1. **No stock imagery of any kind.** No `<img>`/`<Image>` pointing at unsplash,
   pexels, or any external URL; no new image files. This page ships image-free
   (typographic/editorial treatment) until owner photography arrives. Existing
   self-hosted assets under `site/public/` may be reused if genuinely fitting.
2. **Female only.** This shop serves women's occasion wear and jewellery. All
   copy, imagery (if any self-hosted asset is reused), and voice address women —
   bridal and festive jewellery for her. No male models, no groom/men's-wear
   content or references anywhere on the page.
3. Do not touch `site/lib/categories.ts`, any slug, or any file outside
   `site/app/jewellery/` other than (if needed) one new component in
   `site/components/site/`.
4. Do not run `npm run build`, `npm run dev`, or anything that writes `site/.next`.
5. No new dependencies, no new fonts (Fraunces + the body font are loaded).
6. Fraunces never bold (weight 340–420); italics for one accent per section.

---

## Post-pass review checklist (7c57c05 lessons)
1. `rm -rf site/.next` before judging any breakage; restart dev.
2. `grep -rn "unsplash\|pexels\|images\." site/app/jewellery site/components/site/` — zero hits for external URLs.
3. `git diff --stat` — only jewellery page ± one new component; diff `lib/categories.ts` must be empty.
4. Headless-Edge screenshots 1440×900 + 390×844 **with `--force-prefers-reduced-motion`**; check contrast pairs, no dark-on-dark text.
5. Female-only check: `grep -rni "groom\|men's\|for him\|sherwani" site/app/jewellery site/components/site/` — zero hits; any reused imagery shows women's wear only.
6. DESIGN_SPEC §8 acceptance checklist pass.
