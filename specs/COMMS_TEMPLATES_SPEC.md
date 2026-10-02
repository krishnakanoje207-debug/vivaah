# Owner-editable message wording — spec and build record

Status: **built 30 Sep – 2 Oct 2026, on `main`, not deployed.** Closes
COMMS_FLOW_SPEC_V2 §4.2 ("copy is owner-editable") and the two blockers §7.4
named: a placeholder language, and a guarantee that a broken template cannot
silence a notification.

## 1. What she can do

`/admin/messages` (in the admin nav, between Content and Settings) lists every
message the site sends: twelve to the customer, one per event, and four to the
shop. Each opens an editor with the subject and message, a live preview against
two made-up bookings (a rental with a pickup time; a one-day collection with
none), the placeholders that message can use with the ones it must keep marked,
the built-in wording, and "Go back to the built-in wording".

## 2. The placeholder language

Two rules, nothing else:

1. `{name}` is replaced by what it says. No conditions, no loops, no expressions.
2. **A line that uses a placeholder whose value is empty is left out**, and no
   more than one blank line is kept between paragraphs.

Rule 2 is how the old code's conditional text survives the move out of code:
`{reason}` on its own line is there when the shop gave a reason and gone when it
did not, exactly as `reason ? … : ""` behaved. The same rule carries the owner
alert's "Confirm it before …" line and the pickup reminder's return-day line.

Substitution is a single pass, so a value containing braces (her name, a reason)
is printed as written and never read as a placeholder.

The set (21) is derived from what `messages.ts` interpolated when the copy was
fixed in code, nothing more: `name code items when pickup_day return_day today
hours status_link reason new_return_day return_items is_are confirm_by contact
admin_link shop_name shop_phone shop_address shop_maps shop_hours`. Each message
gets the customer-side or shop-side common set plus only the ones its own event
supplies. The definitions and descriptions live in `lib/comms/messages.ts`
(`PLACEHOLDERS`, `DRAFTS`).

## 3. Storage

One row in **`settings`**, key `comms.templates`, `is_public = false`:
`{ "en": { "customer:booking.created": { "subject": "…", "text": "…" }, … } }`.

- `settings`, not `site_content` as V2 §4.2 named: `app_public` can read every
  `site_content` row, nothing public needs the shop's alert wording, and the
  Content page renders every `site_content` row as an en/hi text block where a
  nested row would show up broken. A non-public settings row is owner-only under
  the policy that already exists, so **no migration**.
- **Only overrides are stored.** No row, or no key, means the built-in wording,
  so nothing is seeded and `messages.ts` stays the one home of the defaults.
  Saving wording identical to the built-in stores nothing, so a later fix to the
  built-in copy is not frozen behind a copy of the old one.
- A save is one `insert … on conflict do update` merging on the server, so two
  messages saved at once cannot overwrite each other.
- The `en` level is where Phase 4's Hindi goes. English only is built.

## 4. Save-time rules (`validate`)

Refused, by name: an unknown placeholder or one this message cannot use; a stray
`{` or `}`; an em dash (the project bans them in copy); an empty subject, a
subject over one line or 200 characters; a placeholder that can be empty in the
subject; an empty message or one over 5000 characters; a message missing a
required placeholder; a required placeholder sharing a line with one that can be
empty (rule 2 would take it with the line).

Required, read off the built-in wording rather than listed by hand:
`{shop_phone}` in every message to her (the shop's real fallback when software
fails is a call), `{status_link}` wherever the built-in gives her one, and
`{admin_link}` in every message to the shop.

The form follows the panel's conventions: controlled fields (React 19 resets an
uncontrolled form even when the action fails), `aria-invalid` +
`aria-describedby`, focus to the first bad field, `requireAdmin()` first.

## 5. Send-time guarantee (`compose`)

`notify` reads the overrides once per event (inside `after()`, off the response
path) and runs the same `validate` on every send. If the read fails, the stored
value is not a template, it fails validation, or rendering throws, **that one
message goes out in the built-in wording** and the `comms_log.detail` column
says so: `built-in wording used, saved wording refused: <reason>` (or `template
read failed (…)`). The send's status is unaffected. The list page also shows
"Needs fixing" against any saved wording that would be refused.

## 6. Two deliberate changes to the built-in wording

- **The first message's link used `?t=`, but `/booking/[code]` reads `?k=`.** The
  one link meant to open her booking straight away landed on the lookup form.
  Fixed; the gate proves `?k=` opens the booking and `?t=` does not.
- **"Cancelled by her" was the only customer message without the shop's
  number**, against the file's own rule. It gained "If you change your mind,
  call us on {shop_phone} …", because a default the editor would refuse is not a
  default.

Everything else is byte-for-byte what commit `3f3baed` sent.

## 7. Gate

`cd site && npx tsx --env-file=.env.local scripts/verify-templates.mts` —
**52/52**, needs the dev server. It reads the pre-templates `messages.ts` out of
git and compares 214 messages byte for byte (rentals, one-day collections, mixed
baskets, a one-day rental, no deadline, braces in a name, with and without time,
reason and token), asserts the two changes above as exactly themselves, checks
every refusal by name, proves the fallback through `notify` against Neon with the
reason in `comms_log`, and drives the panel in real Chrome (a refused save writes
nothing and keeps what she typed; a good one is stored; identical-to-built-in and
"go back" store nothing). The settings row is snapshotted and put back exactly.

Proved to bite (2 Oct): removing send-time validation fails 3 checks; removing
the blank-line collapse fails 2 (the byte-for-byte check and the empty-line check).

## 8. Open

- The panel does not yet ask for a decline or cancellation reason, so `{reason}`
  is always empty today (its description says so).
- WhatsApp and SMS, when they land, will need their own short-form wording; this
  covers email, the only live channel.
