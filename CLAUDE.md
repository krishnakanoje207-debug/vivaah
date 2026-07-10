# Vivaah — bridal rental & retail website

Single shop, single owner-admin. Lehengas + jewellery = **rental** (date-based pre-booking); all other dresses = **retail** (reserve, pick up at shop). No shipping. Everything owner-editable via admin panel.

## Read these before substantial work
- `BUILD_PLAN.md` — build order + **model routing (Fable vs Opus — check which tasks belong to which model before starting)**
- `IMPLEMENTATION_PLAN.md` — 🔒 locked architecture (v1.0). Deviations are scope changes: escalate, don't improvise.
- `specs/` — Fable-authored specs, implement them verbatim:
  - `DESIGN_SPEC.md` — tokens, type, motion, components. **User directive: subtle yet extremely beautiful — quiet luxury, one accent per view.** Includes P0.2 acceptance checklist.
  - `schema.sql` — apply as migration 0001 unchanged (exclusion constraint + triggers + RLS are load-bearing).
  - `BOOKING_ENGINE_SPEC.md` — state machine, flows, API routes, test invariants. Retail gets its own `0002_retail.sql` (Fable-reviewed) in Phase 3.
  - `COMMS_FLOW_SPEC.md` — WhatsApp/SMS/email ladder, webhook security, quota queue (Phase 5).

## Current status (10 July 2026) — HANDOFF TO OPUS
All Fable prep is done (design spec, schema, booking spec, comms spec). **Next task: P0.1 — scaffold Next.js 16 + `@opennextjs/cloudflare` + Tailwind v4 at project root, git init.** Then P0.2 (theme/shell) → P0.3 (hero encode+component) → P0.4 (`tools/arrange_360.py`, process `videos/lahenga1`) → P0.5 (pendulum viewer + /rentals on stub JSON, deploy Cloudflare preview → user reviews on the site). Session task list #6–#20 mirrors BUILD_PLAN §2. Escalate to a Fable session: adapter build friction (F5), any change to specs, and the gates after P1/P2/P4/P5.

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
