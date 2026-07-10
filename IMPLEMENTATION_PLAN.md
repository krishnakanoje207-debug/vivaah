# Vivaah — Bridal Rental & Retail Website: Implementation Plan

**Status: 🔒 LOCKED — v1.0, 3 July 2026.** All architectural decisions are final; only the §10 content inputs (rates, policies, catalogue) remain, and none of them block the start of development. Changes after this point are scope changes.
**Source:** `vivaahprompt1.docx` + 151 hero-section frames (`videos/heroSection/`)
**Verdict: the project is possible, and possible for ~₹0/month. The brief originally contained three logic conflicts — all have been decided and resolved (see §2).**

---

## 1. What is being built

A single website with two halves plus an admin panel:

| Area | Model | Fulfilment |
|---|---|---|
| **Lehengas + jewellery** | **Rental** (pre-booking, date-based, possible pre-booking charge, extension charges) | Customer picks up at shop |
| **All other dresses** | **Retail** (browse categories, reserve/pre-book) | Customer picks up at shop |
| **Admin panel** | Owner edits all content: products, prices, categories, banners, charges text, shop info | — |

Key facts that simplify the build: **no shipping/logistics** (shop pickup only), **no delivery-partner integration**, single shop, single owner-admin. The website is a booking/reservation engine + catalogue, not a full checkout-and-ship e-commerce platform.

---

## 2. Logic errors & conflicts found in the brief (all resolved)

### 2.1 ✅ DECIDED — Automated WhatsApp via the website system + SMS from the client's own number (₹0)

**Decision:** WhatsApp messages are sent automatically by the website; SMS is sent from the client's own number using her SIM plan's free daily SMS quota, keeping SMS cost at ₹0.

**WhatsApp channel — official Cloud API, driven customer-first so it stays free:**
Unofficial libraries (Baileys/whatsapp-web.js) remain off the table — ToS violation, number-ban risk, needs a 24/7 session server. Instead, use Meta's **official WhatsApp Cloud API** (free to register; needs its own number — a spare SIM) and exploit the pricing rule that **replies inside the 24-hour customer-service window are free**:

1. Customer completes a booking → success screen shows a prominent **"Get your confirmation on WhatsApp" button** — a `wa.me/<system-number>?text=CONFIRM+<booking-code>` deep link.
2. Customer taps it → sends that one prefilled message → this opens a free 24-h service window.
3. A Cloud API **webhook** (Cloudflare Worker) matches the booking code and **instantly auto-replies** with the full confirmation: booking details, charges, shop location (Google Maps link), pickup instructions, and the **website link** for engagement. Fully automated, official API, **₹0**.
4. Extension reminders / pickup-day reminders can also ride free windows when the customer replies; otherwise send a **utility template (~₹0.115 + GST)** — pennies, and optional (SMS covers it).
5. Fallback if the customer never taps the button: the guaranteed SMS channel below (or an optional auto-sent utility template, admin-toggleable).

**Message timing (two-stage, matches the payment flow in §2.3):** the customer taps the WhatsApp button right after *submitting* the booking, so the instant auto-reply says *"booking received — payment under verification"* with the details. When the owner verifies the UTR (normally within hours, i.e. still inside the same free 24-h window), the system sends the final *"booking confirmed"* message in that window — still ₹0. If verification happens after the window closes, the confirmation goes by SMS (free) and optionally a utility template (~₹0.115). A manual `wa.me` deep-link button also stays in the admin bookings inbox as a zero-cost fallback for edge cases (wrong number, customer without the system flow).

**SMS channel — owner's own number via an Android SMS-gateway app:**
The owner's Android phone runs a free open-source SMS gateway app (**[SMS Gateway for Android](https://github.com/capcom6/android-sms-gateway)** — REST API, free cloud relay or fully local mode; alternative: Traccar SMS Gateway). Flow:

1. Booking confirmed → backend queues an SMS job (customer copy + owner copy if desired).
2. The gateway app on her phone receives the job and **sends the SMS from her own SIM**, consuming her plan's free daily SMS allowance (typically 100/day on Indian plans).
3. The backend keeps a **daily quota counter (admin-configurable, default 100/day)**. Jobs beyond quota are queued for the next day, and email delivery covers the gap immediately, so nothing is ever silently lost.
4. If her phone is off/offline, jobs simply wait in the queue and send when it reconnects; the admin dashboard shows queue depth and last-gateway-heartbeat so she can see if the phone has disconnected.

**Two cautions to acknowledge (not blockers):**
- **TRAI/DLT:** bulk commercial A2P SMS in India formally requires DLT registration; a personal SIM sending a small number of person-to-person-style messages daily is common practice and low-risk at this volume, but keep messages conversational (not template-blast spam) and volumes modest. If the business scales, move SMS to a DLT-registered route or lean fully on WhatsApp.
- The Cloud API number can't simultaneously run the normal WhatsApp app, hence the **spare SIM** for the "system" number. The owner's personal number is untouched — it only does SMS.

### 2.2 ✅ DECIDED — Hosting: Cloudflare (free tier, commercial use allowed)

The reference site is on Vercel, but **Vercel's free Hobby tier prohibits commercial use** — a shop taking bookings violates their ToS and risks takedown. **Cloudflare's free tier explicitly allows commercial use** and is the correct free host. Concrete plan:

1. **Next.js 16 deployed to Cloudflare Workers** via the official **`@opennextjs/cloudflare`** adapter (`npx create-cloudflare` scaffolds it). Free tier: **100,000 requests/day**, 10 ms CPU/request — ample for a single-shop site.
2. **Render catalogue pages statically (SSG/ISR)** — homepage, rental gallery, retail listings, product pages regenerate on admin edits (on-demand revalidation). Static assets on Cloudflare **don't count against the Workers request quota and have unlimited free bandwidth**, so browsing traffic costs ~nothing; only dynamic actions (booking submission, availability checks, admin, webhooks) invoke Workers.
3. **Product images**: stored in Supabase Storage but always served through the site's own domain path with **Cloudflare edge caching** (`Cache-Control: immutable`), so Supabase's 5 GB/month egress is barely touched — the CDN absorbs repeat views. Images pre-compressed to WebP/AVIF at upload time (client-side compression in the admin panel, since free Cloudflare has no image-resizing service).
4. **Cron triggers** (free, 3 schedules): ① Supabase keep-alive ping, ② expire unpaid pending bookings, ③ daily SMS-quota reset / queue flush.
5. **WhatsApp webhook + SMS-gateway callbacks** run as Worker routes on the same deployment — no extra service.
6. **Domain** (client-purchased, ~₹800/yr): DNS on Cloudflare (free), which also unlocks the free **WAF rate-limiting rule** (§7), automatic HTTPS, and Bot Fight Mode. Deploys via GitHub → Cloudflare CI (free) — push to `main` = live.
7. **Dev/preview**: every git branch gets a free preview URL (`*.pages.dev`-style), so the client can review changes before they go live.

Fallback option if the OpenNext adapter causes friction during build: split the app — static frontend on Cloudflare Pages + all API logic in plain Workers + Hono. Same free limits, slightly more wiring, zero adapter risk. Supabase's free tier has no commercial restriction, so the backend stack is unaffected either way.

### 2.3 ✅ DECIDED — Payments: UPI QR + UPI number + UPI ID, manual verification (₹0)

Confirmed by the developer. At the payment step the booking page shows **all three**: ① the owner's **UPI QR** image, ② her **UPI number**, ③ her **UPI ID** — each with a copy button — plus a **UPI intent deep link** (`upi://pay?pa=<upi-id>&pn=<shop>&am=<amount>&tn=<booking-code>`) that opens the customer's UPI app pre-filled on mobile. Customer pays, submits the **UTR/transaction reference** in the form; the booking enters *payment pending verification* (dates held); owner cross-checks her UPI app and confirms with one tap in the admin panel (confirm triggers the WhatsApp/SMS confirmations). Unverified pending bookings auto-expire (admin-configurable window) so fake UTRs can't hold dates. All three payment identifiers are admin-editable in settings. Zero gateway fees.

### 2.4 ✅ DECIDED — 360° lehenga photoshoots: developer will produce them

The slamdunk site rotates a **3D basketball model** — a sphere is trivial in Three.js; a lehenga is not. The chosen approach is the standard e-commerce one: a **360° turntable photo sequence** per lehenga (mannequin on a rotating turntable, **24–36 evenly-spaced shots**), which the site scrubs on scroll/drag — visually identical to y-axis 3D rotation. **The developer is handling these photoshoots.** Practical shooting notes: fixed camera + tripod, consistent lighting and plain background across all garments, same frame count per item (makes the viewer code uniform), shoot landscape at ≥1500 px height, batch-process to WebP (~60–80 KB/frame → ~2–3 MB per garment, well within Supabase's 1 GB storage for a boutique-sized catalogue). Retail items use normal 2–4 photo galleries per colour variant.

### 2.5 Smaller catches

- **Double-booking race condition (✅ confirmed as a requirement):** once an item is booked for a date range, no one else can book it for any overlapping duration. Enforced at the database level with a PostgreSQL `daterange` + **GiST exclusion constraint** (not application-level checks, which have race windows) — the database physically rejects a second overlapping booking even if two customers submit at the same instant. *Pending* bookings (awaiting UPI verification) also hold their dates until they expire, so a slot can't be sniped mid-payment. The availability calendar shows booked/held ranges as unselectable. Includes **buffer days** between bookings for dry-cleaning/alterations — admin-configurable.
- **Extension charges ambiguity:** "extension of booking duration" needs rules — per-day rate? Only if the item isn't booked next? Extensions must re-check the availability calendar and respect the next booking's start date. Admin sets per-item or global extension rates.
- **Supabase free tier pauses after 7 days of inactivity** — prevented with a scheduled ping (Cloudflare cron trigger / GitHub Actions, both free). Free tier also has **no automatic backups** — a weekly `pg_dump` via free GitHub Actions solves it.
- **The hero frames carry a "KlingAI 3.0" watermark** (bottom-right) and are 1280×720 — soft on large desktop screens. Crop ~64 px off the bottom-right or overlay a UI element there; optionally upscale to 1080p with Real-ESRGAN (free) before encoding.
- **Anime aesthetic vs. real inventory:** the hero is anime-style while products are real photos. It works as an intentional artistic identity (and it's beautiful), but the transition from hero to product sections needs a deliberate design bridge (matching colour palette: those marigold oranges, rose pinks, dusk purples) so it doesn't feel like two different websites.

---

## 3. Is the project possible? — Yes (all blockers now resolved)

All decisions are locked: (a) **WhatsApp automated** via official Cloud API using the free customer-initiated service window, **SMS from the client's own number** via an Android SMS-gateway app within her free daily quota; (b) hosting on **Cloudflare free tier** (commercial use allowed); (c) **UPI QR + UPI number + UPI ID** with manual verification for pre-booking charges (₹0 fees); (d) **developer produces the 360° photoshoots**; (e) **client bears the domain cost** (~₹700–900/yr) — the project's only recurring spend. Monthly infrastructure cost: **₹0**. Optional micro-costs: WhatsApp utility templates (~₹0.115 + GST each) only if messaging outside free windows.

---

## 4. Recommended stack (all free tiers, commercial use allowed)

| Layer | Choice | Free-tier limits | Why |
|---|---|---|---|
| Framework | **Next.js 16** (App Router) | — | SSR/ISR for SEO on catalogue pages, API routes, React ecosystem for the 3D/animation work |
| Hosting | **Cloudflare Workers/Pages** via `@opennextjs/cloudflare` | 100k req/day, free static bandwidth, commercial OK | Only major free host permitting commercial use; global CDN |
| Database + Auth + Storage | **Supabase** | 500 MB DB, 1 GB storage, 5 GB egress, 50k MAU | Postgres (exclusion constraints for bookings!), Row-Level Security, email auth (⚠️ built-in phone OTP needs paid Twilio — customer phones verified via own SMS gateway / WhatsApp instead, §7), image storage — one service |
| Animations | **GSAP + ScrollTrigger** (now 100% free incl. plugins) | — | Scroll-scrubbed hero + section reveals, same as reference site |
| 3D / 360 viewer | **react-three-fiber + drei** or a lightweight custom canvas frame-scrubber | — | Matches slamdunk approach |
| Styling | **Tailwind CSS v4** | — | Speed, consistency |
| Email notifications | **Resend** | 3,000 emails/mo free | Owner booking alerts + customer confirmations |
| Rate limiting | **Cloudflare WAF free rule** (edge) + **Upstash Redis** (500k cmds/mo) for per-endpoint limits | free | See §7 |
| Image CDN | Cloudflare cache in front of Supabase storage + WebP/AVIF | free | Keeps Supabase's 5 GB egress from being exhausted |
| Analytics | **Cloudflare Web Analytics** or **Umami Cloud free** | free | Engagement measurement without cookies |
| Backups | GitHub Actions weekly `pg_dump` → private repo | free | Covers Supabase free tier's no-backup gap |

**Cost summary:** ₹0/month infrastructure · domain ~₹800/yr (borne by client) · a spare SIM for the WhatsApp system number · optional: WhatsApp utility templates ~₹0.115/msg outside free windows · SMS ₹0 (client's own number, daily free quota) · payments ₹0 (UPI direct).

---

## 5. Hero video — play once, loop the tail (your 151 frames)

**Frame analysis:** 151 JPEGs, 1280×720, 7.5 MB total. Motion: close-up of flowing red lehenga fabric (1–70) → white gown mid-shot (70–110) → camera settles on wide gazebo scene (≈135) → frames **138–151 are near-static** (only drifting petals/twinkling lights) — this is the loop segment.

**Recommended technique — two stitched `<video>` elements (better than a 151-image canvas scrubber: ~1.5 MB total vs 7.5 MB, hardware-decoded, no JS frame juggling):**

1. **`hero-intro.mp4`** — frames 1–138, played once.
2. **`hero-loop.mp4`** — frames 138–151 **ping-ponged** (138→151→150→…→139) so the loop point is mathematically seamless; a straight 14-frame loop would visibly "pop" as petals jump back.
3. Both videos preloaded; two stacked `<video>` tags. On the intro's `ended` event, start the loop video and swap opacity in the same animation frame. The first frame of the loop = last frame of the intro, so the cut is invisible.
4. Poster image = frame 1 (instant paint); `muted playsinline autoplay` for mobile autoplay; respect `prefers-reduced-motion` by showing the final still instead.

**Encoding (ffmpeg, free):**
```bash
# Intro: frames 1–138, 24 fps, crop KlingAI watermark strip if desired
ffmpeg -framerate 24 -start_number 1 -i kling_20260603____Main_Promp_5399_0_%03d.jpg \
  -frames:v 138 -c:v libx264 -crf 21 -pix_fmt yuv420p -movflags +faststart hero-intro.mp4

# Loop: frames 138–151 forward, then reversed and concatenated (ping-pong)
ffmpeg -framerate 24 -start_number 138 -i kling_20260603____Main_Promp_5399_0_%03d.jpg \
  -frames:v 14 -vf "split[a][b];[b]reverse[r];[a][r]concat=n=2" \
  -c:v libx264 -crf 21 -pix_fmt yuv420p -movflags +faststart hero-loop.mp4
# + WebM/AV1 variants for smaller size; keep MP4 as Safari fallback
```

Overlay: brand name, tagline, and CTA ("Book your bridal look") fade in via GSAP once the camera settles (~5.7 s in, at the cut to loop).

---

## 6. Site architecture & pages

```
/                     Hero video → featured lehengas → how renting works →
                      retail categories strip → testimonials → visit-the-shop (map)
/rentals              Lehenga gallery (each card = 360° spin-on-scroll, slamdunk-style)
/rentals/[slug]       Product page: draggable 360° viewer, jewellery pairings,
                      availability calendar, date-range picker → booking flow
/rentals/[slug]/book  Booking: dates, contact + WhatsApp number, pre-booking
                      charge via UPI, extension-charges info section (admin-editable)
/retail               Category grid (admin-defined categories)
/retail/[category]    Standard product listing (filters: price, colour, size);
                      cards show available colour-swatch dots; hovering/tapping a
                      swatch previews that colour's photo
/retail/[cat]/[slug]  Product page → colour swatch selector (each colour has its
                      own photo set + stock; gallery swaps on selection; selected
                      colour is carried into the reservation and the WhatsApp/
                      email confirmation) → "Reserve for pickup" flow
/jewellery            Rental jewellery, bookable standalone or bundled with a lehenga
/policies             Rental terms, extension charges, damage policy (admin-editable)
/visit                Shop location page: embedded Google Map (free iframe embed,
                      no API key needed), "Get Directions" button deep-linking to
                      the Google Maps app with the shop pinned, address, hours,
                      phone, landmark photos, appointment booking
/booking/[code]       Customer booking-status page (magic link in WhatsApp/SMS):
                      live status, countdown to pickup, "request extension" flow
                      (shows extra charges, re-checks availability), cancellation
/admin                (auth-gated) dashboard: bookings inbox w/ one-tap payment
                      verification (confirm = triggers automated WhatsApp/SMS;
                      manual wa.me fallback button), booking calendar, extension-
                      request approvals, product CRUD (+360-frame upload, + colour-
                      variant manager with per-colour photos & stock), categories,
                      pricing & charges, site content blocks, banners, settings
```

**Database core (Postgres/Supabase):**
`products` (type: rental|retail, category, price, rental_price, prebook_charge, extension_rate, images[], spin_frames[]) · `product_variants` (product_id, colour_name, colour_hex — rendered as the swatch dot, images[], sizes/stock, price_override nullable, is_active) — **retail items always have ≥1 variant** (single-colour items get one default variant, so the storefront and admin logic stay uniform; rentals can use the same table later if lehengas ever come in colour options) · `bookings` (customer, phone, `booked_range daterange`, status: pending→confirmed→picked_up→returned|cancelled, payment_ref, extension_of) · **`booking_items`** (booking_id, product_id, variant_id, **plus `booked_range` and `status` mirrored from the parent booking via trigger** — required for the per-item constraint below) — one booking can hold **a lehenga + bundled jewellery pieces** as separate items sharing the same dates (the brief's "jewellery rented with rental dresses"); each rental item is availability-checked · `categories` · `site_content` (key→JSON blocks for admin-editable copy/banners) · `settings` (buffer days, shop info, charges text) · **exclusion constraint** on `booking_items`: `EXCLUDE USING gist (product_id WITH =, booked_range WITH &&) WHERE (status NOT IN ('cancelled','returned'))` — makes double-booking impossible at the DB level, race-proof, for every item in a bundle.

**Colour-variant behaviour:** the colour filter on listing pages matches against variant colours (a red-and-blue dress appears under both filters); reservations store the variant so the owner knows exactly which colour to keep aside; if a colour sells out it shows as a greyed-out swatch (optionally with "notify me"); admin product form manages variants inline — add a colour, name it, pick the swatch hex, upload that colour's photos, set per-size stock.

**Shop location is surfaced everywhere, not just on `/visit`:** a "📍 Visit our shop / Get directions" element sits in the site footer (every page), on the booking-success screen, on the customer booking-status page, and as a Google Maps deep link (`https://maps.google.com/?q=<lat>,<lng>`) inside every WhatsApp, SMS, and email confirmation — since pickup-at-shop is the entire fulfilment model, the customer should never be more than one tap from navigation. The pin coordinates, address, and hours are admin-editable in settings (change once, updates everywhere including outgoing messages).

**Admin-editable "everything"** is implemented as structured content blocks (hero text, banners, section copy, policies, charges tables) — not a free-text page builder, which would be a scope explosion. This covers 100% of what a shop owner actually edits.

---

## 7. Rate limiting (explicitly requested)

Three layers of abuse protection:
1. **Edge:** Cloudflare free plan includes WAF rate-limiting — e.g., max 10 requests/10 s per IP on `/api/*`, plus bot-fight mode. Zero code.
2. **Application:** Upstash Redis sliding-window limits on sensitive endpoints — booking creation (e.g., 3/hour/phone number), OTP/auth attempts (5/15 min), admin login (5/15 min). Plus **Cloudflare Turnstile** (free, invisible CAPTCHA) on the booking form to stop bots before they hit the API.
3. **Phone verification without paid SMS providers:** ⚠️ Supabase's built-in phone OTP requires a paid SMS provider (Twilio etc.) — do **not** use it. Instead, verify the customer's number through channels we already own for free: OTP sent via the **owner's Android SMS gateway** (counts against the same daily quota, so it's reserved for rental bookings only), or treat the customer's **WhatsApp CONFIRM message to the system number as implicit verification** (they proved they own that WhatsApp number). Unverified + unpaid pre-bookings auto-expire after an admin-configurable window (e.g., 2 hours) so bots/fakes can't hold inventory.

---

## 8. Design direction

Derived from the hero frames' palette — **dusk purple/indigo backgrounds, marigold orange accents, rose pink and deep-red highlights, warm fairy-light gold** — so the anime hero flows into the real product sections. Typography: an elegant display serif (e.g., Fraunces/Playfair) for headings + clean sans for body; generous whitespace; product cards on soft off-white "silk" panels so real photos pop against the dusk theme. Patterns worth borrowing from the best rental/fashion sites (Flyrobe, Rent the Runway, Stage3, high-end saree houses): sticky availability-date bar on product pages, "complete the look" jewellery cross-sell, occasion-based browsing (Bridal / Sangeet / Reception), size-and-fitting guide, and an appointment-to-try CTA everywhere.

---

## 9. Build phases

| Phase | Scope | Est. effort |
|---|---|---|
| **0. Content inputs** | Client answers the remaining §10 questions (rates, policies, catalogue size); domain purchase; 360° photoshoot begins | 1 week (client) |
| **1. Foundation** | Repo, Next.js + Cloudflare + Supabase setup, schema + RLS + exclusion constraint, auth | 3–4 days |
| **2. Hero + shell** | Video encode + dual-video hero, nav, footer, theme system, homepage | 3–4 days |
| **3. Rental engine** | 360 viewer, availability calendar, booking flow (incl. jewellery bundles) + UPI step, booking-status page + extension requests, expiry job | 5–7 days |
| **4. Retail** | Categories, listings w/ swatch previews, product pages w/ colour-variant selector, reserve-for-pickup flow | 4–5 days |
| **5. Admin** | Dashboard, bookings inbox + one-tap payment verification, extension approvals, product/content CRUD, settings, PWA + push notifications | 5–6 days |
| **6. Comms + hardening** | WhatsApp Cloud API webhook + auto-reply flow, SMS gateway integration + quota queue, email notifications, rate limiting, SEO/OG tags, image pipeline, backups, keep-alive | 3–4 days |
| **7. Launch** | Real content load, client training, DNS cutover | 2 days |

**Total: roughly 4–5 weeks of development** after client decisions land.

---

## 10. Remaining content inputs from the client (do not block development)

These are business-content values that get entered into admin settings — the system is built to accept any answer, so development starts without them:

1. Pre-booking charge: fixed amount or % of rental? Refundable? Same for jewellery?
2. Extension charges: per-day rate? Flat? Per-item or global?
3. Buffer days between rentals for cleaning/alterations?
4. Retail "purchase": pay full amount online, token amount, or just reserve-and-pay-at-shop?
5. Security deposit for rentals — collected at shop? Should the site display it?
6. How many rental lehengas / jewellery sets / retail SKUs at launch? (sizing storage + photoshoot effort)
   6a. For retail: does she track stock per colour *and size*, or just per colour? Are photos available for every colour of a dress, or only one colour (others shown as swatch-only)?
7. ✅ A spare SIM/number **is now required** for the WhatsApp Cloud API system number — which number will be used? Also confirm her personal Android phone can run the SMS-gateway app.
8. ✅ Domain cost borne by client — which domain name does she want? (~₹800/yr)
9. Branding: existing logo/shop name assets? Shop address + Google Maps pin + hours?
10. Cancellation policy (affects refund of pre-booking charge)?

---

## 11. Recommended engagement additions

- **"Book a trial appointment"** scheduler (visit shop to try before renting) — highest-conversion feature for this business.
- **Complete-the-look bundles** — auto-suggest jewellery with each lehenga (increases rental value per booking).
- **Occasion browsing** (Bridal / Sangeet / Mehendi / Reception) + **festival countdown banners** (admin-managed).
- **Wishlist + "notify me when free"** — email/WhatsApp alert when a booked lehenga's dates open.
- **Instagram feed embed** + share-to-WhatsApp buttons on every product (organic reach where her customers already are).
- **Customer photo testimonials** ("Vivaah brides") — with consent, the strongest trust signal for bridal rental.
- **Size & fitting guide**, **rental-process explainer** (3-step visual), **FAQ with damage policy**.
- **Referral coupon codes** (admin-generated) for pre-booking-charge discounts.
- **Customer booking-status page** (`/booking/[code]`, magic-linked from WhatsApp/SMS) with a **self-serve extension request** — customer sees extra charges live, system re-checks the calendar so an extension can never collide with the next booking; owner approves in one tap. (Closes the brief's extension requirement with an actual flow, not just an info section.)
- **Admin panel as an installable PWA + free Web-Push notifications** — the owner's phone buzzes on every new booking like a native app; no app store, no cost. Removes any dependence on checking email.
- **Per-product Open Graph share images** — when a customer shares a lehenga on WhatsApp, the link unfurls into a rich card (photo + price + dates-available). WhatsApp is where all sharing happens for this audience; this is disproportionately high-value for zero running cost.
- **Local SEO pack**: `Product`/`LocalBusiness` JSON-LD structured data + link-up with a **Google Business Profile** (free) so the shop appears in "lehenga rent near me" map searches — likely the single biggest free customer-acquisition channel for a physical shop.
- **Hindi / English language toggle** — stored as a content-block dimension so the admin can fill both languages (English fallback where Hindi is empty).
- **Low-bandwidth mode**: serve the 720p hero as-is on mobile data but lazy-start it; skip to the static poster on `Save-Data` header / 2G-3G connections (much of the audience browses on mobile data).

---

## 12. Reference map — which part of the website comes from where

| Website part | Reference / origin | What exactly is borrowed |
|---|---|---|
| Hero: cinematic video → settles into a living loop | **Apple product pages** (pre-rendered frame sequences on a fixed canvas) + **Bottega Veneta** (full-bleed editorial film hero) + your Kling AI frames | Play-once-then-ambient-loop technique; text/CTA fading in only after the camera settles |
| Rental gallery + lehenga page layout & booking flow | **slamdunk-five.vercel.app** (client's stated reference — React, Three.js/react-three-fiber, GSAP, Tailwind) | Product rotating on its y-axis as the page centrepiece; single-product booking page structure; scroll-driven section reveals — theme swapped from neon-sport to dusk-wedding |
| 360° spin viewer mechanics | Standard e-commerce turntable viewers (car configurators, Amazon 360 view) — the practical version of slamdunk's 3D ball for real garments | Drag-to-rotate + scroll-scrub frame sequence, preloaded neighbouring frames |
| Availability calendar + date-range picking | **Airbnb**-style range picker; rental-period presets (4/6/8 days) observed on **Stage3** and **Flyrobe** | Unselectable booked/held dates, buffer-day gaps, preset durations |
| Trial-appointment booking, alteration/fitting messaging | **Flyrobe** (free trials, at-home measurement positioning) & **Stage3** (trials + custom fitting for bridal) | "Try before you book" as a first-class CTA; fitting/alteration info on every rental page |
| Occasion-based browsing (Bridal / Sangeet / Mehendi / Reception) | Indian ethnic-wear retailers (**Kalki Fashion, Koskii, Mohey**) | Category system matching how wedding shoppers actually search |
| Colour swatch dots on product cards + variant galleries | **Myntra / Zara / H&M** product-card pattern | Swatch → photo-set swap; colour carried through reservation |
| "Complete the look" jewellery cross-sell | **Rent the Runway** accessory pairing + Myntra "style with" | Bundled add-ons at booking time, one shared date range |
| Reserve online, pick up at shop | Standard **BOPIS** (buy-online-pickup-in-store) retail pattern | Reservation + pickup-window messaging instead of checkout+shipping |
| UPI QR + UTR manual verification | Common Indian small-business pattern (ticketing pages, boutique Instagram sellers) | Zero-fee payment collection with human verification and auto-expiring holds |
| Scroll animations / section transitions | **Awwwards** e-commerce & GSAP collections (e.g., outfit-change-on-scroll, product-details scroll experiences) | Scroll-scrubbed transitions, image-sequence storytelling — 2026's interactive-3D-on-scroll trend |
| Admin structured content blocks | **Shopify's** section-based theme editor (concept only) | Owner edits defined blocks, not raw pages — safe full customisability |

---

## 13. Free-tier risk register

| Risk | Trigger | Mitigation |
|---|---|---|
| Supabase project pauses | 7 days no activity | Cron ping (free) |
| Supabase 5 GB egress exceeded | Image-heavy traffic spike | Cloudflare CDN caching + WebP/AVIF + lazy-load |
| Cloudflare 100k req/day exceeded | ~viral traffic | Static-render catalogue pages (don't hit Workers per view) |
| No DB backups on free tier | Data loss | Weekly GitHub Actions `pg_dump` |
| Customer never taps "Get confirmation on WhatsApp" | No free service window opens | SMS (guaranteed channel) + optional auto utility template (₹0.115), admin-toggleable |
| Owner's phone offline / SMS gateway disconnected | SMS queue stalls | Queue persists + dashboard heartbeat indicator; email delivery is immediate regardless |
| SMS daily quota exhausted | >100 bookings+reminders/day | Quota counter defers overflow to next day; WhatsApp/email already delivered |
| TRAI/DLT scrutiny of commercial SMS from personal SIM | High SMS volume / spam-like templates | Keep volume low & conversational; migrate to DLT route or WhatsApp-only if scaling |
| Meta Cloud API number requirement | Number can't also run the normal WhatsApp app | Spare SIM as dedicated system number; owner's personal number untouched |
