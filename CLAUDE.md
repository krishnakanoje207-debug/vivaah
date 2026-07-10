# Vivaah Dresses and Suits — rental & retail website

Single shop, single owner-admin. Full brand name: **“Vivaah Dresses and Suits”** — three businesses: **rentals** (8 garment categories: bridal/side lehengas, indo-western, ready-to-wear sarees, rajasthani poshak, chaniya cholis, gowns, sarees — date-based pre-booking), **retail** (8+ categories: suits, kurtis, co-ord sets, kaftans… — reserve, pick up at shop), and **jewellery** (rented, usually alongside an outfit → cross-sell drawer). No shipping. Everything owner-editable via admin panel. Logo asset incoming from owner (`site/public/brand/`).

## Read these before substantial work
- `BUILD_PLAN.md` — build order + **model routing (Fable vs Opus — check which tasks belong to which model before starting)**
- `IMPLEMENTATION_PLAN.md` — 🔒 locked architecture (v1.0). Deviations are scope changes: escalate, don't improvise.
- `specs/` — Fable-authored specs, implement them verbatim:
  - `DESIGN_SPEC.md` — **v2** (violet/gold/porcelain; v1's marigold/silk judged "generic" by owner). Directives: subtle yet extremely beautiful, unmistakably non-template. Includes acceptance checklist.
  - `REVISION_1.md` — **owner's 8-point feedback on Preview 0 → Opus work order R1.1–R1.6 (current work).**
  - `schema.sql` — apply as migration 0001 unchanged (exclusion constraint + triggers + RLS are load-bearing; now includes `reviews` + category seeds).
  - `BOOKING_ENGINE_SPEC.md` — state machine, flows, API routes, test invariants; §2.7 jewellery cross-sell drawer, §2.8 reviews. Retail gets its own `0002_retail.sql` (Fable-reviewed) in Phase 3.
  - `COMMS_FLOW_SPEC.md` — WhatsApp/SMS/email ladder, webhook security, quota queue (Phase 5).

## Current status (10 July 2026, evening) — OPUS: DO REVISION 1
Preview 0 (P0.1–P0.5) is built, committed, and verified locally; Cloudflare deploy still awaits the user's `wrangler login`. Owner reviewed and gave 8 corrections → **next work: `specs/REVISION_1.md` R1.1–R1.6** (hero playback bug-fix first, rebrand, v2 re-skin, two-act product page with auto-swing + gallery + stub reviews, category-first galleries, redeploy). Phase 1 (Supabase) comes after Revision 1 is accepted. Escalate to Fable: any spec change, adapter friction, and the gates after P1/P2/P4/P5.

## Locked decisions (do not re-litigate)
- **Stack:** Next.js 16 App Router → Cloudflare Workers via `@opennextjs/cloudflare` · Supabase (DB/auth/storage) · Tailwind v4 · GSAP + ScrollTrigger · Resend · Upstash Redis.
- **₹0/month, free tiers only, commercial use must be allowed** (no Vercel Hobby, no watermarked/non-commercial AI tiers). Client pays only the domain.
- **Payments:** UPI QR + number + ID shown directly, customer submits UTR, owner verifies manually in admin. No gateway.
- **Double-booking:** Postgres GiST exclusion constraint on `booking_items` (`product_id`, `booked_range` daterange, status filter) — DB-level, never application-level. Buffer days between bookings.
- **Messaging:** WhatsApp Cloud API (spare SIM, customer-initiated free 24-h windows) + SMS from owner's own Android via SMS-gateway app (100/day quota) + Resend email.
- **360 viewer:** turntable photo frame-scrubber (canvas, drag + scroll), NOT real 3D. Per-item metadata `{frames, arcDegrees, loop}` — partial arcs clamp (pendulum), full 360 wraps.
- **Rate limiting:** Cloudflare WAF + Upstash sliding windows + Turnstile on booking form. Never use Supabase phone OTP (needs paid Twilio).

## Assets & tools
- `videos/heroSection/` — 151 hero frames (720p, KlingAI watermark bottom-right → crop/overlay). Encode: dual-video play-once-then-ping-pong-loop, ffmpeg commands in IMPLEMENTATION_PLAN §5.
- `videos/lahenga1/` — 68 turntable frames (720p, watermark bottom-right), **only ~90° arc (front→right profile)** → pendulum viewer, `loop: false`.
- `tools/` — lehenga prep: `prep_lehenga.py` (rembg), `wan_i2v_colab.ipynb` (WAN 2.1 beauty clips on free Colab — laptop GPU is a GTX 1650, never run AI video locally).

## Environment gotchas
- Windows 11, PowerShell 5.1. Local Python is **3.14** — `rembg`/`onnxruntime` won't install (use Colab or a 3.12 venv); Pillow is fine.
- Not a git repo yet — `git init` when scaffolding starts.
