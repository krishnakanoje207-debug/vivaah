# Vivaah Design-Language Spec — v3.0 (delta over v2)

**v3 supersedes v2 in four areas only: display typeface, the home-page grammar,
the motion vocabulary, and four chrome pieces.** Everything else in
`specs/DESIGN_SPEC.md` — palette (§1), space/radius/elevation (§3 incl. the
jharokha arch), the v2 §4 motion *defaults* not addressed below, component
idioms (§6), and imagery/tone (§7) — **stays exactly as written and is not
restated here.** Where this document is silent, v2 governs. Do not re-derive
v2 content from this file; read both.

Sources for this delta: `CLAUDE.md`, `scrollcraft/builds/vivaah/BRIEF.md`
(owner interview, 8 Sep 2026), `scrollcraft/builds/vivaah/SCORE.md` (grammar +
score, v2, 8 Sep 2026), and the tokens actually implemented in
`site/app/globals.css`.

---

## 0. Scope note (read before implementing)

`SCORE.md` frames this as "a full site remake" and its per-page grammar table
(§2.3 below) assigns new grammars to the rental/retail listings, jewellery,
the product page, and Visit/policies, not just the home page. **This document
only ratifies the home page grammar ("Threshold and rooms") and the four
chrome pieces (preloader, 404, cookie panel, room index) as in-scope changes**,
per the explicit brief for this document. The per-page table is reproduced in
full below because it was requested and because the room-index/nav
implementation needs to know every route it links to — but the product-page
("Split stage") and listing-page ("Gallery/catalog") grammars **do not yet
supersede v2 §5b (product page two-act stage/details) and §5c (category-first
gallery pages)**. That is a live contradiction between `SCORE.md`'s stated
scope and this document's brief; it is flagged again in the closing report and
should be resolved (either author a v3 addendum for those pages, or narrow
`SCORE.md`'s scope note) before anyone builds against the "Split stage"
product-page row.

**Resolved on 9 September 2026 by §8, which is the authoritative page map. Read
that section rather than this paragraph, and rather than `SCORE.md`'s table.**

---

## 1. Typography — display face becomes a Didone

### 1.1 Decision

**Display face: Bodoni Moda**, variable, loaded via `next/font/google` with
its full `opsz` axis (6–96), not a static weight subset. Fraunces is retired
from display entirely — remove `--font-fraunces` and its `font-display-hi`
pairing role stays on Noto Serif Devanagari, unaffected (Hindi stack is
untouched by this delta). Body/UI stays **Instrument Sans**, unchanged.

**Justification (evaluated Bodoni Moda vs Playfair Display vs Prata; all
three are OFL-licensed, free for commercial use, self-hostable via
`next/font/google`, so licensing did not decide it):** Bodoni Moda ships a
real variable `opsz` axis (6–96) that lets one font file re-cut its own
hairline weight from eyebrow-adjacent sizes up to the new threshold-hero size
without hand-picked static instances, which neither Playfair Display (no opsz
axis, static optical cut) nor Prata (single static Regular weight, no italic,
no variable axis at all) can do; Playfair Display is additionally the default
Didone of Indian bridal-rental competitors already, which cuts directly
against the "unmistakably non-template" directive that motivated v2 in the
first place, while Bodoni Moda's editorial-fashion association reads premium
without reading as a wedding-invite cliché.

Prata is disqualified outright: a single 400-weight static face cannot
produce the weight range this scale requires (§1.3) and has no italic for the
carried-forward editorial-accent convention (§1.4).

### 1.2 Implementation note (next/font)

```ts
import { Bodoni_Moda } from "next/font/google";

const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  // do not pin `weight` — omitting it keeps the variable instance,
  // which is what makes font-optical-sizing: auto meaningful below.
});
```

Token rename in `globals.css`:
```css
--font-display: var(--font-bodoni), ui-serif, Georgia, "Times New Roman", serif;
```
`font-optical-sizing: auto` is already set on `h1,h2,h3,h4` in the v2 base
layer (globals.css L79/92) — leave it in place; it now does real work because
Bodoni Moda's opsz axis actually exists (Fraunces's did too, so this is not a
new rule, just a more consequential one).

### 1.3 Full display type scale

Sizes and line-heights below are the v2 scale **unchanged** (globals.css
`--text-h1/h2/h3`); only weight, tracking, and opsz handling are new. A
Didone set with browser-default (0em) tracking at large sizes reads loose and
amateur; the classic correction is to tighten as size increases and hold or
open tracking slightly at small sizes where hairlines start to crowd.

| Token | Size (unchanged from v2) | Line-height (unchanged) | Weight | Letter-spacing | opsz handling |
|---|---|---|---|---|---|
| `--text-h3` | clamp(1.375rem, 1.18rem + 0.85vw, 1.75rem) — 22–28px | 1.25 | 500 | **+0.002em** | `auto` (browser maps to ~24–48) |
| `--text-h2` | clamp(1.875rem, 1.45rem + 1.85vw, 2.625rem) — 30–42px | 1.15 | 500 | **-0.004em** | `auto` (~48–72) |
| `--text-h1` | clamp(2.5rem, 1.7rem + 3.4vw, 4rem) — 40–64px | 1.06 | 500 | **-0.01em** | `auto` (~72–96) |
| `--text-threshold` (**NEW**) | clamp(2.75rem, 1.9rem + 4.2vw, 5.5rem) — 44–88px | 1.0 | 500 (600 permitted once, threshold only) | **-0.016em** | pinned max: `font-variation-settings: "opsz" 96` |

`--text-threshold` is new: it did not exist in v2 because v2's homepage had
no single dominant line of type over full-bleed video. It is required to make
§2.2's threshold hero implementable and is scoped to that one line only. Do
not reuse it elsewhere without deliberately widening its scope.

**Weight floor: 400, never below.** This is a deliberate divergence from v2's
Fraunces rule (weight 340–420, never bold) — Fraunces is a soft old-style
serif that survives being set light; Bodoni Moda's hairlines are thin enough
already that anything under 400 breaks apart at body-adjacent display sizes
(h3). Ceiling stays 600, and 600 is permitted in exactly one place: the
threshold line, because SCORE.md's rule "peak has the largest span" already
licenses giving the arrival moment the most visual weight on the page.
Everywhere else, including h1, stays at 500.

**Italic:** v2's "italics for one editorial accent per section" convention
carries forward unchanged, now rendered in Bodoni Moda's own italic.
*(Proposal, not an owner-confirmed decision — the brief re-confirms the face
change but not this specific carry-forward; flag for owner sign-off if it
matters.)*

### 1.4 What did not change

Eyebrow (0.6875rem / 0.12em tracking / gold-600), caption (0.8125rem), and
body (Instrument Sans, unchanged clamp) keep their v2 values exactly — none
of them are display type, so the Didone swap does not touch them.

---

## 2. Page grammar: "Threshold and rooms" (home page)

Restated in spec form from `SCORE.md`. This grammar governs `/` only.

### 2.1 What a section is

A **room**. Three properties change at every boundary — **ground**,
**material**, **device** — and a section boundary must change **all three**,
not one or two. Change fewer than three and it is not a room transition; it
is a defect (see bans).

### 2.2 Hero: the threshold

Full-bleed video, held, exactly one line of type over it (`--text-threshold`,
§1.3), with a scrim placed **only where the type sits**, not across the full
frame. The threshold is the **only** continuous, only-scrubbed, only
full-bleed moving surface on the entire page — everything past it is static
imagery or discrete motion inside a room.

Scrim spec: `background: color-mix(in srgb, var(--color-violet-950) X%, transparent)` positioned behind the type only (a local gradient/panel, not a page-wide overlay), tuned so `--color-porcelain-50` text clears AA (4.5:1) against it. Floor: **X ≥ 45%** opacity; verify the exact value against the graded hero footage at implementation time by screenshot, per the project's standing "verify visually" rule — this number is a floor, not a final measurement.

### 2.3 Navigation: the persistent room index

A fixed, persistent index that **jumps** (does not scroll-guide). This is the
grammar's clearest break from a filmic one-shot, which bans jumping outright,
and it is a business requirement: three separate trades under one roof, and a
visitor arriving for jewellery must not be made to scroll through retail.

- Room names only, e.g. *Threshold · The week · The arithmetic · The craft ·
  The vault · The rail*. **No chapter numerals, no `01 / 06` readout** — the
  index names rooms, it does not count them (explicit ban, §2.5).
- Visible only on the home page (this grammar does not apply elsewhere).
- Active-room state tracked via IntersectionObserver on each room's root.
- Jump behavior: eased scroll, ~700ms, `power2.inOut`. *(Proposal — SCORE.md
  specifies that it jumps, not the easing; pick a value consistent with the
  hard-cut aesthetic rather than a bouncy scroll-hijack.)*
- Reduced motion: the jump is an instant `scroll-behavior: auto` snap, per
  the existing sitewide reduced-motion rule (globals.css L209–218) — no eased
  tween.
- Label color/weight, see §4.1 (contrast note — gold is not the default label
  color here).

### 2.4 Ending: the return

The close reprises the threshold's own ground (`--color-violet-950`), now
**still** instead of moving. The page ends where it began — not a fade, not a
standard footer treatment, not a spotlight close. Device: `flow` (a plain
reveal), no scrub, no parallax.

### 2.5 Bans (the bans are the point — do not soften any of these)

- Crossfades between rooms. Cuts only, always — see §3.2 for what a "cut" is
  allowed to look like.
- A second full-bleed film anywhere past the threshold.
- `scrub` anywhere after the threshold.
- A continuous gradient ground drifting across room boundaries — each room's
  ground is a hard, discrete change.
- A magnetic CTA, a spotlight close, or a kinetic headline stack **inside any
  room** (these are fine as *general* site patterns elsewhere if v2 already
  licensed them; they are specifically banned as room content here).
- Any room boundary that changes fewer than three of {ground, material,
  device}.
- Chapter numerals or a progress readout in the room index.

### 2.6 The score (ground / material / device per room)

| Room | Ground (token) | Material | Device |
|---|---|---|---|
| Threshold | `violet-950` | film | `scrub` (the only one on the page) |
| I. The week | `porcelain-50` | silk, photographed | `flow` + `in` |
| II. The arithmetic | `porcelain-100` | figures, type | `count` (real figures only) |
| III. The craft | `stage` | thread, macro | signature move (pattern-draft seam, §3.3) + `parallax` |
| IV. The vault | `violet-950` | gold, metal | `parallax` |
| V. The rail | `porcelain-100` | cotton, daylight | `reveal` per object |
| Return | `violet-950` | still | `flow` |

No device family repeats back-to-back; exactly one `scrub` (the threshold);
Room III carries the largest scroll span on the page (it is the peak — see
`BRIEF.md` feeling curve: arrival → recognition → discomfort → **wonder** →
appetite → ease → resolution). The hardest single cut on the page is III→IV:
stage grey to violet-950, cloth to metal — implement that boundary with zero
transition frames, not even a shared 1-frame blend.

### 2.7 Per-page grammar table (reproduced from SCORE.md; see §0 for scope caveat)

| Page | Grammar | Hero | Close |
|---|---|---|---|
| Home | **Threshold and rooms** (this document) | The film | Return to the threshold's ground |
| Rentals listing | Gallery / catalog | Object one, already labelled | Inquiry plate set as a label |
| Retail listing | Gallery / catalog | Object one, already labelled | Inquiry plate set as a label |
| Jewellery | Gallery / catalog, dark ground | Object one on violet-950 | Cross-sell drawer, not a new page |
| Product page (rental) | Split stage | The 50/50 split established on screen one | The collapse: draft side retreats, booking takes full width |
| Visit / policies | Typographic poster | Type on porcelain | Address plate |
| 404 | Typographic poster | The drawn hanger | Two real escape routes |

Only the Home row and the 404 row (as one of the four chrome pieces, §4) are
ratified for build by this document. The rest are listed for awareness and
for the room-index/nav wiring; do not build the "Split stage" product page or
the new "Gallery/catalog" listing pages off this table alone (see §0).

---

## 3. Motion vocabulary (new in v3 — v2 had none beyond §4's defaults)

**Global rule, applies to every item below and to all v2 motion:** animate
only `transform`, `opacity`, and `clip-path`. Never animate `width`,
`height`, `top`, or `left`. Never use `transition: all`. This does not
contradict v2 §4's existing defaults (0.7s power2.out reveals, 70ms stagger,
180ms hovers, scale ≤1.03, product-stage auto-swing) — all of them already
comply; this makes the constraint explicit so it is not violated going
forward.

### 3.1 Threshold scrub

Scroll position drives the hero video's `currentTime`, lerped, not bound
directly (direct binding reads as janky/mechanical; lerping reads as a
surface being pushed by hand).

```
targetTime = (scrollProgress within threshold) * video.duration
currentTime += (targetTime - currentTime) * 0.12   // per rAF tick
```

Factor **0.12**. Scoped to the threshold only — `scrub` is banned everywhere
past it (§2.5).

**Reduced motion:** video shows a static poster frame; `currentTime` is never
bound to scroll; the threshold's line of type is visible immediately, no
reveal delay.

### 3.2 Hard cuts between rooms

A "cut" is an instant, unanimated swap of the room's `background-color`
(ground token) at the boundary — zero crossfade frames, zero shared opacity
ramp between the two grounds. What *is* animated is the incoming room's own
content reveal (its `flow`/`in`/`count`/`reveal` device, per §2.6), which
uses the existing v2 §4 defaults (0.7s, power2.out, transform+opacity only,
per §3's global rule). The boundary itself carries no motion; only the
content inside the new room does.

**Reduced motion:** the cut is unaffected (it was never animated); the
content reveal collapses to final-state-only per the existing global rule
(globals.css L209–218).

### 3.3 The pattern-draft seam (signature move)

A flagship garment photograph with a draggable seam: one side the photograph,
the other an SVG edge-detect line drawing computed live from the same JPEG
(zero generation cost, verified in `reference.html` per SCORE.md). Lives in
Room III; the spine of the (out-of-scope-for-now) rental product page. Three
to five flagship pieces only — this is deliberately rare, not a sitewide
pattern.

- Seam handle: 44px hit target (touch-target minimum), draggable via pointer
  events (mouse + touch) and keyboard (←/→ move the seam 5% per press, focus
  ring `gold-600` per v2's focus-visible rule).
- Implementation: the line-drawing layer sits above the photograph, clipped
  via `clip-path: inset(0 calc(100% - var(--seam-x)) 0 0)` where `--seam-x`
  is updated on drag/keypress. `clip-path` only — satisfies §3's global rule.
- No scrub, no autoplay sweep — it moves only when dragged.

**Reduced motion:** static two-up, both photograph and line drawing fully
visible side by side, no drag interaction implied or required (per SCORE.md
verbatim).

### 3.4 The self-drawing stroke (exactly three places)

SVG `stroke-dashoffset` technique. Author paths with `pathLength="1"` so
`stroke-dasharray`/`stroke-dashoffset` can be written as literal `1` units
regardless of actual path geometry (avoids a runtime `getTotalLength()`
measurement pass). Animate `stroke-dashoffset: 1 → 0`.

Used in **exactly three places, no more**:

| Placement | Duration | Ease | Notes |
|---|---|---|---|
| Preloader wordmark | 700ms | `power1.inOut` | Starts immediately on mount; must complete within the preloader's 1.2s hard cap (§4.1). |
| "Reserved, collect on `<date>`" confirmation | 550ms | `power2.out` | Delayed 150ms after the confirmation text has faded in, so it reads as a seal drawn after the fact, not simultaneous with it. |
| 404's drawn hanger | 1100ms | `power1.inOut` | Draws once, holds. Reassigned from the reference's delivery-truck illustration to a hanger — per BRIEF.md's authored decision, since this shop has no delivery. |

**Reduced motion (all three):** path renders fully drawn immediately —
`stroke-dashoffset: 0`, no transition, no animation-in.

### 3.5 Heading distortion (SVG `feTurbulence` + `feDisplacementMap`)

Desktop pointer only — gated by `@media (hover: hover) and (pointer: fine)`
**and** `!prefers-reduced-motion`. Off entirely on touch and under reduced
motion (not a shortened version — completely absent; the heading renders as
plain static type in those contexts).

- `feTurbulence`: `baseFrequency 0.012–0.02`, `numOctaves 2`.
- `feDisplacementMap`: `scale` driven by pointer velocity, clamped to
  **0–18px** (keeps glyphs legible mid-distortion; never lets a letterform
  fully separate from its neighbors).
- On pointer-leave, ease back to `scale: 0` over 400ms, `power2.out`.
- Applied via a JS-updated `scale` attribute on mousemove, not a CSS-only
  hover animation (the filter needs live pointer coordinates).

**On at most 3 headings site-wide.** Candidates (labeled as a **proposal** —
BRIEF.md sets the "two or three, never all" cap but does not name which
headings; owner sign-off needed):
1. Room III "The craft" heading — the peak, and distortion-as-craft is a fit.
2. The Return room's closing line — echoes the threshold, a resolution beat.
3. The 404 headline — already the site's one sanctioned "utility/outlier"
   surface.

**Reduced motion / touch:** filter never applies; heading is always static
type, contrast and legibility identical to the undistorted rest state (§4.1
of this document — no new AA pair is introduced, since the effect only ever
displaces geometry on hover on desktop, never color).

---

## 4. Four chrome pieces (new in v3)

### 4.1 Preloader

- Mounted once per session: gate on `sessionStorage.getItem("vivaah:preloader-seen")`; set the key immediately on first mount so a reload mid-session does not replay it.
- Hard cap: **1.2s maximum.** This is a ceiling, not a target — the preloader releases at 1.2s even if fonts or the hero poster have not finished decoding, and the page must tolerate that (hero shows whatever frame is available; Bodoni Moda's fallback stack, §1.2, covers un-decoded font state).
- Early exit: if `document.fonts.ready` **and** the hero poster image's `.decode()` promise both resolve before 1.2s, release immediately rather than waiting out the cap.
- **Skipped entirely** (no mount at all, not a 0-duration mount) on: any deep link (any route other than `/`), and whenever `prefers-reduced-motion: reduce` is set.
- Resolves into the **nav wordmark position**, not a curtain-up. The preloader's self-drawing wordmark (§3.4) animates/scales down to match the nav's wordmark slot exactly (≤28px tall, per v2 §7's logo-slot rule) at the nav's own coordinates, then the preloader's background chrome fades out via `opacity` only (§3's global rule), revealing the page already in place beneath it. No curtain, no wipe.

### 4.2 Custom 404

Grammar: Typographic poster (§2.7). Ground: **`porcelain-50`** *(proposal —
SCORE.md's per-page table does not specify a ground for 404; porcelain-50 is
chosen for consistency with the other Typographic-poster page, Visit/
policies, rather than reusing the threshold's violet-950)*. Hero: the drawn
hanger (§3.4, third placement). Close: **two real escape routes** as actual
links, not decorative buttons — e.g. "Return to shop" (→ `/`) and one
contextual link such as "Browse rentals" (→ rentals listing). No em dash in
either link's copy (§5.3).

### 4.3 Cookie consent panel — built, not mounted

Component exists in the codebase but is **not imported into any layout** and
renders nowhere until an actual analytics script exists to disclose. The site
today sets exactly one cookie — the strictly-necessary admin session cookie —
which is consent-exempt; shipping a visible consent banner now would falsely
advertise tracking that is not happening.

When it is eventually mounted, its spec (per the Locomotive cookie-panel
reference cited in BRIEF.md §1):

- Ground: `violet-950` (the one place besides the threshold/vault/return
  where dark "earns its place," per the owner's "black if needed" rule).
- Heading: Bodoni Moda, high-contrast, sized at `--text-h3`.
- Two hard-edged buttons: "Accept" (`gold-500` bg, `violet-950` text — reuses
  the existing v2 AA pair, §5.1) and "Necessary only" (ghost: `porcelain-50`
  text, 1px `porcelain-50/30` border — reuses the existing v2 ghost pattern).
  **"Hard-edged" means literal `border-radius: 0`** — the one deliberate
  exception to the sitewide 10px control radius (v2 §3), because this panel
  must read as a legal/utility surface, not a brand surface.
- One underlined secondary link ("Privacy policy"): `gold-500` on
  `violet-950` (existing AA pair).
- Panel: 420px wide on desktop, fixed bottom-left or bottom-right, 24px
  padding; bottom sheet on mobile.
- Wiring rule: cookie is set only after an explicit "Accept" click — never on
  scroll, timeout, or implicit dismissal.

### 4.4 Persistent room index

Specified in full at §2.3. Restated here only as an inventory item: it is
chrome, home-page-only, and is the fourth piece alongside preloader/404/
cookie-panel.

---

## 5. Hard constraints encoded into this delta

### 5.1 Palette — confirmed unchanged

v2 §1's tokens (`violet-950`…`gold-100`, `porcelain-50`…`stage`,
`ink-900`…`ink-400`, semantic colors) are used as-is; no new token is
introduced by this document beyond `--text-threshold` (a type-scale token,
§1.3). Dark (`violet-950`) is used in this delta only at the threshold, the
vault, the return, and the (unmounted) cookie panel — each of those already
had a stated reason to be dark in SCORE.md or the owner's own "black if
needed" rule; no other new dark surface is introduced. The 90/8/2 rule
(≥90% neutrals, ~8% violet tints, ≤2% gold) is unchanged and applies to every
new room and chrome piece above.

### 5.2 Contrast (AA) — extends v2 §1, does not contradict it

All colour pairings introduced by this document reuse pairs already on v2's
approved list (`porcelain-50` on `violet-950`, `violet-950` on `gold-500`,
`gold-500` on `violet-950`) — no genuinely new pair is introduced, **with one
caveat to flag explicitly:**

- v2 approves `gold-600` on `porcelain-50` only "≥16px or 500 weight." The
  room index's labels (§2.3) are caption-scale and would fail that
  condition if set in gold. **Rule for the room index: label text renders in
  `ink-900`/`ink-600` at rest; `gold-600` is reserved for the active-room
  indicator (a dot or underline mark), which is decorative, not text, and
  therefore exempt from the text-contrast condition.** Do not set room-index
  label *text* in gold at caption size.
- The threshold's scrim (§2.2) is a new construction, not a new *token* — it
  is `violet-950` at a tuned opacity, and the floor given (≥45%) exists
  specifically to keep `porcelain-50` text at 4.5:1 against it; verify by
  screenshot against final graded footage, per the project's standing
  visual-verification rule (`CLAUDE.md`).
- Heading distortion (§3.5) never changes colour, only geometry, and only on
  hover on desktop pointer devices — the resting state (which is what a
  static/no-JS/reduced-motion visitor sees) is byte-for-byte the same
  AA-compliant heading as before.

### 5.3 No em dash in shipped copy

No em dash anywhere in copy a visitor sees — use a period, comma, colon, or
parentheses instead. This applies specifically within this document's scope
to: room index labels, the threshold's one line of type, the "reserved,
collect on `<date>`" confirmation copy (the comma in that exact phrase is the
required construction, not a stand-in for a dash), the 404's copy and its two
escape-route link labels, and the cookie panel's copy once mounted.

### 5.4 Female-only content

Every image, clip, and line of copy introduced by this delta (threshold film,
Room I–V imagery, 404 illustration, cookie-panel art if any) addresses women
only. No male models, no groom content — unchanged project rule
(`CLAUDE.md`).

### 5.5 No shipping vocabulary

Nothing in this delta introduces or implies shipping. Any copy touching
retail or reservations uses *reservation*, *hold this for me*, or *collect at
the shop* — never *cart*, *checkout*, *delivery*, or *order tracking*. This
is most relevant to Room V ("The rail," retail-flavoured) and the retail
listing row of §2.7's table.

### 5.6 Zero-cost stack

Bodoni Moda is Google Fonts, OFL-licensed (free for commercial use),
self-hosted via `next/font/google` (bundled at build time, no runtime Google
CDN call) — consistent with the zero-rupees-per-month / commercial-use-
permitted constraint already governing Instrument Sans and Fraunces in v2.
No new paid service, API, or asset is introduced anywhere in this document.

---

## 6. Acceptance checklist

- [ ] Fraunces purged from `--font-display` and from any component still
      referencing `--font-fraunces`; Bodoni Moda loaded as a full variable
      instance (opsz axis present), not a static weight subset.
- [ ] `--text-h1/h2/h3` sizes and line-heights unchanged from v2; only
      weight (500, floor 400 everywhere), letter-spacing, and
      `font-optical-sizing: auto` are new per §1.3's table.
- [ ] `--text-threshold` exists, used only for the threshold's one line of
      type; weight ≤600 and only there.
- [ ] Threshold: full-bleed film, `scrub` factor 0.12, scrim local to the
      type only, AA verified by screenshot against real graded footage.
- [ ] No `scrub` anywhere past the threshold; no second full-bleed film
      anywhere on the page.
- [ ] Every room boundary changes all three of {ground, material, device};
      none changes fewer than three.
- [ ] Room cuts are true hard cuts (zero crossfade frames on the ground);
      only the incoming room's own content reveal is animated.
- [ ] No continuous gradient ground drifting across room boundaries.
- [ ] No magnetic CTA, spotlight close, or kinetic headline stack inside any
      room.
- [ ] Room index shows names only, no numerals, no `N / N` readout; visible
      on home only; jumps (not scroll-guides); labels render in ink, gold
      reserved for the active-state mark only.
- [ ] Return room reprises `violet-950`, static, `flow` device only.
- [ ] Pattern-draft seam: exactly 3–5 flagship pieces, `clip-path`-driven,
      keyboard operable, reduced-motion shows static two-up.
- [ ] Self-drawing stroke appears in exactly three places (preloader
      wordmark, reservation confirmation, 404 hanger) and nowhere else;
      reduced motion renders each fully drawn with no animation.
- [ ] Heading distortion is desktop-pointer-only, off on touch and reduced
      motion, applied to at most 3 headings site-wide, displacement scale
      capped at 18px.
- [ ] All animation site-wide uses only `transform`/`opacity`/`clip-path`;
      zero uses of `transition: all`, zero animated `width`/`height`/`top`/
      `left`.
- [ ] Preloader: sessionStorage-gated (once per session), 1.2s hard cap,
      early-exit on fonts+poster ready, skipped entirely on deep links and
      under reduced motion, resolves into the nav wordmark slot (no curtain).
- [ ] 404 built, drawn-hanger stroke plays once and holds, two real escape
      links, no em dash in its copy.
- [ ] Cookie consent panel component exists but is not imported/mounted
      anywhere in the app; zero-radius buttons confirmed as the one
      deliberate exception to the sitewide control radius.
- [ ] No em dash in any shipped copy touched by this delta.
- [ ] All imagery female-only; no groom content.
- [ ] Retail/reservation copy uses reservation/hold/collect vocabulary only.
- [ ] §0's scope caveat has been read: "Split stage" product page and
      "Gallery/catalog" listing pages are NOT built off §2.7's table without
      a separate scope decision.

---

## 7. Implementation record and amendments (9 September 2026)

The home page grammar (§2), the motion vocabulary (§3) and the preloader (§4.1)
were built on this date. Sections 0-6 above stand as written; the items below
are the places where the build had to decide something the spec left open, or
had to depart from it. Each says why. Nothing here changes the palette, the type
scale, the score, or any ban.

### 7.1 Amendment: the pattern draft is precomputed, not a live filter (§3.3)

§3.3 specifies the line drawing as "an SVG edge-detect line drawing computed
live from the same JPEG". **It ships as a precomputed PNG** produced offline by
`tools/pattern_draft.py` (Sobel, threshold, despeckle) and served from
`site/public/flagship/`. A live `feConvolveMatrix` over a full-column image
costs a filter pass on every frame of the drag, on the mid-range Android this
shop's customers use (BRIEF.md §4); the offline pass costs nothing at runtime
and lets the lines be hand-cleaned before they ship. The seam mechanic, the
44px handle, the keyboard step, and the reduced-motion two-up are unchanged.

**Open:** only one flagship draft exists (`draft-lehenga.png`, the bridal
lehenga). §3.3 licenses three to five. The remaining two to four should be run
through the same tool once the owner's photography arrives; the cap is a
ceiling, not a quota, so shipping one is not a defect.

### 7.2 Amendment: the preloader's interim wordmark (§4.1, §3.4)

§3.4's stroke-dashoffset technique assumes one continuous path carrying
`pathLength="1"`. The shop's logo has not arrived (BRIEF.md §8 lists it as
blocking), so the interim mark is real Bodoni Moda text whose outline is drawn
left to right by a `clip-path` wipe and then fills. Two reasons this is not
simply the §3.4 technique applied to text: `pathLength` does not apply to
`<text>`, and dash-offsetting text draws every glyph at once, which does not
read as drawing. `clip-path` and `opacity` are both permitted by §3's global
rule. **When the logo SVG lands, replace this with the literal §3.4 technique**
and the placement returns to full compliance.

**Timing reading:** §4.1's "1.2s hard cap" is implemented as the cap on when the
release *begins*. The resolve into the nav slot (0.4s) and the ground's opacity
fade then play out over the page, which is already rendered beneath. Releasing
mid-draw would show a half-drawn mark, which is not what the section asks for.
The wordmark draw stays at §3.4's 700ms.

### 7.3 Room index: scope and legibility (§2.3, §5.2)

- **It sits on the right edge.** Owner's decision, 9 September 2026, after
  seeing it on the left: "it does not fit there." §2.3 does not specify a side,
  so this is a choice the spec left open, not a departure from it. The mark sits
  outboard of the label and the plate fades on its inner edge, both mirrored
  from the original left-hand build.
- **Desktop only, from 1024px.** Below that the site nav already carries the
  cross-trade jumps and a fixed rail has nowhere to stand at 390px. The business
  requirement §2.3 names (a jewellery visitor must not scroll through retail) is
  still met on mobile by the nav.
- **The rooms carry a lane for it.** A fixed rail and a centred shell collide at
  every viewport narrower than about 1560px, and "The arithmetic" is long enough
  to land on the headings. `.shell-rooms` (globals.css) adds an inset on the
  rail's side that shrinks to nothing once the shell's own margin is wide enough
  to clear the rail. Only the home rooms use it; the threshold does not need it,
  because its type sits at the bottom and the rail at the middle.
- **No opacity dimming on labels.** The rest state is `ink-600` (light rooms) /
  `violet-300` (dark rooms) at full opacity, active is `ink-900` /
  `porcelain-50`, and gold is the active mark's alone, per §5.2. An earlier
  build dimmed the rest state to 0.75, which measured 2.77:1 at caption size:
  the dimming, not the colour, was the single largest cause of failure.

### 7.4 Scrims: measured values (§2.2)

§2.2 gives ≥45% as a floor and requires the real number to be verified against
the graded footage. Measured against the shipped film at six scroll positions,
the values that hold AA are:

| Scrim | Value shipped | Worst measured |
|---|---|---|
| Type scrim (bottom band, behind the h1) | violet-950 88% → 55% at 42% → transparent | h1 at 7.30:1, passes 4.5:1 |
| Room-index plate (dark rooms only) | violet-950 90%, fading only on the right edge | see §7.3 |
| Nav band (top 128px) — **new construction** | violet-950 88% → 76% at 64px → transparent | nav links, see below |

The nav band is not in §2.2 and is added here: the threshold now runs full-bleed
under a transparent nav (the film reaching the top of the viewport is what §2.2's
"full-bleed" requires), and the nav's own light type needs a ground when a bright
frame is under it. It is the same construction as the type scrim and obeys the
same rule, a scrim only where type sits.

### 7.5 The threshold film is encoded for seeking, not for playing

The film is never played; scroll sets `currentTime`. An accurate seek decodes
forward from the preceding keyframe, so keyframe density, not bitrate, is what
makes scrubbing smooth. The desktop encode shipped at GOP 8 and was re-cut to
GOP 4; all-intra was measured at 11.0-14.5 MB and rejected on payload grounds
(zero-cost stack, mid-range Android audience). Numbers, budgets and the exact
ffmpeg line are recorded in `site/public/threshold/SOURCES.md`, which any
replacement film must satisfy.

### 7.6 What §6's checklist still does not cover

- **Self-drawing stroke, 2 of 3 placements.** The 404's hanger ships. The
  preloader's wordmark ships as §7.2's interim. The third, "reserved, collect on
  `<date>`", belongs to the booking engine and cannot exist before Phase 2.
- **Heading distortion, 2 of at most 3.** Room III's "We know how it was made"
  and the Return's "Come and see it on". The 404 headline is §3.5's third
  candidate and is deliberately left alone: it is a proposal awaiting owner
  sign-off, and taking it would make the 404 a client component for an effect
  nobody has approved.
- **Room II's purchase figure is not yet a real figure.** §2.6 says real figures
  only. ₹80,000 is a typical market price for a bridal lehenga, marked
  `TODO(owner)` in `app/page.tsx`; the rental figure beside it is live from the
  catalogue. This is the one number on the page the shop still has to confirm.
- **v2's home sections are no longer on the home page.** `CategoryShowcase`,
  `SareesFlagship`, `LehengasFlagship` and the v2 `Hero` belong to a grammar this
  document replaces. The components are left in the tree, unimported by `/`.
- **§0's scope caveat is now resolved in §8.** Nothing here builds the "Split
  stage" product page or the "Gallery/catalog" listing pages, and §8 records why
  neither is ratified and what governs those routes in the meantime.

---

## 8. Page grammar map (9 September 2026) — resolves §0

§0 left one thing open: `SCORE.md`'s per-page table (reproduced at §2.3) assigns
grammars to pages this document never ratified. That table is now stale in a
second way as well, because the owner moved the "Threshold and rooms" grammar off
the home page and onto `/rentals` on 9 September, after it was written.

**This section is the authoritative page map. Where it and `SCORE.md`'s table
disagree, this section wins.** "Ratified" means this document licenses a build
against that grammar. Where a row is not ratified, **v2 governs**, and the
`SCORE.md` row is a proposal rather than a work order.

| Route | Grammar in force | Ratified by | Built |
|---|---|---|---|
| `/rentals` | Threshold and rooms (§2, amended by §8.1) | v3 | Yes, 9 Sep |
| `/` (home) | Open, see §8.2 | — | Interim only |
| `/retail` | Category-first gallery (v2 §5c) | v2 | Yes |
| `/jewellery` | Category-first gallery, dark ground (v2 §5c) | v2 | Yes (W2, `d34c52b`) |
| `/rentals/[slug]` | Two-act stage, then details (v2 §5b) | v2 | Stub |
| `/visit`, `/policies` | v2 | v2 | Yes |
| 404 | v3 §4.2 | v3 | Yes |

`SCORE.md`'s "Gallery / catalog" rows for the listing pages and its "Split stage"
row for the product page are **not ratified here** and must not be built against
without a further amendment to this document. §8.1 and §8.3 say why.

### 8.1 `/rentals` absorbs the catalogue; it does not sit beside it

The page as built runs Threshold → I The week → II The arithmetic → III The craft
(the peak) → **IV The collection** → the Return (Visit). Room IV *is* the
catalogue: the category tiles and the rental cards, on porcelain-50, entered
through the same hard cut as every other boundary.

So "Gallery / catalog", which `SCORE.md` assigns to the rentals listing, is not a
second grammar competing with "Threshold and rooms" for this route. It is folded
in as one room, and §2's rule that every boundary changes all three of {ground,
material, device} still holds at its edges.

This also answers the objection the arrangement invites, that a visitor who wants
only the rail should not have to scroll an argument to reach it. She does not:
the room index carries a "The collection" entry that jumps straight there. That
is the business requirement §2.3 names, applied within one page rather than
across the three trades.

### 8.2 The home page's grammar is deliberately left open

The home page is being rebuilt from the shop's own story
(`KOMBAI_MAIN_PAGE_PROMPT.md`) and its grammar is **not** decided here. Two
constraints bind that rebuild whatever shape it takes, and both follow from §2's
bans rather than from taste:

1. **It may not carry a second full-bleed scrubbed film.** The threshold is the
   only one on the site and it belongs to `/rentals`. A home page with its own
   would make the threshold ordinary, which is the one thing §2.1 spends the
   whole page budget to prevent.
2. **It may not reuse the room sequence.** Two routes running the same six rooms
   is precisely the "one shape repeated" failure the per-page grammar split
   exists to prevent.

When it ships, record the grammar it landed on as §8.4 and append its row to
`FINGERPRINTS.md` at the same time.

### 8.3 The product page: v2 §5b governs until a v4 says otherwise

`SCORE.md` argues "Split stage" for `/rentals/[slug]` on real grounds: the pattern
draft is a two-sided argument, and that grammar's close (the divider travels to
one edge and the CTA takes the winning column) is literally the booking step.
That is a good argument, and it is **still only an argument**. Nothing in this
document ratifies it and no page has been designed against it.

Until it is ratified, **v2 §5b governs, and the Phase 2 booking engine should be
built against v2 §5b.** Ratifying "Split stage" is a design decision with a real
downstream cost, because the booking flow's layout sits inside it, so it belongs
in a v4 delta authored before Phase 2's product-page work starts, not in a build
note written afterwards.

**A conflict any such v4 must settle first.** §3.3 gives the pattern seam to
`/rentals` Room III as the page's peak, and `SCORE.md` separately calls the same
seam "the whole spine of the rental product page". Both cannot be true. A device
that carries two pages is not a peak on either. Either the product page uses a
different device, or the seam moves off `/rentals` Room III and that room is
rescored. Do not build a second draggable seam before that is decided.
