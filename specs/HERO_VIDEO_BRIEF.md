# Hero Video Brief v2 — for OpenMontage (replaces videos/heroSection/)

Owner feedback on current hero video (11 Jul 2026):
1. Garments don't represent Hinduism — must show **lehenga, saree, side lehenga** etc.
2. Last frame is good but **lifeless** — no people in the background.
3. Site serves **female customers only** — every person on screen must be a woman.

## Master prompt (paste this to OpenMontage as the top-level brief)

> Produce a 7–8 second cinematic hero video, 16:9, minimum 1280×720, 24 fps, no narration, no captions, no on-screen text, no logos, no watermark. Commercial-use-safe generation only (free tiers must permit commercial use).
>
> **Subject:** A luxury Indian Hindu bridal-wear boutique campaign film — women only, absolutely no men or boys anywhere in frame, foreground or background. Feature Indian women in their 20s–30s wearing traditional Hindu wedding garments: a deep-red bridal lehenga with gold zardozi embroidery, a violet/purple reception (side) lehenga with gold gota work, a Banarasi silk saree with a broad gold zari border, and a twirling chaniya choli. Authentic Hindu wedding styling throughout: mehendi-decorated hands, red chooda and gold bangles, jhumka earrings, maang tikka, bindis, marigold-and-rose garlands, brass diyas with live flames, a carved haveli/temple arch or mandap drape backdrop.
>
> **Mood & palette:** Subtle, editorial, unmistakably premium — candlelit gold highlights against a deep violet dusk (night background near #191129, warm gold accents, porcelain-skin highlights). Shallow depth of field, slow graceful camera movement (gentle dolly-in or slow orbit), slow-motion fabric physics — a dupatta lifting, a lehenga hem flaring mid-twirl, silk catching light. No fast cuts, no strobing, no music-video energy. Think Sabyasachi campaign film, not a template stock reel.
>
> **Ending (critical — the loopable tail):** The final 2–3 seconds must be the strongest composition — a bride in the full red-and-gold lehenga, facing camera with a calm confident expression — and the background must be ALIVE: 3–5 softly out-of-focus women in colorful sarees and lehengas behind her, moving naturally, with flickering diyas and warm bokeh fairy lights. Never an empty set. This tail is played FORWARD-THEN-BACKWARD forever on the website (ping-pong loop), so every motion in it must read naturally in reverse:
> - ALLOWED in the tail: candle/diya flames flickering, bokeh lights shimmering, fabric and dupattas swaying gently in air, hair moving slightly, slow blinking, subtle breathing, background women swaying/turning slightly in place.
> - FORBIDDEN in the tail: walking or any directional locomotion, laughing/talking mouth movement, pouring/dropping/throwing, camera dolly/pan/zoom (camera must be FULLY STATIC for the last 2–3 seconds), anyone entering or exiting frame.
> The camera decelerates and locks off ~3 seconds before the end; from that point the shot is a living tableau — ambient motion only.
>
> **Composition:** Keep the upper third and one side (left) relatively calm/dark with negative space — a headline and buttons are overlaid there on the website. Faces and key detail live in the center-right.
>
> **Never include:** men, boys, children, white/western wedding gowns, church or cross imagery, nightclub or party-western outfits, brand logos, jewelry-brand plaques, text of any kind, watermarks, distorted hands, extra fingers, warped faces.

## Shot list (if OpenMontage asks for scenes, use exactly these)

| # | ~Dur | Shot |
|---|------|------|
| 1 | 1.5s | Extreme close-up: mehendi-covered hands with red chooda gliding over gold zardozi embroidery on deep-red lehenga fabric; candlelight glints tracking the thread; violet-dark background. |
| 2 | 2.0s | Slow-motion medium-wide: woman in a twirling chaniya choli / violet side lehenga, skirt flaring, dupatta airborne, in a candlelit haveli courtyard at dusk; other women in sarees blurred in the background clapping. |
| 3 | 1.5s | Medium shot: woman in a Banarasi silk saree with gold zari border descending carved stone steps, gold jhumkas swaying, marigold garlands on the pillars. |
| 4 | 3.5s | Hero ending shot (see master prompt): bride in red-gold bridal lehenga, slow dolly-in that decelerates and LOCKS OFF ~1s in; the remaining ~2.5s is a static-camera living tableau — flames flicker, bokeh shimmers, dupattas sway, background women sway in place. No locomotion, no talking/laughing mouths, no one enters/exits. This tail becomes the site's ping-pong loop. |

## Negative prompt (for any per-shot image/video model that takes one)

`man, male, boy, groom, children, text, watermark, logo, subtitles, caption, western wedding dress, white gown, church, cross, empty background, deserted room, deformed hands, extra fingers, mutated face, blurry face, flicker, jump cut, oversaturated, cartoon, anime, CGI look`

## Technical handoff (unchanged pipeline)

- Deliver as frames or a clean mp4 → re-encode with the dual-video play-once-then-ping-pong-loop ffmpeg pipeline in `IMPLEMENTATION_PLAN.md` §5, replacing `videos/heroSection/`.
- Target ~151 frames @ 24fps ≈ 6.3s minimum; longer is fine, we trim.
- Verify output has **no watermark** (the KlingAI bottom-right watermark forced a crop/overlay last time).
- After swapping the asset, verify by headless-Edge screenshot render, not HTML (hero bug shipped twice from HTML-only checks).
