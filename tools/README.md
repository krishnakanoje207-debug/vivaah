# Vivaah — Lehenga hero-clip toolkit

Turn a single lehenga photo into a slowly-rotating "floating garment" hero clip
for the website — **free**, using open-source WAN 2.1 on a free Colab GPU.
Your GTX 1650 is not used; the model runs on a borrowed cloud T4.

> The AI clip is the **beauty shot**. Accuracy lives in the real Amazon/Flipkart-style
> 360° slider (built from your actual turntable photos). Keep both.

## Files

| File | What it does |
|---|---|
| `prep_lehenga.py` | Local: remove background + composite on the dusk backdrop |
| `requirements-prep.txt` | Deps for the local prep script |
| `wan_i2v_colab.ipynb` | Free Colab notebook: prep **and** generate the videos |

## Fastest path (everything in Colab — no local install)

1. In Google Drive make a folder `vivaah/raw` and upload your lehenga photos.
2. Open `wan_i2v_colab.ipynb` in Google Colab → **Runtime → Change runtime type → T4 GPU**.
3. Run the cells top to bottom: GPU check → install → mount Drive → config →
   prep → load WAN → generate.
4. Finished MP4s land in `vivaah/videos` in your Drive.

**Speed reality:** a free T4 takes roughly **20–40 min per ~5-second clip**. Do a few
per session; the generate cell skips clips it already made, so you can resume until
all ~30 are done. Want it faster → Colab A100, or the GGUF/ComfyUI route.

## Local prep (optional)

Only needed if you'd rather remove backgrounds on your laptop:

```bash
pip install -r tools/requirements-prep.txt
python tools/prep_lehenga.py --input ./raw --output ./prepped --alpha-matting
```

Then upload the `prepped/` PNGs to `vivaah/prepped` in Drive and run only the
**load WAN** + **generate** cells in the notebook.

> ⚠️ `rembg` needs `onnxruntime`, which has no Python **3.14** wheel yet (you have
> 3.14). If `pip install` fails, use a Python 3.12 venv, or just do the prep in the
> Colab cell instead — same result.

## Prompt & settings

The notebook already has the tuned prompt, negative prompt, and WAN settings baked
in (480×832, 81 frames @ 16fps, 30 steps, CFG 5.5, seed 42). Reuse the same seed
across every lehenga so the clips feel like one consistent set.

**Tip:** don't ask for a full 360° in one short clip — WAN never saw the garment's
back and will invent/morph it. A slow ~180–270° arc looks cleanest; the real slider
covers the true back.

## `pattern_draft.py` — photo → pattern-draft line drawing

Turns a garment photo into a static "pattern draft" PNG: dark ink lines on a
porcelain background, same pixel size as the input. Precomputed on purpose —
a live SVG edge-detect filter works in-browser but is too slow on mid-range
Android phones, so this bakes the drawing offline instead.

```bash
py tools/pattern_draft.py site/public/categories/bridal-lehengas.jpg out.png
py tools/pattern_draft.py in.jpg out.png --thickness 2 --transparent
py tools/pattern_draft.py --batch site/public/categories out_dir
```

Pipeline: greyscale → blur → contrast boost → Sobel edges → threshold →
despeckle (drops small isolated edge blobs, which is what keeps busy photo
backgrounds quiet — long connected garment seams survive, scattered
background texture doesn't). Tuned defaults (`--threshold 45`,
`--thickness 1`) hold up on blurred/plain/gradient backgrounds. **Sharp
high-contrast clutter — foliage, brick, fencing — is not suppressed by
thresholding alone**; for those, hand-paint a white(garment)/black(rest)
PNG and pass `--mask maskfile.png` to hard-clip the drawing.
