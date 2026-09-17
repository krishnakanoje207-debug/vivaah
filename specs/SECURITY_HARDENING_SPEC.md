# Security hardening spec — Phase 5, second half (17 September 2026)

`BUILD_PLAN.md` calls Phase 5 "Comms + hardening". The comms half shipped on
17 September (`specs/COMMS_FLOW_SPEC_V2.md` §7). This is the hardening half, and
it is scoped to the three items `CLAUDE.md` has carried as open since the
10 September security pass:

> admin login rate limiting is an in-process `Map` that Cloudflare's isolate
> model defeats (needs the planned Upstash window), sessions cannot be revoked
> before their 7-day expiry, and the CSP is `frame-ancestors` only.

Each is stated below as the threat first, because two of the three turn out to
have a cheaper answer than the one that was written down, and the threat is what
decides whether the cheaper answer is good enough.

---

## S1. Brute force against the admin login

### The threat

`ADMIN_USER` and `ADMIN_PASSWORD_HASH` are one username and one password for the
whole business. Anyone who guesses them can read every customer's name, phone
number and address, confirm or cancel any booking, and rewrite the catalogue.
There is no second factor and there is nobody else to notice.

### Why what is there does not work

`app/admin/login/actions.ts:19` keeps attempts in a module-level `Map`. It says
so itself: the TODO on line 15 already names Upstash. On Cloudflare that Map is
per-isolate. Cloudflare will happily run many isolates for the same Worker, and
an attacker distributing requests gets five attempts *per isolate*, not five in
total. The Map also empties on every deploy. It is not a rate limit, it is a
speed bump on one machine.

### What is built

**Two things, because one of them is blocked on the owner and the other is not.**

**S1a. Turnstile on the login form (unblocked, ships now).** The booking form and
the booking lookup already carry it, the component is written, and the server
helper already stands in Cloudflare's always-pass test secret outside
production. A bot check does not stop a determined human, but it is what turns
"a script tries ten thousand passwords" into "a script cannot submit the form at
all", and it costs nothing per month and needs no account. This is the larger
share of the real protection and it is available today.

**S1b. Upstash sliding window (blocked on credentials, degrades safely).**
`lib/rateLimit.ts` speaks Upstash's REST API over `fetch`, so it runs in a
Worker with no Node built-ins. A sliding window log per key: drop the entries
older than the window, count what is left, add the current hit, expire the key.

Hand-rolled rather than `@upstash/ratelimit` because it is about sixty lines,
because it is the only rate limiter this site needs, and because the alternative
is two dependencies in a bundle that this project has just spent a performance
pass shrinking.

**Degrading.** With no `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` the
limiter falls back to the existing in-process Map and **says which of the two
answered**, in the same spirit as the comms layer's logged skips: a limiter that
quietly does nothing is worse than one that is absent, because it looks present.
If Upstash is configured but errors, the limiter **fails open** onto the same
fallback rather than closed. Failing closed on a transient network error would
lock the owner out of her own shop, and the request still has to get past
Turnstile.

### Surfaces

| Surface | Key | Window |
|---|---|---|
| admin login | IP | 5 per 15 min |
| booking create | IP | 10 per hour (the per-phone limit in `lib/booking.ts` stays; it catches a different thing) |
| booking lookup | IP | 10 per 15 min (it takes a code and a phone, so it is guessable) |

---

## S2. A session cannot be revoked

### The threat

The token is `<exp>.<HMAC(secret, exp)>` (`lib/adminAuth.ts`). It carries the
expiry and nothing else. Two consequences, and the second is the serious one:

1. Two sessions minted in the same second are byte-identical. There is no
   session identity at all.
2. **Nothing can be taken back.** `logout()` deletes the cookie in the browser
   it was called from; the token itself stays valid for the rest of its seven
   days. A token captured from a shop computer, a borrowed phone, or a browser
   left logged in cannot be stopped. The only revocation available today is
   rotating `SESSION_SECRET`, which is a secret push and a redeploy.

### What is built

**Not a session store.** There is exactly one admin. Per-session revocation
would mean issuing ids, storing them, and reading that store on every request,
to express something this business never needs: "log this one device out, keep
the others." What it needs is "stop every session that exists now", and that is
a single timestamp.

- The token gains an issued-at: `<exp>.<iat>.<HMAC(secret, "exp.iat")>`.
- `settings` gains `admin.sessions_valid_from` (a key/value jsonb table already,
  `is_public` false so the storefront role cannot read it).
- A session is valid only if `iat >= sessions_valid_from`.
- Settings gets **"Sign out of every device"**, which sets that timestamp to now
  and ends every session including the one that pressed it.

**Old tokens are rejected, not migrated.** A two-part token no longer parses, so
the owner logs in once more after this ships. That is the correct outcome for a
change whose entire purpose is to be able to invalidate sessions.

**`logout()` still only clears the cookie**, deliberately. For a single admin,
bumping the timestamp on every logout would mean signing out at the shop counter
also signs her out on her phone, which is surprising in a way that teaches
people to distrust the button. The explicit control is one click away and says
exactly what it does.

### Where it is enforced

`requireAdmin()` (every mutating action) and the `(panel)` layout (every
authenticated page). **Middleware deliberately keeps only the cheap signature
and expiry check and is not authoritative.** Middleware runs on the Edge, and
making it authoritative means a database read in front of every admin request;
it is also the layer that had the bypass CVE this project patched on
10 September, which is a reason to depend on it less, not more. Nothing renders
inside `/admin` except through that layout, and no action mutates without
`requireAdmin()`, so the DB-backed check sits on both real paths.

---

## S3. The CSP is `frame-ancestors` only

### The threat

`next.config.ts` ships `Content-Security-Policy: frame-ancestors 'self'`, which
stops the admin panel being framed and does nothing else. There is no
`script-src`, so any injected script executes: a stored XSS in a product name, a
review, or an owner-edited content block would run with full access to the admin
session. The site renders owner-supplied text in a lot of places.

### Why not nonces — and why that was wrong

This spec first argued against nonces. A nonce must be minted per request, which
means middleware on every route and reading `headers()` in the root layout, and
that opts the whole site into dynamic rendering. Against a performance pass that
had just finished, the plan was to authorise the one inline script this site
writes — `SKIP_SCRIPT` in `components/site/Preloader.tsx` — with a `sha256-`
hash, keeping every page static.

**That plan does not survive looking at a rendered page.** The document carries
about thirty more inline scripts, and they are Next's own streaming payload
(`self.__next_f.push(...)`), whose contents change per page and per build. There
is nothing to hash. A hash-based `script-src` would have had to fall back to
`'unsafe-inline'`, which is the thing this item exists to remove. The original
note in `CLAUDE.md` — that this needs nonces — was right.

**And the cost was overestimated, which the route table settles.** Before this
change exactly four entries were static: `/policies`, `/visit`, the 404, and
`/admin/login`. Everything else was already dynamic. None of the four touches the
database, so what `PERF_PLAN` §2.8 is actually worried about — a per-request
render waking a suspended Neon instance — does not apply to any of them. The bill
for closing `script-src` site-wide is three content pages and a login form
rendering per request.

### What is built

A nonce per request in `middleware.ts`, set on both the request and the response
header. Next reads it back out of the request header and stamps its own scripts;
the preloader's inline script takes it as a prop through `app/page.tsx`. Reading
`headers()` in the root layout is what opts every route into the dynamic
rendering a nonce requires — without that, `/policies` and `/visit` would still
be served from build-time HTML whose Next scripts carry no nonce, and the policy
would block them.

`'strict-dynamic'` means a script trusted by its nonce may load others. That is
how Turnstile is allowed: our own client code injects its `<script>`, so it
inherits trust rather than being named in an allowlist.

`style-src` keeps `'unsafe-inline'`. Inline style *attributes* need it, the site
sets custom properties on elements throughout (the `--i` stagger the performance
pass introduced, the hero scrim, the preloader), and there is no hash or nonce
form that covers an attribute. This is the ordinary trade: `script-src` is where
injection becomes code execution, and that is the one being closed.

Third parties, each present for a reason already in the repo: Turnstile
(`challenges.cloudflare.com`) for frames, connections and its `blob:` worker,
and Google Maps for the front page's embed.

### The file stays `middleware.ts`, which Next 16 deprecates

The build asks on every run for this to be renamed to `proxy.ts`, and it was
renamed, and then put back. Next's own reference settles it: "Proxy defaults to
using the Node.js runtime. The `runtime` config option is not available in Proxy
files." The rename therefore moves this file off the Edge runtime, and
`@opennextjs/cloudflare` answers that build with "Node.js middleware support is
experimental in cloudflare, and not officially maintained by OpenNext
maintainers."

This file carries the admin redirect and the security policy. Neither belongs on
an experimental adapter path, and this project has already lost time to one
Next/OpenNext runtime mismatch. So the deprecation notice is accepted and the
supported runtime is kept, the same trade already made for `--webpack`. Revisit
when the adapter supports Node middleware, or when Next removes the convention.

### The failure mode, and the gate

The quiet failure is the preloader's inline script losing its nonce: the browser
refuses it, repeat visitors sit through the preloader every time, and nothing
looks broken. `scripts/verify-csp.mjs` asks the running site instead of reading
the source, because every way this breaks is a runtime one — a matcher that
stops covering a route, a second policy intersected with this one, a nonce that
is minted but never reaches the markup. It checks each document route for the
policy, for a nonce, for the absence of `'unsafe-inline'` in `script-src`, that
**every** inline script in the HTML carries that request's nonce, and that two
requests do not share one.

The existing gates catch the rest without being changed: `site-audit.mjs` fails
a route that logs a console error, and a blocked script logs one; and
`verify-booking-e2e.mts` waits for Turnstile to issue a token, which cannot
happen if its origin is refused.

---

## 4. What "done" means

Every existing gate stays green — verify-schema, verify-booking,
verify-booking-e2e, site-audit, hero-scrim, verify-font-preload, `tsc` — plus:

- `scripts/verify-csp.mjs`: the policy carries the live hash of `SKIP_SCRIPT`.
- `scripts/verify-session.mts`: a token issued before a revocation is refused
  and one issued after it is accepted; an old two-part token is refused.
- site-audit proves no route logs a CSP violation, and the end-to-end gate
  proves Turnstile still works under the policy.

## 5. Blocked on the owner

- **An Upstash account** (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
  → S1b becomes real across isolates. Until then S1a plus the in-process
  fallback is what is protecting the login, and the limiter reports which one
  answered.
- Nothing else. S2 and S3 ship complete.

---

## 6. Build record (17 September 2026)

All three shipped. Two of the three were built differently from the way this
spec first described them, and both corrections are above rather than quietly
applied: S3's hash plan was wrong on the facts, and the `proxy.ts` rename was
tried and reverted.

### 6.1 What moved

| | Before | After |
|---|---|---|
| Login | password only, behind a per-isolate `Map` | Turnstile + a sliding window (`lib/rateLimit.ts`) |
| Session token | `<exp>.<sig>` | `<exp>.<iat>.<sig>`, with a revocation floor in `settings` |
| Revocation | rotate `SESSION_SECRET` and redeploy | "Sign out of every device" in Settings |
| CSP | `frame-ancestors 'self'` | 13 directives, nonce + `'strict-dynamic'`, no inline script |
| Middleware matcher | `/admin/:path*` | every document route, with the admin redirect scoped inside |

### 6.2 The bug the gate caught in its own author

`revokeAllSessions()` was written with `Math.floor(Date.now()/1000) - 1`,
reasoned out in a comment as catching a session minted in the same second. It
does the exact opposite: validity is `iat >= floor`, so subtracting a second
*lets through* everything issued in the second before the revocation as well.
`verify-session.mts` failed on it immediately — a session issued before the
revocation was still above the floor — and it is `+ 1`. Worth recording because
the comment was confident and wrong, and only the test disagreed.

### 6.3 Gates

| Gate | Result |
|---|---|
| `scripts/verify-session.mts` | **16/16** (new) |
| `scripts/verify-csp.mjs` | **88/88** (new; also 88/88 against the built Worker) |
| `scripts/verify-schema.mjs` | 18/18 |
| `scripts/verify-booking.mts` | 38/38 |
| `scripts/verify-booking-e2e.mts` | 64/64 |
| `site-audit.mjs` | 396/396 |
| `scripts/verify-font-preload.mjs` | 8/8 |
| `tsc` | clean |

Three things were checked in a browser that no gate asserts, because they are
about the owner being able to get in rather than about the site being right:

- Turnstile issues a token on the login form and the hidden field receives it.
- A wrong password returns "Incorrect username or password", not the bot-check
  message, which is what proves the challenge passed and the credential path ran.
- The window closes: four credential failures, then "Too many attempts" on every
  subsequent try. The same boundary was checked over plain HTTP against
  `/api/bookings/lookup`, which allowed exactly ten and then answered 429.

And on the **built Worker** under `wrangler dev`, not just in dev: the production
policy is served (no `'unsafe-eval'`, no `ws:`, with `upgrade-insecure-requests`)
and `/admin` still answers 307 to the login page.

### 6.4 What is still not true

`lib/rateLimit.ts` reports `backend: "memory"` until the owner has an Upstash
account, and the memory window is per-isolate — the very weakness S1 is about.
What actually changed for the login today is Turnstile. The limiter is real code
on a real path and becomes a real limit the moment two environment variables
exist; until then it is one isolate's opinion, and it says so.
