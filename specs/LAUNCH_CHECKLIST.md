# Launch checklist — the 19 points, plus one the audit added

Owner raised 14 September 2026 as a generic "before you ship a site" list. Every
line below was **checked against the running site**, not against intentions:
routes fetched over HTTP, metadata read out of the rendered DOM at 390 and 1440,
alt attributes counted in the live document. The evidence commands are at the
foot of this file so any claim here can be re-run.

Status at audit (14 Sep, revised): **11 done, 4 partial, 4 not started, 1 blocked on the owner.**

Status 17 Sep, after the pre-launch pass: **15 done, 1 correctly deferred, 1 not started, 1 blocked on the owner.** What is left is item 18 (analytics, which needs the owner to choose a provider) and item 19 (her real shop address; the phone now renders a real number).

Status 18 Sep, after the owner chose Cloudflare Web Analytics: **18 done, 2 blocked on the owner.** Items 17 and 18 closed together, because neither one closes alone. The two that remain are not work: item 6 (the favicon set) waits on the logo file, and item 19 waits on her real address. Item 18's code is finished and **rests dark until she supplies a beacon token** from her Cloudflare dashboard, the same way the comms channels rest at `skipped: not_configured`.

| # | Item | Status | Where it stands |
|---|---|---|---|
| 1 | Custom 404 page | **Done** | `app/not-found.tsx`, in the site-audit's seven routes. Wants its own `<title>` (see P1.1). |
| 2 | CTA above the fold | **Done** | Two on the hero — "See what is in for rent", "Plan a visit" — at every width. |
| 3 | Meta title per page | **Done** | 14 Sep: the two double-suffixed titles fixed; 404 titled. |
| 4 | Meta description per page | **Done** | 14 Sep: jewellery, visit, policies and every product now describe themselves; the product's is built from its own row. |
| 5 | Open Graph image | **Done** | 14 Sep: `metadataBase` + og/twitter tags sitewide, 1200x630 JPEG card; products use their own front frame. |
| 6 | Favicon set | **Partial** | `favicon.ico` only; no `icon.png`, `apple-icon`, or manifest. Blocked with the logo. See P3.1. |
| 7 | robots.txt | **Done** | 14 Sep: `app/robots.ts`, disallows `/admin`, points at the sitemap. |
| 8 | sitemap.xml | **Done** | 14 Sep: `app/sitemap.ts`, six static routes plus every slug from `getRentals()`. |
| 9 | Alt text on every image | **Done** | 17 Sep: audited every `<img>` in `app/` and `components/` by tag rather than by line. 47 images, 20 decorative, and all 20 now pair `alt=""` with `aria-hidden="true"`. The "16" in the original count was a line-based grep missing the attribute on the following line; one real offender remained, a thumbnail in `PieceStage`, and it is fixed. |
| 10 | Mobile breakpoints | **Done** | site-audit gates 1920/1440/390; hero-scrim adds Pixel 7. 10 Sep pass made the phone a first-class width. |
| 11 | Sticky mobile CTA | **Done** | 14 Sep: `ActionBar` — call + WhatsApp, appears after the hero, stands down at the footer and for the consent panel. |
| 12 | Loading states | **Done** | 17 Sep: `/` now has a real Suspense boundary. The one query the front door needs was moved into `RailSection` behind `RentalRailSkeleton`, which restates RentalRail's own geometry (same `SectionEdge` seed, same padding, same card widths) so nothing moves when the rail arrives. Proved by the streamed HTML: hero at byte 18,928, skeleton at 32,965, and the real rail appended at 196,681 once Neon answered. CLS 0 across three throttled runs. `/rentals` is deliberately left alone — its masthead, tiles, arcade and grid all need the same query, so a boundary there is a page restructure for a smaller win. |
| 13 | Form error states | **Done** | 17 Sep: every admin field that can carry a message now sets `aria-invalid` and points `aria-describedby` at both its hint and its error, and focus moves to the first bad field in reading order. Gated by `scripts/verify-admin-a11y.mts` (18/18), which asks the browser what a screen reader would be told rather than grepping for attributes. It also found a worse pre-existing bug than the one it was written for: React 19 resets an uncontrolled `<form action={serverAction}>` even when the action FAILED, so a rejected save in Settings discarded everything typed and refilled the stored values. Those fields are controlled now. |
| 14 | Thank-you page | **Done** | 18 Sep: this row was stale — Phase 2 built it. `ReserveFlow` pushes to `/booking/[code]?k=<token>` the moment the request is accepted, and that page is the confirmation: it names the request, walks the Requested -> Confirmed -> Collected -> Returned ladder, and is where she cancels. There is no separate thank-you route and there should not be, because a thank-you that cannot be returned to is worth less than a status page she can bookmark. |
| 15 | Privacy policy page | **Done** | 17 Sep: `/privacy`, in `/policies`' grammar, linked from the footer and the sitemap. Every clause was read out of the code rather than adapted from a template, and `scripts/verify-privacy.mjs` fails if the code stops matching it. Two facts are marked unset rather than invented: the retention period and where to write. |
| 16 | Terms page | **Done** | `/policies` — booking and pre-payment, extensions, damage and care, pickup and return. |
| 17 | Cookie banner | **Done** | 18 Sep: mounted in `SiteChrome`, in the same change that installed analytics, which is the order this row and item 18 always implied. It is deliberately NOT subject to the rule that stands `ActionBar` and `NewStockPopup` down on `/reserve` and `/booking`: those are optional chrome, and consent is neither optional nor deferrable, so a visitor who lands straight on the booking form is asked too. It stays off `/admin`. A withdrawal path was added with it (`CookieChoicesButton`, in the footer), because `openCookieConsent()` had been exported for four days with no caller, which meant a stored yes could not be undone without clearing site data. The panel's "Privacy policy" link pointed at `/policies` from the day it was written and was never revisited because nothing rendered it; it points at `/privacy` now. |
| 18 | Analytics installed | **Done, dark until the token lands** | 18 Sep: Cloudflare Web Analytics, on the owner's choice. `components/site/Analytics.tsx`, mounted inside `AnalyticsGate` so the beacon cannot reach the DOM before consent. Cookieless, so `/privacy` still names two cookies, and it adds no fourth company to clause 04 since Cloudflare already serves the site and runs the bot check. Nothing is counted until the owner pastes a beacon token into `NEXT_PUBLIC_CF_BEACON_TOKEN` and the site is rebuilt. See P2.4 for the build record. |
| 19 | Real contact address | **Blocked on owner** | `TODO(owner)`; `/` renders "Shop address, City" and "+91 00000 00000". See P3.2. |
| 20 | Compressed images | **Done** | 14 Sep: hero 2137 KB -> 124 KB, 18 category JPEGs -> WebP, `fetchPriority` on the LCP image. |

---

## P1 — do before the deploy

Cheap, no dependency on the owner, and all of it is the kind of thing that is
much harder to fix once a URL has been indexed wrong.

**P1.1 — Titles.** Two routes double-suffix, because they write the brand into
their own `title` while `app/layout.tsx` also appends it via `template`:

    /rentals         The Bridal Rental Edit | Vivaah Dresses and Suits · Vivaah Dresses and Suits
    /rentals/[slug]  Sage Rose | To rent | Vivaah · Vivaah Dresses and Suits

Drop the brand from the page's own string and let the template add it. `/` uses a
bare `title` that bypasses the template, which is correct for a home page but
should be `title: { absolute: ... }` so the intent is legible. `not-found.tsx`
inherits the default title and should say the page was not found.

**P1.2 — Descriptions.** `/jewellery`, `/visit`, `/policies` and
`/rentals/[slug]` all serve the root description, which talks about renting
lehengas on a page about shop hours. The product page's should be built from the
row it already loads in `generateMetadata`.

**P1.3 — Open Graph.** Nothing renders an `og:` tag, so every WhatsApp share of
this shop — which is how this shop's customers actually send links — shows a bare
URL. Needs `openGraph` in the root metadata plus a per-route image. The product
page can generate its own from the garment's first frame.

**P1.4 — robots.txt and sitemap.xml.** Both 404. `app/robots.ts` and
`app/sitemap.ts`, with the sitemap enumerating the six static routes plus every
rentable slug from `getRentals()`. Must disallow `/admin`.

**P1.5 — The 16 empty alts.** None is a missing attribute, so this is a
classification job, not a rescue: 12 on `/retail`, 4 on `/`. Each is either
genuinely decorative — then it needs `aria-hidden="true"` next to the `alt=""`,
the way the hero photograph already does it — or it is a garment a screen reader
should hear about, and it needs a real sentence.

**P1.6 — Compress the images.** The one finding in this audit that was not on
the owner's list, and the largest single win available on the site. Measured with
ffmpeg on this machine:

    public/hero/hero-garden.png    2137.5 KB  ->  100.6 KB as WebP q82   (-95%)
    public/categories/*.jpg  (18)                 -319 KB as WebP q82
    public/ total 22 MB: threshold/ 12M, hero/ 6.2M, rentals/ 2.5M, categories/ 1.7M

`hero-garden.png` is the front door's LCP image and it is a photograph stored as
PNG at only 1247x696 — the weight is pure format error, not resolution. It is
being served on the hero of every first visit, which is also where the 3.9s TTFB
already lands. Converting it is a single command and the largest improvement to
first impression available anywhere in this repo.

The site uses 39 raw `<img>` tags and `next/image` nowhere, which is a deliberate
and correct choice here — the images are static `public/` assets and the Workers
adapter would need an image loader configured to do anything else. So the fix is
compression at rest, not adopting `next/image`: convert the PNG and the 18 JPGs
to WebP, keep the originals out of `public/`, and update the `src` strings. The
90 files already in WebP (the spin frames and the stage backdrop) need nothing.

Do this in the same pass as P2.2's `loading`/`fetchPriority` attributes, since
both touch the same tags.

## P2 — do with or just after the deploy

**P2.1 — Sticky mobile CTA.** The single highest-value item on this list for this
particular business. Below `md` the only way to contact the shop is to open the
hamburger. A phone visitor scrolling 8,200px of the front door passes no way to
call or message. A persistent bottom bar carrying the phone number and the
WhatsApp hand-off, appearing after the hero and hiding when the footer arrives.
Note it must not collide with the cookie banner, which is `inset-x-0 bottom-0`
below `md`.

**P2.2 — Loading and error states.** Measured, not assumed:

    app/**            0 loading.tsx, 0 error.tsx, 0 global-error.tsx, 0 <Suspense>
    /                 TTFB 3875ms   17 images, 0 lazy, 8 with no intrinsic dimensions
    /rentals          TTFB 1837ms   17 images, 0 lazy, 16 with no intrinsic dimensions
    /rentals/[slug]   TTFB 1632ms    7 images, 0 lazy
    product stage     blank for 1588ms after DOM ready, then the canvas fades in
    CLS               0.0000 on all three — the aspect-ratio classes are holding

With no Suspense boundary anywhere, `force-dynamic` on `/` and `/rentals` means
the whole document waits on Neon: the 3.9s TTFB on the front door is the browser
being shown nothing at all, not a page assembling. Four pieces of work:

- `loading.tsx` for `/` and `/rentals`, holding the page's real skeleton — the
  hero panel and the rail's card geometry — not a spinner.
- `error.tsx` for both, and a `global-error.tsx`. The shop's real fallback when
  software fails is a phone call, so the error state should carry the number.
- Wrap the rail and the catalogue grid in `Suspense` so the hero, which needs no
  database at all, paints while the query runs.
- The image pass the measurements ask for: `loading="lazy"` on everything below
  the fold (currently one lazy attribute in the entire codebase, on the map),
  `fetchPriority="high"` on the hero, and intrinsic `width`/`height` on the 24
  images that carry none. CLS is 0 today only because the Tailwind aspect classes
  happen to reserve the box — that is luck the attributes should make certain.
- The product stage's 1588ms blank needs to say something. SpinViewer already
  tracks `ready`; it should show the first still under the canvas rather than an
  empty violet field, so the garment is visible while the frame set decodes.

**P2.3 — Privacy policy, and actually mounting the banner.** Corrected 14 Sep:
this was recorded as done because `components/site/CookieConsent.tsx` exists and
is complete — a real panel, a stored choice, an `AnalyticsGate`, focus handling.
Grepping for who renders it returns nothing. It is mounted on no surface, so no
visitor has ever seen it, `useConsent()` is null forever, and the component is
dead code that reads as a shipped feature. The lesson is the same one the rest of
this file was rewritten for: a file existing is not a feature existing.

It should be mounted in `SiteChrome` beside `ActionBar`, which already yields to
it through `useCookiePanelOpen()`. Do that in the same pass as the privacy
section, not before — a banner that consents to analytics nobody has installed,
pointing at a policy that does not exist, is worse than no banner.

The privacy section belongs on `/policies` rather than at a new route, since that
page is already the legal surface: what the consent cookie stores, what analytics
would collect once P2.4 lands, what a booking stores, and how to ask for deletion.

**P2.3b — Privacy policy (original note).** Required by the cookie banner that is already
shipping. Should be a section on `/policies` rather than a new route, since the
existing page is already the legal surface: what the consent cookie stores, what
analytics would collect once P2.4 lands, what a booking stores, and how to ask
for deletion.

**P2.5 — Form error states, finishing the admin wiring.** This is further along
than the checklist's phrasing suggests, and the gap is narrow and specific. All
12 forms in the app are admin forms, and every one of them already uses
`useActionState`, renders its failure in a `role="alert"` paragraph, and disables
its submit button with a changed label while pending. `ProductForm`,
`ContentEditor` and `SettingsForms` additionally render per-field messages.

What none of them does is mark the field itself: there is not one `aria-invalid`
or `aria-describedby` in `app/admin/`. A screen reader hears the error announced
once and then finds nothing wrong with any input, and focus is never moved to the
first bad field. Add `aria-invalid` and `aria-describedby` to each field that can
carry a message, and move focus to the first error on a failed submit.

The public side has no form at all: the booking form is Phase 2 (item 14's
thank-you page belongs to the same build), and today's "hold one" button is a
WhatsApp hand-off through `lib/enquiry.ts`, which has no error state by design
and already degrades to `/visit` while the phone number is a placeholder.

**P2.4 — Analytics. DONE 18 September 2026. Build record.**

The owner chose Cloudflare Web Analytics, which was the provider this section
had already argued for: free with commercial use permitted, cookieless, and
already inside a company the site depends on, so it adds nobody new to the
privacy page.

What was built:

- `components/site/Analytics.tsx` — the beacon, mounted in `SiteChrome` inside
  `<AnalyticsGate>`. It creates its own `<script>` tag rather than rendering
  one, which is not a style choice: `strict-dynamic` admits a script injected by
  an already-trusted script without the policy naming its origin, and that is
  the same route Turnstile takes. Its report is a different matter and
  `middleware.ts` now names `https://cloudflareinsights.com` in `connect-src`.
- `CookieConsent` mounted, and `CookieChoicesButton` added to the footer so a
  stored choice can be withdrawn.
- `/privacy` clauses 04, 05 and 06 rewritten, plus the masthead's "Tracking:
  None", which stopped being true. Cloudflare gains a third job in 04; 05 no
  longer says there is nothing to consent to and states plainly that switching
  it off takes effect from the next page; 06 names the fourth stored key.

**The token is the owner's and nothing counts without it.** She adds the site in
her Cloudflare dashboard under Web Analytics, copies the token out of the JS
snippet it offers, and it goes into `NEXT_PUBLIC_CF_BEACON_TOKEN`. It is
`NEXT_PUBLIC_*`, so it is inlined at build time and needs a rebuild and
redeploy, not a `wrangler secret put`. Keeping it in the `settings` table would
have let her paste it in herself, and was rejected on measured grounds: reading
it in the root layout puts a Neon query on the critical path of every route,
including `/policies`, `/visit` and the 404, which touch no database at all
today, and that property is what the cache-header and bfcache work rests on.

**Gates.** `scripts/verify-privacy.mjs` went from asserting that no analytics
exists to asserting the stronger thing, that exactly one named provider does and
that it cannot render outside the gate (16/16, was 13/13). The new
`scripts/verify-analytics.mjs` (11/11 dark, 15/15 with a token) asks the network
rather than the source, because source-level proof that `<Analytics />` sits
inside `<AnalyticsGate>` is not proof that the browser stays away from
Cloudflare, and this project has been caught by that exact gap before with the
font preload.

**Two things the gates taught, both worth keeping.** The beacon does not report
on a timer; it flushes when the document goes away, so the check had to navigate
like a visitor instead of waiting longer. And when `cloudflareinsights.com` was
deliberately taken back out of `connect-src` to prove the check bites, the
report silently never happened while `securitypolicyviolation` stayed quiet —
a refused beacon send raises nothing the document can hear. The request watcher
caught it; the violation listener did not.

**One thing the owner should know before it goes live.** Consent-gating means
most visitors will never be counted, because most people ignore a cookie panel,
so the numbers will read low against reality rather than wrong. Cloudflare Web
Analytics is cookieless and stores nothing on the device, so running it ungated
is a defensible position that many privacy-conscious sites take, and it would
also let the banner come back down. That is a change of one wrapper and a
rewrite of the same three clauses, and it is hers to make, not ours.

## P3 — blocked on the owner

**P3.1 — Favicon set.** Waits on the logo file for `site/public/brand/`. When it
lands: `icon.png` at 32 and 192, `apple-icon.png` at 180, and a manifest. The
preloader's interim drawn wordmark is replaced in the same pass.

**P3.2 — Real contact address.** Already tracked in CLAUDE.md. Worth noting one
consequence found in this audit that is not obvious from the TODO: the map on the
front door embeds `?q=Vivaah+Dresses+and+Suits`, which resolves to nothing, so the
close of the home page is a 590×442 empty grey rectangle. Until the address
lands, that iframe should not render — a blank box reads as broken in a way a
missing box does not.

---

## Re-running the evidence

With `cd site && npx next dev --webpack` up:

    # routes, robots, sitemap, OG
    for f in /robots.txt /sitemap.xml /opengraph-image; do \
      curl -s -o /dev/null -w "%{http_code} $f\n" http://localhost:3000$f; done
    curl -s http://localhost:3000/ | grep -o '<meta[^>]*og:[^>]*>'

    # titles, descriptions, alt text, h1 count per route
    cd scrollcraft/builds/vivaah && node probe-checklist.mjs

The two deploy gates are unchanged and are not part of this list:
`node site-audit.mjs` and `node hero-scrim-verify.mjs` from
`scrollcraft/builds/vivaah/`.
