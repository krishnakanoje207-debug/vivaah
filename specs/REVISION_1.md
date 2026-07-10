# REVISION 1 — owner feedback on Preview 0 (10 July 2026)

Owner reviewed Preview 0 and gave 8 corrections. This file is the **Opus work order**: R1.1–R1.6 below, in order, before Phase 1. Design rules live in `DESIGN_SPEC.md` **v2** (re-read it first — palette and product page changed substantially). Booking-adjacent behaviours (cross-sell drawer, reviews) are specced in `BOOKING_ENGINE_SPEC.md` §2.7–2.9 but their *backends* wait for their phases — this revision ships UI + stub data only where noted.

## Brand facts (correct everywhere — point 2)
- Full name: **“Vivaah Dresses and Suits”** (page titles, footer, metadata, JSON-LD later). Nav wordmark may show “Vivaah” with “Dresses & Suits” as a small under-line lockup — footer and titles always full name.
- The shop does **rentals (8 garment categories) + retail (8+ categories) + jewellery** — the old “bridal lehenga rental” framing is too narrow. Tagline must cover all three. Direction (Opus may polish): *“Bridal & festive wear to rent or buy — with jewellery to match.”*
- **Logo incoming** from owner (point 4): build the Nav/Footer slot now (renders text wordmark until the asset lands at `site/public/brand/logo.(svg|png)`; ≤28px tall in nav).

---

## R1.0 — Reprocess lahenga1: NEW FRAMES, ~225° arc (owner correction)
Owner replaced `videos/lahenga1` (10 Jul, 22:13) with `ezgif-frame-001..087.jpg` — a fuller extraction. Measured against clean anchors: frame 044 = right profile (90°), frame 072 = full back (180°) → ~2.5°/frame → frame 087 ≈ **~225° (back-left quarter)**. Owner recalls 270° from the source video; the extracted files stop short of the left profile — if tail frames are added later, re-run with `--arc 270`, nothing else changes.
Re-run: `python tools/arrange_360.py --in videos/lahenga1 --out site/public/rentals/lahenga1/360 --count 36 --arc 225 --no-loop --glob "ezgif-frame-*.jpg"` → verify endpoints (watermark gone, back dupatta trail unclipped), update `lib/rentals.ts` spin config from the new `metadata.json`, card badge copy → “Spin view”. The pendulum now shows front, sides, AND back — a real upgrade for renters.

## R1.1 — Fix hero playback (point 1) — DEBUG FIRST, in a real browser
Owner report: the hero “is not playing as we discussed” — expected smooth frame-motion playing ONCE, then only the tail frames looping. That IS the built design (`hero-intro.mp4` → seamless `hero-loop.mp4`), so this is a **runtime failure, not a design gap**. Debug in an actual browser with DevTools before changing code:
1. Network: do `/hero/hero-intro.mp4` + `hero-loop.mp4` return 200 with `video/mp4` and range support? Console errors?
2. Autoplay: does `intro.play()` reject? Current code silently falls back to the static still — which to a viewer looks exactly like “video not playing.” **Change the fallback:** retry `.play()` on first `pointerdown`/`scroll`/`touchstart`, and log the rejection reason during dev.
3. React StrictMode double-mount (dev): effect runs twice — ensure the second run doesn't restart/pause the intro mid-flight or leave `showLoop` inconsistent.
4. Crossfade: on `ended`, start the loop **before** fading (play loop → then swap opacity in the same rAF) so no flash of still; verify the intro's last frame == loop's first frame visually.
5. Verify on: Chrome desktop, Chrome Android, and with battery-saver on (a common autoplay blocker on laptops).
Acceptance: cold load on desktop + phone shows the intro playing immediately (poster only for the first instants), one play-through, then an invisible transition into the ambient loop, forever. Reduced-motion still gets the still.

## R1.2 — Rebrand pass (points 2 + 4)
Apply the brand facts above: `lib/site.ts` (name, tagline, nav), `layout.tsx` metadata, hero copy (“Bridal rental & boutique” eyebrow is fine; H1/subline must not read rentals-only), footer, /visit. Add the logo slot component.

## R1.3 — Re-skin to DESIGN_SPEC v2 (point 8)
Global: new tokens (violet/gold/porcelain — marigold/rose/silk deleted), primary buttons → violet-800, gold accents, body font → Instrument Sans, arch motif on featured/category tiles, stage colour for all product imagery panels. Run the v2 §8 acceptance checklist. Note: `lahenga1` frame WebPs are already neutral-grey — they sit on `--color-stage` without reprocessing; if a seam shows, re-run `tools/arrange_360.py` is NOT needed (tune the stage colour instead).

## R1.4 — Product page rebuild (points 3 + 7): two-act layout per DESIGN_SPEC §5b
- Act 1: 100svh seamless stage, auto-swing pendulum over the full ~225° arc (≈7s per 90° → ~16–18s sweep, sinusoidal ends, pause on pointer, resume 3s, reduced-motion static), circular gold drag glyph until first touch, minimal chrome, transparent nav.
- Act 2: details + **swipeable real-photo gallery** (scroll-snap, sourced from 4–6 of the turntable stills for now) + **reviews block with stub data** (2–3 sample reviews marked clearly as samples, gold ✦ marks, “verified renter” badge demo) + jewellery pairing strip (static cards for now — drawer behaviour lands with Phase 2 booking flow per BOOKING_ENGINE_SPEC §2.7) + booking panel + trial CTA.
- SpinViewer grows an `autoplay` prop implementing the swing; existing drag/clamp/arc logic unchanged.

## R1.5 — Categories (point 5)
Add the category lists (schema seed §catalogue in `specs/schema.sql` — copy the same names/slugs into stub data) to `lib/`: /rentals and /retail become category-first (arch tile rows + All grid, DESIGN_SPEC §5c). Retail page stops being a ComingSoon: category tiles now, listings stay “coming in Phase 3”. Chips become real links (`?category=`).

## R1.6 — Verify + redeploy
`next build` + OpenNext build green, v2 acceptance checklist pass, restart dev server for local review; deploy to Cloudflare when the owner has authed wrangler (was still pending at handoff). Commit per task as before.

## Deferred to phases (owner informed)
- Jewellery cross-sell **drawer live behaviour** → Phase 2 (needs availability API).
- Reviews **submission + moderation** → Phase 2 API + Phase 4 admin (schema already has `reviews`).
- Ghost-mannequin “floating garment” look like the reference → needs a reshoot on an invisible form; current mannequin frames use the seamless-stage treatment instead.
