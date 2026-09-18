# Performance plan, measured 17 September 2026

This document is the measurement round, not the fixing round. Nothing in the site
was changed to produce it. Every number below came off the deployed Worker at
`https://vivaah.vivaah.workers.dev` with Lighthouse 13 driving real Chrome
(`C:/Program Files/Google/Chrome/Application/chrome.exe`), and where a claim
needed a cause rather than a symptom it was traced back into the source and the
file and line are named.

The ordering is by measured cost, not by how interesting the fix is. Section 4
is separate on purpose: it holds the things that would raise the score by taking
the design apart, and they are written down so that nobody quietly does one of
them while chasing a number.

---

## 0. A correction to `CLAUDE.md` before anything else

`CLAUDE.md` says the live deploy is from 19 July and is therefore older than the
tree. That is no longer true, and it matters, because it is the difference
between measuring a fossil and measuring the site. The deployed HTML carries the
Arcade head, the `RoomIndex`, `MograGarland` and `PatternSeam` on `/rentals`, the
Kombai garden hero on `/`, and `/reserve` answers 200 with a real booking form.
Those are the 9 to 16 September builds. What is live is at least the 15 to 16
September state, which is to say Phase 2, and the only work that is plainly not
in it is the 17 September retail commits at the head of `main`.

So the numbers below describe the site the owner is actually looking at, and
every cause named in section 2 was verified to still be present at `HEAD`, not
just in the deployed bundle. The status line in `CLAUDE.md` should be corrected
when someone next touches it.

---

## 1. What was measured

Lighthouse was run three times per route on mobile to see through the noise of a
real network. The mobile configuration is Lighthouse's own: a 4x CPU throttle and
a simulated slow 4G link, which is the right lens for this shop, whose customers
are on mid-range Android phones (`BRIEF.md` §4).

| Route and form factor | Score | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|
| `/` mobile (3 runs) | **56, 59, 58** | 1.5 to 1.6 s | 2.9 to 4.4 s | 560 to 1150 ms | **0.161** every run | 6.5 to 7.5 s |
| `/` desktop | **85** | 0.8 s | 1.3 s | 110 ms | 0.004 | 4.5 s |
| `/rentals` mobile (3 runs) | **62, 54, 46** | 1.7 to 1.8 s | 2.4 to 5.2 s | 1050 to 1720 ms | 0.025 | 5.8 to 8.3 s |
| `/rentals` desktop | **72** | 0.8 s | 2.7 s | 140 ms | 0 | 7.2 s |
| `/rentals/sage-rose` mobile | **71** | 1.4 s | 3.0 s | 680 ms | 0 | 6.7 s |

**ROUND TWO, 18 September 2026, against deployed `a9a4fb8a`.** Four mobile runs
and one desktop, Lighthouse 13.4.1, same lens:

| | before this round | after |
|---|---|---|
| `/` mobile page weight | 1104 KB over 38 requests | **668 KB over 34** |
| `/` mobile CLS | 0.161 on 1 run in 10 | **0.0000, 0.0000, 0.0000, 0.0007** |
| `/` mobile score | 48-79 across ten runs | 56, 76, 77, 64 |
| `/` desktop | 96 | 94, LCP 0.9 s, FCP 0.6 s |
| `bf-cache` audit | 2 failure reasons | **passing** |
| `image-delivery-insight` | est. 354 KiB | est. 70 KiB |
| `render-blocking-insight` | est. 210 ms | est. 10 ms |
| `layout-shifts` | 1 shift found | none found |

**Read the score band honestly: it has not moved much, and it was never going to
tell us anything.** It is dominated by LCP, which ranged 2.6 s to 5.3 s across
these four runs on one unchanged page — network weather against a Worker and a
Neon instance that suspends when idle. What did change is deterministic and does
not need a lucky run to show: 436 KB less on every first visit, the layout shift
gone by construction rather than by winning a race, and the back button restoring
instantly on the nine pages a customer actually browses.

What Lighthouse still names is now small and all of it is recorded above as a
decision rather than an oversight: 70 KiB of image delivery (the remainder is
`NewStockPopup` and `jewellery/[slug]`, both unverifiable while the database is
empty), 12 KiB of legacy JavaScript (Lighthouse overstates it eightfold; the
real block is ~1.4 KB raw and removing it costs the compatibility floor for
un-updated Android), 49 KiB of unused JavaScript (framework), and 10 ms of
render-blocking CSS, where the small file is the one carrying the fallback font
metrics and must block.

**AFTER, measured by the owner 18 September 2026, 11:43-11:45 IST, against the
deployed Worker `6494f41d`** (Lighthouse 13.4.1, emulated Moto G Power, slow 4G
— the same lens as the baseline above; both reports are `lighthouse obile.pdf`
and `lighthouse desktop.pdf` at the repo root):

| Route and form factor | Score | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|
| `/` mobile | **74** (was 56 to 59) | 2.0 s | 3.0 s | 760 ms | **0** (was 0.161) | 3.1 s (was 6.5 to 7.5) |
| `/` desktop | **96** (was 85) | 0.8 s | 1.1 s | 20 ms | **0** | 1.4 s (was 4.5) |

Accessibility 100, Best Practices 96, SEO 100 on both.

Two of those are worth pausing on. **The mobile 74 is above the 72 that §2.7
measured as this page's ceiling with every animation stood down** — the motion
is no longer what is costing the score, so §4's trade is not the one on the
table any more. And **CLS is 0 on the phone**, which is the 0.161 this document
opens with, gone: that is item 2.3 finally doing in production what it was
always measured doing, after a day shipping as a no-op (see the correction in
§2.3).

What Lighthouse still names, in its own order — mobile: image delivery (est.
437 KiB), forced reflow, the network dependency tree, render-blocking requests,
legacy JavaScript (12 KiB), JS execution 5.4 s, main-thread work 12.2 s, back/
forward cache refused for 2 reasons, 14 long tasks. Desktop: image delivery
(438 KiB), render-blocking (est. 70 ms), forced reflow. Every one of those was
already predicted by §2.2, §2.9 and §2.5 and none of them is new.

The owner's reported 56 is the home page on a phone, reproduced exactly on the
first run. Read the mobile column as the real one and the desktop column as the
alibi: on a laptop over a fast link this site is respectable, and on a phone it
is not, which is the audience it was built for.

Three of these numbers are worth pausing on, because they do not behave the way
the others do.

**CLS on `/` is 0.161 in all three runs, to the third decimal place.** Nothing
else here is that reproducible. A perfectly repeatable layout shift is not
network weather, it is a bug with a single cause, and Lighthouse names it (item
2.3).

**Speed Index is poor everywhere and it is worst where the page is fastest.**
`/rentals` on desktop paints its largest element at 2.7 s and then takes 7.2 s to
be called visually complete. `/` on desktop is 1.3 s to LCP and 4.5 s to Speed
Index, which scores 0.06 out of 1. Speed Index measures how long the viewport
keeps changing, so a page that never stops moving can never finish. That is not
an accident of this site, it is the design (item 2.5).

**Total Blocking Time is the largest single deduction on `/rentals`.** At 1050 to
1720 ms against a 200 ms target it costs almost the whole 30% that TBT is worth.
The main thread breakdown says where it goes: on `/rentals` mobile,
`paintCompositeRender` 6572 ms and `styleLayout` 5209 ms, against
`scriptEvaluation` of only 2334 ms. This page is not slow because of how much
JavaScript it runs. It is slow because of how much it paints.

---

## 2. Causes, in the order they should be fixed

### 2.1 A Postgres driver is being downloaded by every visitor

**Measured.** `/_next/static/chunks/6283-8a443fb52dfebd0b.js` is 141,574 bytes
raw, 45 KB over the wire, and it loads on `/` and on `/rentals` and on the
product page. Lighthouse's unused-JavaScript audit reports 36 KB of it is never
executed. Pulling the chunk down and reading its string table settles what it is:
`authenticationSASLContinue`, `BackendKeyDataMessage`, `bindComplete`,
`asciiToBytes`, `Attempt to write outside buffer bounds`. That is the Postgres
wire protocol and a Node `Buffer` polyfill, shipped to a phone.

**Cause, exactly.** `components/site/SelectionTray.tsx:9` reads

```ts
import { formatINR } from "@/lib/rentals";
```

`lib/rentals.ts` is server code and says so in its own first line, because it
imports `sqlPublic` from `lib/dbPublic`, which imports `neon` from
`@neondatabase/serverless`. `SelectionTray` is a client component and it is
mounted in `components/site/Nav.tsx:92`, so it is on every page of the site. The
irony is that `lib/rentals.ts:78` is nothing but `export { formatINR } from
"@/lib/format"`. The tray is dragging the entire database client across the
network in order to re-export a rupee formatter that already lives in a
client-safe module.

**Fix.** Change that one import to `@/lib/format`. Then stop it coming back by
putting `import "server-only"` at the top of `lib/rentals.ts`, `lib/db.ts`,
`lib/dbPublic.ts` and `lib/booking.ts`, which turns this class of mistake into a
build error instead of a 141 KB regression nobody notices.

**Risk to the design.** None. Nothing renders differently.

**Effort.** Minutes for the import, an hour with the guards and a rebuild to
confirm the chunk is gone.

### 2.2 The photographs are heavier than their frames, and one of them is absurd

**Measured.** Lighthouse's image-delivery insight estimates 542 KiB of savings on
`/` and 484 KiB on `/rentals`, which on the home page is roughly a third of the
1595 KiB the page weighs. The worst single offender is
`/categories/rajasthani-poshak.webp` at 178,130 bytes, of which 136 KB is waste
on `/` and 160 KB is waste on `/rentals`. On the home page that file is rendered
into `img.h-11.w-11.rounded-full`, which is a 44 by 44 pixel circle. A 178 KB
photograph is being fetched, decoded and thrown away to fill a thumbnail the size
of a fingernail.

The rest of the set is not oversized so much as unevenly encoded. Every category
master is 660 by 880 and they range from 41 KB (`ready-to-wear-sarees.webp`) to
178 KB (`rajasthani-poshak.webp`) for the same dimensions and the same subject
matter. Lighthouse's own reasons split accordingly: some files are flagged
"larger than it needs to be (660x880) for its displayed dimensions" and some are
flagged "increasing the image compression factor could improve this image's
download size". The hero is in the second group: `/hero/hero-garden.webp` is
127 KB with 83 KB called waste.

**Fix.** Two separate pieces of work that should not be confused with each other.
Re-encode the outliers so the set is internally consistent, checking each one by
eye against a rendered screenshot rather than against a quality number, because
this owner is judging fabric colour in these frames. Separately, produce a small
variant, something like 96 by 96, for the 44 pixel avatar use on `/`, which needs
no full-size master at all.

**Risk to the design.** Low, and only if it is done by number instead of by eye.
The standing project rule is to verify by rendering, and it applies here more
than anywhere: a renter is judging a colour she will wear.

**Effort.** Half a day, most of it looking at before-and-after screenshots.

### 2.3 CLS 0.161 on `/` is one font, arriving late, re-wrapping one block

**Measured.** Lighthouse's CLS culprits table attributes the entire 0.1606 to a
single element, `section.on-dark > div.relative > div.relative > div.hero-copy`,
with the cause given as "Web font loaded" and the resource named as
`/_next/static/media/75a7cfd2a925650a-s.p.woff2`. Parsing the deployed font
stylesheet maps that file to **Bodoni Moda, normal, latin subset**, 46 KB.

There is a second fact that explains why it is so bad. The deployed HTML contains
**no font preload at all**. There are eleven `<link rel="preload" as="image">`
tags in the home page's head and not one `as="font"`. The fonts are therefore
discovered only after the render-blocking stylesheet has arrived and been parsed,
which on a throttled phone is a second or more after first paint. Next does
generate a metric-matched fallback for Bodoni (`size-adjust: 114.22%`,
`ascent-override: 98.50%`) and it is in the family list, so the shift is not a
naive metrics mismatch. It is a re-wrap: at `--text-threshold` scale, a fallback
that is 14% wider per character breaks the line in a different place, and when
the real face lands the block above everything else on the page changes height.

CLS is 25% of the Lighthouse score. A 0.161 scores 0.73 where 0 scores 1. This
one item is worth roughly seven points on `/` and it is invisible on desktop,
where the same page measures 0.004 because the line does not re-wrap at that
width.

**Fix, cheapest first.** Preload the two Bodoni latin files from the document
head, which is the whole fix if the font arrives before the hero copy is painted.
If a shift survives that, give `.hero-copy` a reserved height per breakpoint so a
re-wrap cannot move the page under it. Note while doing this that the italic face
(`f80cb781c460424b-s.p.woff2`, 53 KB) is downloaded on every route to serve v2's
"one editorial accent per section" convention, which is worth a deliberate
decision rather than an inheritance.

**FIXED, 17 September 2026, and the cause was not what this section assumed.**
The section above reads as though nobody had asked for a preload. In fact
`next/font` had asked: it marks every preloadable subset with a `.p.` in the
filename, and `75a7cfd2a925650a-s.p.woff2` is one of them. It then looks the
route up in `.next/server/next-font-manifest.json` at render to decide what to
emit, and **on this project that manifest is empty in production**. The
Turbopack dev build fills it with twelve routes and `appUsingSizeAdjust: true`;
`next build --webpack` leaves `app: {}` and `appUsingSizeAdjust: false`. So no
route has ever shipped a single `<link rel="preload" as="font">`, on any page,
since the build moved to `--webpack`.

That ties this item to a decision recorded elsewhere in `CLAUDE.md` for an
unrelated reason: the build is on `--webpack` because Turbopack output breaks
OpenNext at runtime. The flag was adopted to keep the Worker alive and it has
been quietly costing every font preload on the site. It is worth re-testing
whichever way when `opennextjs-cloudflare` ships Turbopack support.

The fix is `site/lib/fontPreload.ts` plus a rendered `<link rel="preload">` per
file in the root layout, covering the two Bodoni latin faces: the h1 sets one word in
italic, so the roman and the italic share a line and either arriving late
re-wraps it. The other eight `.p.` files are deliberately left alone —
Instrument Sans falls back to Arial at size-adjust 102.74% and was not among
Lighthouse's culprits, and the Devanagari faces are dormant until Phase 4.

Measured, 412x915 at 4x CPU and a 1.6Mbps/150ms link, the same probe against
both:

| | Bodoni discovered | finished | vs first paint | CLS |
|---|---|---|---|---|
| deployed, no preload | 1735 to 2025 ms | 3639 to 3881 ms | after | **0.1306**, attributed to `.hero-copy` |
| local build, preload | **224 to 402 ms** | 1236 to 1511 ms | **before** | **0, 0, 0** |

**Correction, 18 September 2026, found while verifying the deploy.** For a day
this fix shipped as `ReactDOM.preload` and did nothing. In a production build
that call emits only a Flight hint — `:HL["/_next/static/media/...woff2","font",
...]` — inlined into the BODY, at byte ~84,000 of `/`, and acted on by the
client runtime only once the React chunks have loaded and run. That is later
than the stylesheet, which is the discovery this item exists to beat. Not one
route on the deployed Worker served a `<link rel="preload" as="font">`, and the
same bundle under `wrangler dev` returned a byte-identical document, as did
`next dev`, so it was the API and not Cloudflare, not the adapter and not the
Suspense boundary on `/`.

The table above was measured, and the reading that fits every fact is that it
was measured on a version that rendered the `<link>` — the layout's own comment
records seeing each font twice in the markup, which only a rendered link can
do — and that the tidy-up to `ReactDOM.preload`, made to stop the duplication,
came after the numbers and was never re-measured. The duplicate tag is the cost
of the mechanism working. Browsers dedupe by URL and fetch once.

**Second correction, 18 September 2026: this section blamed the wrong thing
twice, and the real cause was never a font problem at all.** The hero h1 was
capped at `max-w-[17ch]`. `ch` is the width of a "0" in whichever face is LIVE,
so that one rule computed a different box before and after Bodoni arrived —
20.30px per ch under Bodoni (350.5px, three lines) against 18.34px under the
generated fallback (317.4px, four lines). `.hero-copy` is `items-center` inside
a 100svh flex box, so the lost line moved the block 17px, which is the whole
0.13 to 0.16. Held at a FIXED width the two faces break within 5px of each other
(350 against 345): the metric-matched fallback was doing its job on the glyphs
the entire time. `size-adjust` cannot fix it either, because it scales `ch` and
every glyph advance by the same factor and the wrap is invariant to it.

So the preload never removed the shift — it won a race. Isolated by delaying one
file per load against the live origin: delay the Bodoni ROMAN and CLS is 0.1299
every time; delay the italic, or delay Instrument Sans, and it is 0.0000. The
italic adds nothing, and Instrument Sans is not in the h1 at all, so **the two
faces this document and `lib/fontPreload.ts` both named as the culprits were
named because they finished near the shift, not because they moved anything.**
With no preload at all it shifted 6 times in 6; as deployed, 3 in 12; across ten
Lighthouse runs on the deployed page, 1 in 10 — which is why one run reports
0.161 and the next reports 0.

The fix is `max-w-[10.7em]` (`em` resolves against font-size, which does not
change when the face swaps). It reproduces today's Bodoni line count at all ten
widths from 360 to 2560 and gives the same count under the fallback, Times,
Georgia, Noto Serif — what an Android phone actually substitutes — serif,
Cambria, Constantia and Garamond. The box moves 0.6px at 412. Verified
independently at those ten widths with the font requests aborted: identical line
counts, and `max-width` now resolving to 349.89px either way.

**And the table at the top of this document is wrong about desktop.** It records
CLS 0.004 on `/` desktop, and this section reasoned that the line does not
re-wrap at that width. It does: at 1920 the same mismatch is there, 3 lines
under Bodoni against 4 under the fallback. Desktop simply wins the race more
often.

The gate could not see any of this, and that is the more useful lesson: it read
`.next` and proved the FILES were right while the PAGE asked for nothing.
`scripts/verify-font-preload.mjs` now also fetches the served document and
asserts the link is inside `<head>`, on one route with a Suspense boundary and
one without. It needs a running site now, and it fails 8/12 against the
`ReactDOM.preload` version — checked, rather than assumed, by putting that
version back.

Discovery moves about 1.5 s earlier, which puts both faces in place before
first paint, so there is no re-wrap left to shift anything. The reserved
`.hero-copy` height this section holds in reserve was not needed and was not
built.

Two honest caveats. The "after" column is a local `next start`, not the Worker,
so the origin differs and only the deployed number is like-for-like with the
rest of this document; the causal chain (discovery time, and finishing before
rather than after paint) is what is being claimed, not the absolute timings.
And preloading ~100KB does put it on the critical path, where item 2.4 warns
about contention with the LCP image — worth confirming with a Lighthouse run
once this is deployed.

Because the URLs are content hashes written by hand, a font change would 404
them silently and the CLS would come back with nothing looking broken.
`site/scripts/verify-font-preload.mjs` is the guard: it asserts each file is in
the build, is still referenced by the built CSS, and that the manifest is still
empty, so if a future Next or adapter starts preloading on its own the
hand-written links are reported as redundant rather than left to duplicate. It
needs `.next`, nothing else, and passes 8/8.

**Risk to the design.** None for the preload. Reserving the hero copy's height is
a layout constraint that has to be checked at 390, 768, 1440 and 2560, but it
changes nothing a visitor sees when it is right.

**Effort.** An hour for the preload and a verification run. A day if the reserved
height turns out to be needed at every breakpoint.

### 2.4 Every image is eager, and React preloads all of them

**Measured.** Across `app/` and `components/` there are 50 `<img>` tags in 30
files and exactly one `loading="lazy"` (`app/page.tsx:611`). React 19 emits a
`<link rel="preload" as="image">` for every image in the server-rendered payload,
so the home page's head contains eleven image preloads and `/rentals` ten,
including `rajasthani-poshak.webp` at 178 KB. On a simulated slow 4G link these
all contend with each other, with the two 46 to 53 KB font files and with the LCP
image. The home page fetches 12 images totalling 1131 KiB before load, none of
which except the hero is above the fold.

The code already half-knows this. `app/page.tsx:104` carries the comment "The LCP
image on every first visit, so it is told to jump the queue: without this it
competes with the sixteen other images on the page, none of which is above the
fold", and it applies `fetchPriority="high"`. The diagnosis was right and only
one half of the treatment was applied: the hero was promoted, and the sixteen
were never demoted.

There is a related detail worth fixing at the same time. Lighthouse reports the
LCP element on `/` as `div.hero-frame > div.hero-subject`, which is a **second**
render of the same `hero-garden.webp` inside the masked subject layer, and that
copy carries no priority hint (`HeroPlate` takes `priority` as a prop and only
one of the two call sites passes it). The LCP discovery checklist accordingly
fails both "fetchpriority should be applied" and "request is discoverable in the
initial document".

**Fix.** `loading="lazy" decoding="async"` on everything that cannot be in the
first viewport. Leave the hero alone, and leave alone anything the Arcade will
turn over within its 3400 ms hold, because a lazy image that the arcade is about
to show is a blank frame. Make the LCP copy of the hero the one that carries the
priority hint.

**Risk to the design.** None below the fold. The one place to be careful is the
Arcade, where lazy loading the next category would break the turnover.

**Effort.** Half a day, mostly deciding per call site which side of the fold it
is on.

### 2.5 The decorative SVGs never stop, and Speed Index never finishes

**Measured.** `/rentals` at 390 px renders **1761 DOM nodes, of which 1203 are
inside SVG elements**. That is 68% of the page's entire DOM spent on drawn
decoration. `components/site/MograGarland.tsx` is 485 lines and runs GSAP
timelines with `repeat: -1` at lines 356, 370 and 377. `SakuraTree` (`/retail`)
and `PearlStrands` (`/jewellery`) are the same shape, 460 and 437 lines, same
infinite timelines. On top of that the Arcade turns a new category over every
`HOLD_MS = 3400` milliseconds (`components/site/Arcade.tsx:43`).

The consequences are in the main thread breakdown quoted earlier:
`paintCompositeRender` 6572 ms and `styleLayout` 5209 ms on `/rentals` mobile,
both larger than script evaluation. And Lighthouse attributes 14,874 ms of total
attributed time to the GSAP chunk (`c15bf2b0`) while only 747 ms of that is
scripting, which is the signature of an animation driving style and layout rather
than of code being slow.

It also explains the Speed Index result directly. A page is visually complete
when the viewport stops changing. The garland never stops, and the arcade
replaces the largest photograph on screen at 3.4 s and again at 6.8 s, inside the
window Lighthouse is filming. Speed Index of 5.8 to 8.3 s against an LCP of 2.4 s
is not a loading problem at all, it is the measurement correctly reporting that
this page is still moving.

**Fix, without touching the design.** The loops should not be competing with the
load. Start every infinite timeline only once the page is idle and the element is
actually on screen, and stop it when it scrolls off. `Arcade` already pauses
under a pointer, on focus, off screen and on its own pause control, so the
machinery for this exists; what is missing is that nothing waits for the page to
finish arriving before it starts. Deferring the garland's first tick until after
the load event, and letting the arcade hold its first category until then, costs
nothing a visitor perceives and takes the animation out of the measurement
window.

The node count is a second, separate question. 1203 SVG nodes is a lot of
geometry for a browser to lay out and paint on a phone, and there will be a
version of the garland with fewer nodes that is visually identical at the sizes
it is actually drawn. That is a drawing exercise, not a code one.

**Risk to the design.** Deferring the start is no risk at all. Reducing the node
count is a risk only if it is done by decimation rather than by redrawing, and it
must be checked against `site-audit.mjs` and by eye.

**Effort.** A day for the deferral and gating. Redrawing the backdrops is open
ended and should not be started without the owner.

### 2.6 Static assets are served with no cache lifetime

**Measured.** Every asset on the deployed site answers with

```
Cache-Control: public, max-age=0, must-revalidate
```

That was confirmed by request against `/_next/static/chunks/3794-*.js` and
against `/categories/rajasthani-poshak.webp`. These are content-hashed build
artefacts and photographs that change when the owner changes them, and the
browser is being told to revalidate every one of them on every repeat visit,
forty-odd conditional requests per navigation. Cloudflare's edge absorbs the
origin cost (`CF-Cache-Status: HIT`), so this does not show up as a server
problem and does not show up in a cold Lighthouse run at all. It shows up on the
second visit by a real customer on mobile data, which is the visit that matters
for a shop.

**Cause.** `site/wrangler.jsonc` declares `assets` with a directory and a binding
and no `headers`, and there is no `public/_headers` file. Workers Assets then
applies its conservative default.

**Fix.** Add `public/_headers` giving `/_next/static/*` a year and `immutable`,
and the image directories a long max-age. Verify that OpenNext copies
`public/_headers` into `.open-next/assets` during the build, because if it does
not, the same rules go into `wrangler.jsonc` under `assets.headers` instead.
Compression is already correct, by the way: the document and the JavaScript both
come back `content-encoding: br`.

**Risk to the design.** None.

**Effort.** An hour, including a deploy to confirm the headers actually changed.

**Built, 18 September 2026.** `site/public/_headers`. `/_next/static/*` gets a
year and `immutable`, which is safe because those names carry a content hash.
The six photograph directories get thirty days with a day of
`stale-while-revalidate` — deliberately not a year, because those paths are NOT
hashed and the same URL serves a different garment after a redeploy. `/og/*` and
the favicon get a day, since a wrong social card is visible in every WhatsApp
share this shop's customers send.

Verified against the built Worker rather than assumed, because the open question
in this item was whether OpenNext carries the file across: `npx opennextjs-cloudflare
build` copies `public/_headers` into `.open-next/assets/_headers` unchanged, so
the `wrangler.jsonc` fallback was not needed. Under `wrangler dev` on that
bundle, `/_next/static/chunks/1302-*.js` answers `public, max-age=31536000,
immutable`, `/categories/bridal-lehengas.webp` and `/hero/hero-garden.webp`
answer `public, max-age=2592000, stale-while-revalidate=86400`, `/og/og-default.jpg`
and `/favicon.ico` answer `public, max-age=86400`, and `/_headers` itself is 404
— Workers Assets reads it and does not serve it. Routes the Worker renders are
untouched: `/privacy` still answers `private, no-cache, no-store` with its CSP
nonce intact.

### 2.7 The preloader is paid for on every Lighthouse run and every first visit

**Measured.** The preloader was isolated from the rest of the motion vocabulary
by loading `/` four times with a cold cache and a 4x CPU throttle, alternating
between a fresh session and one where `vivaah:preloader-seen` was pre-seeded so
that §4.1's skip path fires:

| | FCP | LCP |
|---|---|---|
| preloader plays | 2536 ms, 2268 ms | 3960 ms, 17756 ms |
| preloader skipped | 1692 ms, 1884 ms | 3268 ms, 3384 ms |

Around 600 ms of first paint, and a much less stable largest paint. Separately, a
full Lighthouse run with `--force-prefers-reduced-motion`, which skips the
preloader entirely per §4.1 and also stands every other animation down, scored
**72 against 56 to 59**, with Speed Index 4.0 s against 6.9 s and LCP 2.8 s
against 4.4 s. That 72 is the ceiling this page has if the motion stops
competing with the load; it is not a proposal to ship reduced motion.

Lighthouse always arrives with an empty session, so it always pays the full
preloader. So does every first-time visitor, which is most of them for a shop
this age.

**What is not the fix.** Deleting it. See section 4.

**What might be.** §7.2 records that the 1.2 s cap is a cap on when the release
*begins*, after which a 0.4 s resolve into the nav slot plays over a page that is
already standing behind it. That reading is defensible and it is also why the
worst case is 1.6 s before the page is uncovered. The honest options are to lower
the cap, to make the early exit fire more often by preloading the two Bodoni files
(item 2.3 pays for itself twice here, since `document.fonts.ready` is one of the
two early-exit conditions), or to let the resolve begin while the page underneath
is already being revealed. All three are timing changes inside a ratified piece
of chrome and should be reviewed against §4.1 before they are made.

**Risk to the design.** Real, which is why this item is a set of options and not
an instruction.

**Effort.** Half a day to change the timing, plus whatever the review costs.

### 2.8 `/`, `/rentals` and `/jewellery` are rendered per request against Neon

**Measured.** `app/page.tsx:96`, `app/rentals/page.tsx:64` and
`app/jewellery/page.tsx:51` are all `export const dynamic = "force-dynamic"`.
Document TTFB across the runs ranged from 181 ms to 1515 ms, and one Lighthouse
run reported "Root document took 550 ms". `app/loading.tsx` exists precisely
because of this and says so in its own comment.

The reasoning in `app/page.tsx:93` is sound on its own terms: the rail is live
stock and the headline above it promises the stock changes day to day, so the
page is rendered per request. The cost is that Neon's free tier suspends after
five idle minutes, which is a locked constraint of this project, so a visitor who
arrives after a quiet half hour waits for a database to wake up before she sees
anything. Lighthouse mostly hides this, because running it three times in a row
keeps Neon warm.

**Fix, to be weighed not assumed.** A short `revalidate` window instead of
`force-dynamic` would keep the promise ("changes day to day" does not require
per-request freshness to the second) while letting most visitors be served from a
cached render. This is a correctness and expectations question as much as a
performance one, and the owner's promise in the copy is the thing that decides
it.

**Risk to the design.** None visually, but it changes what the page's own
headline is claiming, so it is not a free change.

**Effort.** An hour to implement. Longer to decide.

### 2.9 Smaller, verified, worth doing when nearby

**Render-blocking CSS.** Lighthouse estimates 410 ms on `/` mobile, from
`11ef11a2ac4237b5.css` (18 KB, 630 ms wasted) and the font stylesheet
`ce2653082fdc014f.css` (2.4 KB, 180 ms). Modest and hard to improve much without
splitting the stylesheet, which Tailwind v4 does not make easy.

**Legacy JavaScript.** 12 KB of unnecessary transpilation (`Array.prototype.at`
among others) inside the Next runtime chunk, which a tighter `browserslist` would
remove. Small, and it is framework output rather than our code.

**Forced reflow.** 145 ms attributed to the Next app-router chunk and 335 ms
unattributed on `/` mobile. Worth a second look only after item 2.5, since layout
thrash and continuous animation are usually the same story.

**The turntable, which is already in hand.** `/rentals/sage-rose` fetches 34
frames totalling 893 KiB during load at 390 px and spends 9611 ms in script
evaluation under the 4x throttle, and still scores 71 with an LCP of 3.0 s and a
CLS of 0. The byte-budget work recorded in `CLAUDE.md` for 10 September did its
job. The remaining move is to not begin loading the arc until the viewer is near
the viewport, which would take the decode out of the load entirely.

**Dead weight in `public/`, worth 15 MB of the 20 MB there.**
`Threshold`, `Hero`, `CategoryShowcase`, `SareesFlagship` and `LehengasFlagship`
all have zero importers at `HEAD`, the threshold film having been retired by §8.4
on the owner's decision. Their assets are still shipped:
`threshold/threshold.mp4` (7.2 MB), `threshold/threshold-m.mp4` (3.7 MB),
`hero/hero-intro.mp4` (3.2 MB) and `hero/hero-loop.mp4` (0.6 MB). No visitor
downloads any of it, and every measured route reported zero media requests, so
this is not a Core Web Vitals item at all. It is deploy weight. It is recorded
here rather than deleted, per the project's rule about not cleaning up other
people's mess, and because the owner may yet want the film back.

---

## 3. What to do first

If only three things are done, these three, in this order.

**First, cut the Postgres driver out of the client bundle (2.1).** 141 KB raw and
45 KB over the wire, removed from every page on the site, by changing one import
line. There is no cheaper point on the board and no risk attached to it.

**Second, fix the images (2.2 and 2.4 together).** Lighthouse's own estimate is
542 KiB on `/` and 484 KiB on `/rentals`, roughly a third of each page's weight,
and the single worst case is a 178 KB photograph rendered into a 44 pixel circle.
Lazy loading the sixteen below-the-fold images at the same time stops React
preloading them into contention with the hero and the fonts.

**Third, preload Bodoni and stop the hero copy re-wrapping (2.3).** A
perfectly reproducible 0.161 CLS, worth about seven points of the 56, caused by a
46 KB font file that the document never asks for until the stylesheet tells it
to.

Those three are all low risk and none of them changes anything the owner would
recognise as the design. Item 2.5, deferring the animation loops until after
load, is the largest single win available after them and the first one that needs
care.

---

## 4. What would cost us the design

Everything in this section would raise the score. None of it should be done
without the owner, and some of it should not be done at all. It is written down
so that it is a decision rather than a drift.

**Removing the preloader.** It is a ratified chrome piece (DESIGN_SPEC_V3 §4.1),
one of exactly four, and it carries one of the three sanctioned self-drawing
strokes (§3.4). It is worth roughly 600 ms of first paint on a cold session and
it is part of what the reduced-motion run's 72 was buying. Retiming it is fair
game (2.7). Deleting it is a design change and belongs to the owner.

**Stopping the Arcade's turnover.** The 3.4 s hold is the worst single thing on
the page for Speed Index, and the component's own header explains why it exists:
"the turnover is the page's one fact made visible: the stock changes most days".
It is also the owner's answer, on 14 September, to a head that "looks plain and
damped". Freezing it would trade the one moving fact this shop has for a metric.
Defer its start, do not stop it.

**Flattening the drawn backdrops into images.** `MograGarland`, `SakuraTree` and
`PearlStrands` are 1203 SVG nodes on `/rentals` alone and they are the largest
contributor to the 6572 ms of paint. A single WebP per page would remove nearly
all of it. It would also remove the motion inside them, which is the reason they
are drawn rather than photographed, and §8.4 is an owner decision from 14 to 15
September. If this is ever considered, it should be considered as a redrawing at
lower node count, not as a flattening.

**Adopting `next/image`.** The codebase uses raw `<img>` with an eslint-disable
throughout, and a reflex reading of that is that somebody was being lazy. It is
not obviously wrong here. On Cloudflare Workers, `next/image`'s optimizer needs
either Cloudflare Images or a custom loader, and this project is bound to zero
rupees a month, so the default path is not available to us and the fallback path
is `unoptimized`, which is what raw `<img>` already is with fewer moving parts.
The real win that `next/image` would bring, correctly sized variants per
breakpoint, can be had by generating the variants ourselves and using `srcset`,
which costs nothing per month. That is the recommendation, and it is in 2.2.

**Shipping reduced motion to everybody.** The `--force-prefers-reduced-motion`
run scored 72 on `/` against 56 to 59. That number is a diagnostic, and it is
quoted in 2.7 as a ceiling, not as a proposal. The motion vocabulary is
DESIGN_SPEC_V3 §3 and it is the thing that makes this site not a template, which
is the directive the whole v2 and v3 line of work exists to satisfy.

---

## 5. How to reproduce any of this

Lighthouse is not in the repo and should not be added to it; it was installed
into the session scratchpad and run against the deployed Worker. To repeat:

```
npm install lighthouse
CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" \
  node node_modules/lighthouse/cli/index.js \
  "https://vivaah.vivaah.workers.dev/" \
  --only-categories=performance --output=json --output-path=./home-mobile.json \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" --quiet
```

Add `--preset=desktop` for the desktop column and
`--force-prefers-reduced-motion` for the motion-off comparison. The run ends with
an `EPERM` while Lighthouse deletes its own Chrome profile under Windows; the
report is already written by then and is valid.

Run each route three times. Single runs of this site over a real network vary by
sixteen points, and a number quoted from one run is not a measurement. The one
thing that does not vary is the CLS on `/`, which is how we know what it is.

Two things here are deliberately not measured against `localhost`. Dev builds are
unminified and their timings mean nothing, and running a build while the dev
server holds `.next` breaks both. Everything above came off the deployed Worker.
