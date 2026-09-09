# Step 2 — Grammar, gate, score (v2)

Supersedes v1. v1 chose chaptered editorial for the home page; the user has
since required the hero film stay above the fold, which that grammar forbids.

Scope correction from the user, 8 September 2026: this is a **full site remake**
covering the rental and retail pages, not a home-page rebuild. The hero section
of the main page is kept.

---

## The problem v1 hit

The user requires two things that no single one of the eight grammars allows
together:

1. A full-bleed hero **film above the fold**.
2. **Distinct rooms** with hard cuts, each with its own ground and material.

| Grammar | Why it cannot hold both |
|---|---|
| Filmic one-shot | Gives the film hero, then forbids "hard cuts between grounds" and any visible sequence or jump. Kills the rooms. |
| Chaptered editorial | Gives the rooms, forbids media above the fold. Kills the film. |
| Live surface | Bans full-bleed photography and `scrub` outright. |
| Continuous world | One unbroken flight. The user rejected it, and Flow cannot hold frame-identical seams. |
| Typographic poster | No media hero at all. |
| Gallery / catalog | The hero is object one, with no separate title or film treatment. Used for the listing pages instead. |
| Split stage | Forbids full-bleed anything before the resolve. Used for product pages instead. |
| Rhythmic cutlist | Gives cuts, but bans holds and caps acts at 1.4vh. Wrong energy for bridal, and the peak needs room. |

The skill permits a new grammar "when its navigation, sequence, ending, and
explicit bans describe a different structure". This one does.

---

## NEW GRAMMAR: **Threshold and rooms**

**Premise.** The film is not the first act. It is the threshold: the single
continuous surface the visitor stands in before the building starts. Everything
past it is discrete rooms joined by hard cuts. The first cut, out of the film
and into porcelain, is the loudest moment on the page and teaches the grammar
for everything that follows.

**What a section is:** a room. Three things change at every boundary, together:
**ground**, **material**, and **device**. Change one and it is a section. Change
all three and the visitor has walked somewhere.

**The scroll feels like:** entering a shop, then moving between its rooms. Never
a film after the first screen.

**Navigation:** a persistent **room index**, and it jumps. This is the clearest
break from filmic one-shot, which bans jumping outright. It is also a
requirement of the business: three separate trades under one roof, and a
customer who came for jewellery must not have to scroll through retail.

**Hero:** the threshold. Full-bleed film, held, one line of type over it, a
scrim only where the type sits. It is the only continuous, only scrubbed, only
full-bleed moving surface on the entire page.

**Ending:** the **return**. The close reprises the threshold's ground, violet-950,
now still instead of moving. The page ends where it began. Not a fade, not a
footer, not a spotlight.

**Forbids (the bans are the point):**
- Crossfades between rooms. Cuts only, always.
- A second full-bleed film. The threshold is the only one.
- `scrub` anywhere after the threshold.
- `drift` as a continuous gradient across rooms; each room's ground is a hard change.
- A magnetic CTA, a spotlight close, or a kinetic headline stack inside a room.
- Any room that changes fewer than three of {ground, material, device}.
- Chapter numerals or a `01 / 06` readout. The index names rooms, it does not count them.

**Leans on:** `scrub` (threshold only), `reveal` at every room boundary,
`parallax` inside a room's media column, pointer devices for the peak, `count`
for real figures only.

**Why this is not filmic one-shot with headings** (the trap uniqueness.md names
explicitly): in filmic, seams are hidden and jumping is banned. Here seams are
the structure and jumping is the navigation. The two grammars forbid each
other's defining feature.

---

## Feeling curve (curve first, devices second)

| Room | Feeling | What on screen causes it |
|---|---|---|
| Threshold | Arrival | The film, held, dark, one line of type. Nothing asked of her yet |
| I. The week | Recognition | Hard cut to porcelain. Her own wedding week named plainly |
| II. The arithmetic | Discomfort | What it costs to buy, set as real figures |
| III. The craft | **Wonder (PEAK)** | The garment resolves into its own pattern draft under her hand |
| IV. The vault | Appetite | Cut to dark. Gold, metal, a different material entirely |
| V. The rail | Ease | Cut to daylight. Retail, plainly labelled, nothing at stake |
| Return | Resolution | Back to the threshold's dark, now still. The shop, plainly |

No two adjacent rooms share a feeling. III is the peak and takes the largest
span; II is deliberately quiet to set it up. The cut from III to IV is the
hardest on the page: stage grey to violet-950, cloth to metal.

## Score

| Room | Ground | Material | Device | Why this one |
|---|---|---|---|---|
| Threshold | violet-950 | film | `scrub` | The only continuous surface. It is the building's door |
| I. The week | porcelain-50 | silk, photographed | `flow` + `in` | Read, not watched. The cut did the work |
| II. The arithmetic | porcelain-100 | figures, type | `count` | Real numbers only, landing one at a time |
| III. The craft | stage grey | thread, macro | **signature move** + `parallax` | The peak. Bespoke, coded in the page, engine untouched |
| IV. The vault | violet-950 | gold, metal | `parallax` | Depth on a dark ground, no film needed |
| V. The rail | porcelain-100 | cotton, daylight | `reveal` per object | A wipe per object, the grammar of the retail page previewed |
| Return | violet-950 | still | `flow` | It resolves and holds |

Six device families, no family twice in a row, exactly one `scrub` and it is the
threshold, peak has the largest span.

---

## Per-page grammars (full site remake)

> **Superseded, 9 September 2026.** The table below predates the owner's decision
> to move "Threshold and rooms" off the home page and onto `/rentals`, so its
> Home and Rentals-listing rows are both wrong, and its "Split stage" and
> "Gallery / catalog" rows were never ratified. The authoritative page map is
> **`specs/DESIGN_SPEC_V3.md` §8**. Read this table as the original proposal, and
> do not build from it.

Each page gets its own grammar. This is deliberate: it is what stops the site
being one shape repeated, and it gives the fingerprint registry genuine spread.

| Page | Grammar | Hero | Close |
|---|---|---|---|
| Home | **Threshold and rooms** (new) | The film | Return to the threshold's ground |
| Rentals listing | Gallery / catalog | Object one, already labelled | Inquiry plate set as a label |
| Retail listing | Gallery / catalog | Object one, already labelled | Inquiry plate set as a label |
| Jewellery | Gallery / catalog, dark ground | Object one on violet-950 | Cross-sell drawer, not a new page |
| Product page (rental) | Split stage | The 50/50 split established on screen one | The collapse: draft side retreats, booking takes full width |
| Visit / policies | Typographic poster | Type on porcelain | Address plate |
| 404 | Typographic poster | The drawn hanger | Two real escape routes |

The rental product page earns **split stage** precisely because the pattern
draft is a two-sided argument: the photograph and the draft, held in tension,
resolved when she picks her dates. The divider is the seam. That grammar's
close, "the divider travels to one edge and the CTA lives in the winning
column", is exactly the booking step.

---

## The signature move (unchanged)

**The pattern draft.** A flagship garment photograph carries a seam the visitor
drags. On one side the photograph, on the other the garment's own technical line
drawing. Verified working in `reference.html`: the drawing is computed live from
the real JPEG by an SVG edge-detect filter, at zero generation cost.

It lives in Room III on the home page and is the whole spine of the rental
product page. Three to five flagship pieces only.

Under reduced motion it becomes a static two-up, both sides fully visible.

**The stroke-drawing technique** appears in the preloader wordmark, the
"reserved, collect on <date>" confirmation, and the 404.

## Fingerprint gate

`FINGERPRINTS.md` is empty, so the gate passes with nothing to clear. Rows are
appended on ship. The three page grammars in this build already differ from one
another on grammar, nav treatment, hero device, act-sequence shape and close,
which is the standard the next build inherits.
