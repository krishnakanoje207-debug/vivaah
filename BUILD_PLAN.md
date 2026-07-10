# Vivaah — Build Execution Plan (v1.0, 10 July 2026)

**Relationship to `IMPLEMENTATION_PLAN.md`:** that document is 🔒 locked architecture. This one is the *execution layer*: build order, per-task breakdown, and **model routing** (Fable 5 vs Opus 4.8) to conserve Fable tokens.

---

## 1. Model routing policy

**Honest framing:** there is nothing on this project Opus 4.8 *cannot* do. The split is a risk gradient, not a capability wall — Fable is reserved for work where a subtle mistake is expensive (money, double-booking guarantees, security) or where one cross-cutting judgment call shapes everything downstream. Everything else — which is ~85% of the tokens — goes to Opus.

### Fable-only work (short, targeted sessions)
| # | Task | Why Fable |
|---|---|---|
| F1 | **Database schema + migrations**: `booking_items` GiST exclusion constraint, the trigger mirroring `booked_range`/`status` from parent booking, RLS policies, pending-expiry design | One shot, small token cost, maximum blast radius. A subtle constraint bug = real double-bookings for a real shop. |
| F2 | **Booking-engine core logic spec + review**: status machine (pending→confirmed→picked_up→returned/cancelled), buffer-day math, hold-expiry job, extension re-check against the *next* booking's start | Race-condition and edge-case reasoning (extension collides with buffer days, expiry fires mid-verification, etc.) |
| F3 | **WhatsApp Cloud API flow design** (spec only, Opus implements): 24-h window state machine, CONFIRM code matching, two-stage received→confirmed messaging, fallback ladder (WhatsApp→SMS→email) | Cross-channel state machine with cost implications; the spec must be airtight so Opus can implement mechanically. |
| F4 | **Security & RLS review** (`/security-review` + targeted `/code-review`) at two gates: after Phase 2 (schema+booking live) and pre-launch | Adversarial review benefits most from the stronger model. |
| F5 | **Escalation decisions**: if `@opennextjs/cloudflare` adapter friction triggers the fallback (Pages + Hono split), or any locked decision needs re-litigating | Architecture change = scope-change judgment. |
| F6 | **Design-language spec** (one pass): the anime-hero → real-product "design bridge", theme tokens (dusk purple/marigold/rose/gold), typography scale, motion language for GSAP | One creative-judgment pass that everything visual inherits; done once, early. |
| F7 | **Phase-gate diff reviews** of Opus output — booking flow, payment step, admin auth only (not UI CRUD) | Cheap insurance on the high-stakes 15%. |

### Opus 4.8 work (the bulk — run in `/model opus` sessions)
- **Preview 0 scaffold** (below): create-cloudflare + Next.js 16 + Tailwind v4, nav/footer shell, theme tokens from F6.
- **Hero**: ffmpeg dual-video encode (commands already written in IMPLEMENTATION_PLAN §5), watermark crop, `<video>` swap component, reduced-motion fallback.
- **360/pendulum viewer**: canvas frame-scrubber with clamp/wrap modes, drag + scroll-scrub, neighbour preloading, `{frames, arcDegrees, loop}` metadata. Standard e-commerce pattern, fully specified.
- **Frame prep tooling**: `tools/arrange_360.py` (even-spacing selection, watermark crop, WebP, metadata JSON).
- **All catalogue UI**: rental gallery (spin-on-scroll cards), product pages, retail category grids, listings + filters, colour-swatch variant selector, jewellery pairing UI.
- **Booking UI**: date-range picker + availability calendar rendering, UPI payment step (QR/number/ID + intent link + UTR form), booking-status page. *(Logic per F2 spec.)*
- **Admin panel** (biggest token sink): dashboard, bookings inbox + one-tap verify, product CRUD, 360-frame upload, variant manager, content blocks, settings, PWA + web push.
- **Integrations**: Resend email, Android SMS-gateway REST + quota queue, cron jobs (keep-alive, expiry, quota reset), Cloudflare Turnstile, Upstash rate limits *(implementation of F3/F2 specs)*.
- **SEO/OG/JSON-LD**, per-product OG images, sitemap, Hindi/English content-block dimension.
- **Image pipeline**: client-side WebP/AVIF compression in admin upload.
- **Tests** for booking logic (Fable reviews the ones covering F1/F2 invariants).

### Session workflow (this is what saves the tokens)
1. **Project `CLAUDE.md`** (created alongside this plan) carries all locked decisions — every Opus session starts oriented without re-reading 32 KB of plan or burning Fable on context transfer.
2. Fable sessions produce **specs and reviews only** — no scaffolding, no CRUD, no CSS in Fable sessions.
3. Opus sessions implement one phase-chunk at a time; at F4/F7 gates, switch to Fable (`/model` per session) for review of the diff, not the whole codebase.
4. Alternative for mixed sessions: a Fable session can delegate to Opus subagents via the Agent tool (`model: "opus"`), keeping Fable as orchestrator — useful for F2/F3 where spec and implementation interleave.

---

## 2. Build order — re-sequenced so the site is reviewable ASAP

The owner-review loop ("I'll review it directly on the website") pulls the visual layers forward. Supabase comes *after* the first preview: Preview 0 runs on stubbed JSON data.

### Preview 0 — reviewable site in days (Opus, ~95%)
Goal: a Cloudflare preview URL showing the real look and the lahenga1 viewer.
1. Scaffold Next.js 16 → Cloudflare (`create-cloudflare` + `@opennextjs/cloudflare`). **If adapter friction: stop, escalate to Fable (F5).**
2. Theme tokens + shell from design spec (F6 — do this Fable pass first, it's small).
3. Hero dual-video (encode from `videos/heroSection/`, crop KlingAI watermark).
4. `tools/arrange_360.py` → process `videos/lahenga1/` (68 frames → 32 evenly spaced, watermark corner handled, WebP + `metadata.json` with `{arcDegrees: ~90, loop: false}`).
5. `/rentals` gallery (spin-on-scroll card) + `/rentals/[slug]` with the **pendulum viewer** (clamped 90° arc — drag right to profile, left back to front; same component does full 360 later by flipping `loop`).
6. Stub data layer (local JSON, one lehenga). Deploy → send preview URL for review.

### Phase 1 — Foundation (Fable F1 + F6 done; Opus wires it)
Supabase project, schema migration (F1 output), auth, RLS, storage buckets; swap stub data → DB.

### Phase 2 — Rental engine (Fable F2 spec → Opus build → Fable F4 gate)
Availability calendar, booking flow + jewellery bundles, UPI step, hold/expiry job, booking-status page + extension requests.

### Phase 3 — Retail (Opus)
Categories, listings, swatch variants, reserve-for-pickup.

### Phase 4 — Admin (Opus; Fable F7 reviews auth + payment-verify inbox only)
Full admin panel, PWA + push.

### Phase 5 — Comms + hardening (Fable F3 spec → Opus build → Fable F4 pre-launch gate)
WhatsApp webhook, SMS gateway + quota queue, Resend, rate limiting, Turnstile, SEO/OG, backups, keep-alive.

### Phase 6 — Launch (Opus)
Content load, client training doc, DNS cutover.

---

## 3. Known content gaps (tracked, none block Preview 0)
- `lahenga1` covers only a ~90° arc (front → right profile) → ships as pendulum viewer; upgrade to full 360 per item when turntable reshoots happen (§2.4). Frames are 720p (below the ≥1500 px guideline) — acceptable interim; optional Real-ESRGAN upscale in the same Colab as the WAN clips.
- WAN 2.1 beauty clips (memory: `lehenga-video-pipeline`) are a separate hero-layer garnish — not on the critical path.
- §10 client inputs (rates, policies, catalogue size, domain, spare SIM) — admin-configurable, don't block build.
