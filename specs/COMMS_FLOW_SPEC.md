# Comms Flow Spec (F3) — WhatsApp · SMS · Email — v1.0

Implements IMPLEMENTATION_PLAN §2.1 on `specs/schema.sql` (`sms_queue`, `wa_contacts`). Opus: implement mechanically in Phase 5; escalate gaps to Fable. **Cost rule: the system must never send a paid message unless the admin has explicitly enabled the template toggle.**

## 1. Channel ladder (every notification walks down until one succeeds)

| Priority | Channel | Cost | Condition |
|---|---|---|---|
| 1 | WhatsApp free-form | ₹0 | customer's 24-h service window is open (`wa_contacts.last_inbound_at + 24h > now()`) |
| 2 | WhatsApp utility template | ~₹0.115+GST | ONLY if `settings.wa_template_enabled = true` (default **false**) |
| 3 | SMS via owner's Android gateway | ₹0 | within daily quota; else deferred to next day |
| 4 | Email (Resend) | ₹0 | **always sent immediately in parallel, not really a fallback** — email never waits on 1–3 |

Owner notifications (new booking, UTR submitted, extension request, gateway offline) go by **web-push + email always**; never by paid template.

## 2. WhatsApp Cloud API

### 2.1 Setup facts
- Dedicated system number (spare SIM), registered on Meta Cloud API. Env vars: `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN` (system-user token), `WA_APP_SECRET`, `WA_VERIFY_TOKEN`.
- Webhook route `/api/hooks/whatsapp` on the same Cloudflare deployment.

### 2.2 Webhook (inbound)
1. `GET` subscribe handshake: echo `hub.challenge` iff `hub.verify_token == WA_VERIFY_TOKEN`.
2. `POST`: **verify `X-Hub-Signature-256`** = HMAC-SHA256 of the *raw* body with `WA_APP_SECRET`; reject 401 on mismatch. No signature, no processing — non-negotiable.
3. **Idempotency:** Upstash `SET wa:msg:<message_id> NX EX 604800`; if already present, ack 200 and stop (Meta retries webhooks).
4. Upsert `wa_contacts` (phone, `last_inbound_at = now()`) for **every** inbound message — any customer text opens a free window we can use.
5. If body matches `CONFIRM <code>` (case/whitespace tolerant, code normalised): look up booking; store `last_code`.
   - booking `pending` → reply **MSG-1 “received”**.
   - booking `confirmed` → reply **MSG-2 “confirmed”** (covers verify-before-tap ordering).
   - unknown code → reply MSG-5 (polite, include shop phone). Rate-limit unknown-code replies to 3/phone/day.
6. Always ack 200 fast (<10 s); do processing before responding (Workers time is fine) but never block on outbound sends — queue them.

### 2.3 Outbound rules
- `sendWhatsApp(phone, text)` helper: allowed **only** when window open; otherwise return `WINDOW_CLOSED` and let the caller walk the ladder. Log every send (booking id, channel, ok/err) to a `comms_log` — add tiny migration `0003_comms_log.sql` in Phase 5 (id, booking_id, channel, template, status, created_at); no Fable review needed, no RLS-sensitive data beyond phone.
- Two-stage messaging tied to the booking flow:
  - **On CONFIRM inbound (booking pending):** MSG-1 — booking received: items, dates, amount, UTR status "being verified", shop map link, status-page link (`/booking/<code>`), site link.
  - **On admin verify:** if window open → MSG-2 free-form ("booking confirmed" + pickup instructions + map + status link). Window closed → template if enabled, else skip (SMS+email cover it).
  - **Reminders (cron, daily 09:00 IST):** pickup-day and return-day reminders; extension-approved notice. Same ladder.

### 2.4 Message templates (en shown; hi variants in `site_content` key `comms.templates`, admin-editable, placeholders `{name} {code} {items} {dates} {amount} {shop_map} {status_url}`)
- **MSG-1 received:** "Namaste {name}! We've received your booking {code} — {items} for {dates}. Advance ₹{amount} is being verified; you'll get a confirmation here shortly. Track: {status_url}"
- **MSG-2 confirmed:** "Confirmed! 🎉 {code} — {items}, {dates}. Pickup at our shop: {shop_map}. Please carry this message. Details: {status_url}"
- **MSG-3 pickup reminder:** "Reminder: your Vivaah pickup is today ({dates}). Shop & directions: {shop_map}"
- **MSG-4 return reminder:** "Gentle reminder: return due {return_date}. Need more days? Request an extension: {status_url}"
- **MSG-5 unknown code:** "Sorry, we couldn't find that booking. Please check the code on your booking page, or call us: {shop_phone}"
- SMS versions: same content compressed ≤2 segments (≤306 chars GSM-7); status URL shortened to `vivaah.in/b/<code>`.

## 3. SMS — owner's Android gateway ([capcom6/android-sms-gateway])

- Producer: any notification whose ladder reaches SMS inserts into `sms_queue` (phone, body, booking_id, `not_before = today`).
- **Consumer cron (every 5 min):**
  1. `sent_today` = count of `sms_queue` rows with `sent_at::date = current_date`.
  2. Budget = `settings.sms_daily_quota − sent_today`; take that many rows `WHERE status='queued' AND not_before <= current_date ORDER BY created_at` (`FOR UPDATE SKIP LOCKED`).
  3. POST each to the gateway REST API (`GATEWAY_URL`, `GATEWAY_AUTH` env). Success → `sent`, `sent_at=now()`. Failure → `attempts+1`; after 3 attempts → `failed` + owner web-push/email alert.
  4. Rows beyond budget: `not_before = current_date + 1` (tomorrow's quota).
- **Heartbeat:** store gateway's last successful response timestamp in `settings key='sms_gateway_last_ok'` (not public). Admin dashboard shows green/amber/red (ok / >30 min / >2 h) + queue depth. Optional gateway webhook callback authenticates via `X-Gateway-Secret` header compared to env secret.
- DLT posture (from plan): conversational copy, low volume, quota cap — never blast marketing SMS through this.

## 4. Email (Resend)
- Sent immediately on: booking received (customer if email given + owner always), confirmed, cancelled/expired, extension decision, gateway-offline alert (owner).
- Plain, elegant HTML matching DESIGN_SPEC tokens; every email includes shop address + map link + status URL. From: `bookings@<domain>` (set up SPF/DKIM via Resend DNS records during Phase 5).

## 5. Failure & edge matrix
| Case | Behaviour |
|---|---|
| Customer never taps WhatsApp button | SMS + email already delivered; no template unless toggle on |
| Verify happens after 24-h window closed | template-if-enabled → else SMS + email |
| Two CONFIRM messages, different codes, same phone | each handled independently; window refreshed both times |
| WhatsApp webhook downtime | Meta retries; idempotency keys make replays safe |
| Gateway offline days | queue accumulates with heartbeat alarm; email remains instant; admin can manually WhatsApp via wa.me fallback buttons in inbox |
| Customer phone ≠ WhatsApp number | booking form has optional separate "WhatsApp number" field; wa_contacts keys on the WhatsApp number, SMS on the phone number |

## 6. Secrets & config (Cloudflare env)
`WA_PHONE_NUMBER_ID · WA_ACCESS_TOKEN · WA_APP_SECRET · WA_VERIFY_TOKEN · GATEWAY_URL · GATEWAY_AUTH · GATEWAY_CALLBACK_SECRET · RESEND_API_KEY · UPSTASH_REDIS_REST_URL/TOKEN · SUPABASE_SERVICE_ROLE_KEY (server only, never bundled client-side)`. Admin-editable at runtime (settings table): quota, template toggle, template copy, reminder times.
