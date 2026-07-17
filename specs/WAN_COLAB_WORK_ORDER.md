# WAN Colab Work Order — Vivaah Hero Film (4 shots)

**Goal:** generate the 4 shots of the new homepage hero film on a **free Google Colab T4 GPU**, at **₹0**, then hand the raw clips back to OpenMontage, which does all the finishing (best-take pick, brand color grade, upscale to 1280×720, and the play-once-then-ping-pong-loop encode).

This work order was produced by the OpenMontage `cinematic` pipeline (research → proposal → script → scene, all checkpointed under `D:\OpenMontage\projects\vivaah-hero\`). The creative source of truth is `specs/HERO_VIDEO_BRIEF.md`; this document is the executable hand-off.

---

## 0. TL;DR — what you actually do

1. Open Google Colab, set the runtime to **T4 GPU**.
2. Upload **`tools/wan_t2v_colab.ipynb`** (from this repo).
3. Run the cells top to bottom. It generates 4 shots × 2–4 takes into your Google Drive.
4. Download the `vivaah/heroSection_v2/raw/` folder from Drive to
   **`D:\vivaah website preview\videos\heroSection_v2\raw\`**.
5. Tell the build agent it's done. You do **not** pick takes, trim, grade, or upscale — that's automated.

Expected total time on a free T4: **~1–1.5 hours** (11 takes, all on the fast **1.3B** model). You can stop and resume across sessions — the notebook skips takes it already made.

> **Why everything runs on 1.3B (not 14B):** WAN 2.1 T2V-14B's bf16 weights are ~28GB (plus the umt5-xxl text encoder), and `enable_model_cpu_offload()` keeps offloaded weights in **system RAM** — free Colab pairs the T4 with only ~12.7GB RAM, so loading 14B kills the session before a single frame renders. Quality on the face shots (2 & 4) therefore comes from **more takes (best-of-3/4)** plus the downstream upscale. 14B remains an **opt-in upgrade only on paid/high-RAM runtimes** (Colab Pro "High-RAM", or a local ≥32GB-RAM GPU machine); the notebook's loader checks your RAM and refuses `"14b"` instantly with an explanation instead of dying 20 minutes into a download.

---

## 1. Which generation path (decision + why)

Three paths were evaluated after the Gemini + Pexels keys were added on 11 Jul 2026:

| Path | Cost | Status | Use it for |
|---|---|---|---|
| **A. WAN 2.1 Text-to-Video (T2V)** — *DEFAULT* | ₹0, no keys | ✅ Ready | The whole film. Renders the brand violet/gold palette and the women-only living tableau from scratch. |
| **B. WAN 2.1 Image-to-Video (I2V) seeded by Pexels stock photos** | ₹0 | ✅ Optional | Optional sharper single-subject seeds for **shot 1** and **shot 3** only. |
| **C. I2V seeded by Gemini/Imagen generated stills** | ₹0 in theory | ❌ **BLOCKED** | Nothing right now — see below. |

**Why T2V is the default (not I2V):** I2V gives better subject sharpness, but it needs a *reference still per shot*. The only free way to make a brand-accurate still (Gemini/Imagen) is **blocked**: the supplied `GOOGLE_API_KEY` returns HTTP 429 `limit: 0` for every Gemini image model and HTTP 400 *"Imagen is only available on paid plans"* — **image generation is paid-only on this key's free tier.** Pexels photos are free but look like generic stock, feature real identifiable people, don't match the violet/gold palette, and can't supply shot 4's crowd of 3–5 background women. T2V renders all of that on-brief with zero keys, so it is the spine. (If you later add billing/image quota to the Google account, path C becomes the best-quality option — regenerate stills with Gemini and switch shots to I2V.)

---

## 2. Google Drive setup (once)

In your Google Drive, the notebook will create:
```
MyDrive/vivaah/heroSection_v2/raw/shot1/
MyDrive/vivaah/heroSection_v2/raw/shot2/
MyDrive/vivaah/heroSection_v2/raw/shot3/
MyDrive/vivaah/heroSection_v2/raw/shot4/
```
You don't have to make these by hand — cell 4 creates them.

---

## 3. Default path (A): run the T2V notebook

1. Colab → **Runtime → Change runtime type → T4 GPU**.
2. **File → Upload notebook →** `tools/wan_t2v_colab.ipynb`.
3. Run cells **1 → 6** in order. Cell 4 (config) already contains the 4 prompts, the shared negative prompt, and per-shot settings — you don't need to edit it.
4. When it finishes, download `MyDrive/vivaah/heroSection_v2/raw/` to
   `D:\vivaah website preview\videos\heroSection_v2\raw\`.

**Upgrade tip (paid runtimes only):** the config already runs everything on `"1.3b"` — that IS the free-tier final. If you ever get **Colab Pro (High-RAM runtime)** or a local ≥32GB-RAM GPU box, you can re-run just shots 2 and 4 with `"model": "14b"` for better faces (delete their folders in Drive first so they regenerate). **Do not set `"14b"` on free Colab** — it cannot load there; the notebook will stop you with a RAM-check error rather than crash, but it's wasted time.

---

## 4. The 4 shot prompts (verbatim)

These are already inside the notebook. Reproduced here as the record of truth. Each is tuned to WAN guidance (≈80–110 words; describe subject, motion, camera, lighting, mood; don't over-stack quality triggers).

### Shot 1 — Hook: the thread (macro embroidery) · target 1.5s
> Extreme close-up of an Indian woman's mehendi-decorated hands wearing a red chooda and gold bangles, fingertips gliding slowly across dense gold zardozi embroidery on deep-red bridal silk. Warm candlelight travels along the raised metallic thread; sequins and beadwork catch tiny glints. Soft violet-dark background, shallow depth of field, gentle slow push-in. Rich reds and antique gold against near-black violet, warm tungsten glow, fine film grain, smooth stable slow motion. Editorial luxury fashion campaign, intimate and tactile, no face in frame, women only.

### Shot 2 — Escalation: the twirl (slow-motion) · target 2.0s
> Slow-motion medium-wide shot of a graceful Indian woman in her twenties wearing a flowing violet and gold side lehenga with a full flared skirt, twirling in a candlelit haveli courtyard at dusk. Her sheer dupatta lifts and floats on the air, the skirt hem flaring in a wide circle. Two or three women in colourful sarees stand softly out of focus behind her, gently clapping. Warm gold candle glow, deep violet shadows, bokeh lights, shallow depth of field, slow gentle camera orbit. Elegant, premium, cinematic, fine film grain, smooth motion, women only.

### Shot 3 — Reveal: the saree descent · target 1.5s
> Medium shot of an elegant Indian woman in a Banarasi silk saree with a broad gold zari border, descending a carved stone haveli staircase at dusk. Her gold jhumka earrings sway with each step; marigold and rose garlands drape the stone pillars beside her. Warm candlelight and hanging lamps, deep violet twilight, shallow depth of field, a slow graceful camera tilt down following her descent. Regal, unhurried, luxurious Indian bridal campaign, warm gold and violet palette, soft bokeh, fine film grain, smooth stable slow motion, women only.

### Shot 4 — Landing: the living tableau (LOOPABLE TAIL) · target 3.5s
> Cinematic medium shot of an Indian bride in a deep-red and gold bridal lehenga with gold zardozi embroidery, mehendi hands, red chooda, maang tikka and jhumka earrings, facing camera with a calm confident expression. The camera pushes in very slowly for about one second, then stops and stays completely still. For the rest of the shot the camera is locked off and static: brass diya flames flicker, warm bokeh fairy lights shimmer, her dupatta and hair sway gently, she breathes and blinks softly. Three to five women in colourful sarees and lehengas stand softly out of focus behind her, swaying slightly in place. Warm gold candlelight, deep violet dusk, shallow depth of field, film grain. Nobody walks, no talking, nobody enters or leaves the frame. Elegant, premium, alive, women only.

**Why shot 4's wording matters:** the last ~2.5s becomes the website's ping-pong loop (played forward then backward forever). The prompt forces a **static, locked-off camera** and **ambient-only motion** (flames, bokeh, fabric sway, breathing) — no walking, no talking mouths, nobody entering/leaving — so it reads naturally in reverse. Do not "improve" this into a moving camera shot.

### Shared negative prompt (all shots)
> man, male, boy, groom, men, children, kid, text, watermark, logo, subtitles, caption, western wedding dress, white gown, church, cross, empty background, deserted room, deformed hands, extra fingers, mutated hands, mutated face, blurry face, two heads, fused fingers, flicker, strobing, jump cut, fast cut, camera shake, oversaturated, neon colors, cartoon, anime, CGI look, plastic skin, low quality, low resolution, jpeg artifacts, distorted, morphing, warping

---

## 5. Per-shot settings & expected runtime (free T4)

All shots: **832×480** (16:9, native-safe), **16 fps**, `flow_shift = 3.0` (correct for 480p), UniPC scheduler. Generated longer than the target so we have room to trim.

| Shot | Model | Frames (≈dur) | Steps | Guidance | Takes | Seeds | Est. time/clip | Est. shot total |
|---|---|---|---|---|---|---|---|---|
| 1 hands macro | 1.3B | 33 (~2.0s) | 30 | 5.0 | 2 | 42, 7 | ~3–5 min | ~6–10 min |
| 2 twirl | 1.3B | 49 (~3.0s) | 30 | 5.5 | **3** | 42, 7, 123 | ~5–8 min | ~15–24 min |
| 3 saree descent | 1.3B | 33 (~2.0s) | 30 | 5.5 | 2 | 42, 7 | ~3–5 min | ~6–10 min |
| 4 hero tableau | 1.3B | 81 (~5.0s) | 40 | 5.5 | **4** | 42, 7, 123, 99 | ~8–14 min | ~32–56 min |

**Expected total: ~1–1.5 hours (11 takes).** Free-Colab sessions can disconnect; the notebook skips already-saved takes, so just re-run cell 6 in a new session to continue.

**Model choice rationale:** everything runs on **1.3B** because 14B cannot load on free Colab (~28GB of bf16 weights must sit in system RAM under CPU offload; free Colab has ~12.7GB — the session dies before rendering). The quality lever for the two face shots (2 and 4) is therefore **best-of-N takes** — 3 and 4 takes respectively, best picked programmatically at compose — plus the downstream 720p upscale. On a paid high-RAM runtime, 14B remains the opt-in upgrade for shots 2 and 4 (roughly ~25–55 min per clip there).

---

## 6. Where to save the outputs

The notebook writes to Drive; download to these exact folders:
```
D:\vivaah website preview\videos\heroSection_v2\raw\shot1\take1.mp4, take2.mp4
D:\vivaah website preview\videos\heroSection_v2\raw\shot2\take1.mp4 .. take3.mp4
D:\vivaah website preview\videos\heroSection_v2\raw\shot3\take1.mp4, take2.mp4
D:\vivaah website preview\videos\heroSection_v2\raw\shot4\take1.mp4 .. take4.mp4
```
(These folders already exist in the repo.) Keep every take — the compose step chooses.

---

## 7. Optional path (B): I2V from Pexels stills (sharper shots 1 & 3)

If a 480p T2V take for shot 1 or 3 looks soft, you can instead animate a free Pexels **photo** with the existing **`tools/wan_i2v_colab.ipynb`**:

1. Download a chosen Pexels photo (links below) at full resolution.
2. In `wan_i2v_colab.ipynb`, put it in the `RAW_DIR` folder, **skip cell 5 (the rembg background-removal prep — that's for product turntables, not brides)**, and instead drop the full photo straight into `PREPPED_DIR`.
3. Replace the `PROMPT` with the matching shot prompt from §4 (describe the *motion* you want I2V to add — e.g. for shot 3, "she descends the steps, jhumkas sway, dupatta drifts, candlelight flickers").
4. Run cells 6–7. Save the mp4 into the same `raw\shotN\` folder as an extra take.

> Note: Pexels people are real individuals and the look is generic stock — good for a clean single subject, off-brand for palette. Use only for shots 1/3, never for the shot-4 tableau. **Women-only clips/photos only** — skip any with a man in frame.

---

## 8. Pexels candidates (free, commercial-use) — insurance & seeds

Verified live via the Pexels API on 11 Jul 2026. **Do not bulk-download**; grab only what you use. Exclude any with men (a couple of results not listed here contained a groom).

**Shot 1 — hands / mehendi / jewellery (i2v seed or B-roll insurance):**
- Video, bride's hands with henna + gold jewellery, 4s, 4K — https://www.pexels.com/video/a-bride-s-hands-with-henna-tattoos-and-gold-jewelry-27180421/
- Video, intricate mehndi on hand, 9s, 1080p — https://www.pexels.com/video/intricate-mehndi-design-on-hand-at-ceremony-34187403/
- Photo, person with mehndi + ring — https://www.pexels.com/photo/a-person-with-mehndi-wearing-a-ring-15460658/

**Shot 2 — twirl / dance (insurance for fabric flare):**
- Video, graceful dance in vintage Indian attire, 6s, 4K — https://www.pexels.com/video/graceful-dance-in-vintage-indian-attire-35764328/
- Video, elegant woman twirling at night, 7s, 4K — https://www.pexels.com/video/elegant-woman-twirling-in-stunning-dress-at-night-35764324/

**Shot 3 — saree / descent (strong i2v seed):**
- **Photo, bride descending stairs in red lehenga** (near-perfect seed) — https://www.pexels.com/photo/bride-descending-stairs-in-elegant-red-lehenga-32212941/
- Video, elegant south-Indian bride in traditional attire, 5s, 1080p — https://www.pexels.com/video/elegant-south-indian-bride-in-traditional-attire-31155566/
- Video, traditional saree with jasmine flowers, 5s, 1080p — https://www.pexels.com/video/traditional-indian-saree-with-jasmine-flowers-35219294/

**Shot 4 — bride / living background (crowd insurance for the tableau):**
- Video, elegant Indian bridal shoot in outdoor garden, 11s, 1080p — https://www.pexels.com/video/elegant-indian-bridal-shoot-in-outdoor-garden-37224703/
- Video, beautiful Indian bride in traditional attire, 10s, 1080p — https://www.pexels.com/video/beautiful-indian-bride-in-traditional-attire-32315925/
- Photo, elegant bride in traditional red lehenga — https://www.pexels.com/photo/elegant-bride-in-traditional-red-lehenga-32212943/

If T2V struggles to render 3–5 believable background women in shot 4, the compose step can composite a softly-blurred, women-only Pexels clip behind the generated bride as "living background" insurance.

---

## 9. After clips exist — what OpenMontage does (and what you can ignore)

Once the raw takes are in `videos\heroSection_v2\raw\`, the **compose** stage runs key-free (ffmpeg) and handles everything below. **You do NOT need to worry about any of it** — don't hand-pick, trim, grade, or resize:

- **Take selection** — the best take per shot is chosen programmatically (sharpness, no watermark, no men, cleanest motion). Just make sure each shot has at least one clean take.
- **Trimming** — clips are generated longer than target; compose trims each to the brief's duration (1.5 / 2.0 / 1.5 / 3.5s).
- **Color grade** — everything is graded to the brand palette (violet-950 `#191129` shadows, gold `#C2A155`/`#A9853A` highlights, porcelain skin) so all four shots match — you don't need to match looks in Colab.
- **Upscale** — 832×480 → **1280×720** via ffmpeg lanczos + light sharpen (Real-ESRGAN only if softness is objectionable).
- **Loop encode** — the dual-video play-once-then-ping-pong-loop per `IMPLEMENTATION_PLAN.md` §5; shot 4's static tail becomes the seamless loop.
- **Transitions** — slow dissolves between shots; hard cut in from black.

**The only things you must verify in Colab:** each shot has ≥1 take with **(a) no watermark**, **(b) no men/boys anywhere in frame**, **(c) hands/face not grossly deformed** at normal viewing size. Everything else is downstream.

---

## 10. Quality risks at free-tier resolution & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Soft/low detail from 480p native | High | ffmpeg lanczos upscale to 720p + light unsharp at compose; hero is a background video at typical viewport sizes so softness is forgiving; Real-ESRGAN (free, local/Colab) available if needed |
| Deformed hands/faces (esp. shot 1 macro hands, shot 2/4 faces) | High (1.3B is weaker at faces) | **Best-of-N takes is the primary free-tier lever**: 3 takes on shot 2, 4 on shot 4 — pick the clean one; shallow DoF + the negative prompt hide most artifacts; shot 1 is framed to need *no face*; ffmpeg 720p upscale + light sharpen recovers apparent detail. **Paid upgrade path:** re-run shots 2/4 on 14B via Colab Pro High-RAM (14B does not load on free Colab — ~28GB weights vs ~12.7GB RAM) |
| Shot 4 background crowd looks wrong or sparse | Medium | Generate 4 takes; if none convince, composite a blurred women-only Pexels clip behind the bride (§8) |
| Tail not loop-safe (a hand or head drifts one-way) | Medium | Prompt already forbids locomotion/entrances; compose picks the take whose tail is most static and ping-pong-tests it; worst case the loop point is nudged to the most static window |
| Men appear despite negative prompt | Low–Medium | Reject that take; regenerate with a different seed; women-only is a hard gate at take-selection |
| WAN weights commercial-use | — | WAN 2.1 open weights permit commercial use (Apache-2.0); confirm current license text before launch |

---

## 11. Status of the OpenMontage run

- Planning stages complete & checkpointed under `D:\OpenMontage\projects\vivaah-hero\`: **research → proposal → script → scene_plan** (all schema-valid; proposal/script/scene gated stages recorded pre-approved by the user via Fable, 11 Jul 2026).
- Decision audit trail: `D:\OpenMontage\projects\vivaah-hero\decision_log.json` (d-000…d-007, including the re-logged T2V-vs-I2V provider decision and the free-tier 1.3B-only model routing after the 14B RAM finding).
- **Next stage is `assets` — intentionally NOT run here**, because it generates video (no key-free video provider on this machine). This work order *is* the externalized assets stage. After you drop the raw clips in, the build agent resumes at **compose** (ffmpeg, key-free).
