"""
Cut the woman out of the hero photograph so the heading can pass BEHIND her.

The composite on the page is: the garden photograph -> the scrim -> the gold
heading -> this cut-out, laid back over the photograph in the SAME box. The
cut-out is the same pixels as the background, so she lands on herself exactly:
nothing has to be aligned by eye, there is no seam and no halo, and the only
visible change is that the heading is now underneath her.

Runs the ONNX segmentation model directly rather than through `rembg`, because
rembg's pins send pip's resolver into a long backtrack on this machine, and
because going direct keeps the dependency set to onnxruntime + numpy + pillow.
Both models are Apache-2.0, which the project's licence constraint requires;
BRIA RMBG-1.4 is deliberately NOT used, as it is CC BY-NC.

    tools/.venv-matte/Scripts/python.exe tools/cut_subject.py

Writes a candidate per model to tools/matte-out/ for inspection. Nothing is
copied into site/public until one has been looked at and chosen.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "site" / "public" / "hero" / "hero-garden.png"
MODELS = ROOT / "tools" / "models"
OUT_DIR = ROOT / "tools" / "matte-out"

# Each model wants its own input size and normalisation; these are the values the
# published pre-processing for each network uses, not guesses.
SPECS = {
    # u2netp is the 4.4MB sibling of u2net: same pre-processing, a fraction of
    # the download, and enough for a single figure against a garden.
    "u2netp": {"size": 320, "mean": (0.485, 0.456, 0.406), "std": (0.229, 0.224, 0.225)},
    "u2net_human_seg": {"size": 320, "mean": (0.485, 0.456, 0.406), "std": (0.229, 0.224, 0.225)},
    "isnet-general-use": {"size": 1024, "mean": (0.5, 0.5, 0.5), "std": (1.0, 1.0, 1.0)},
}


def matte(model: str, src: Image.Image) -> Image.Image:
    spec = SPECS[model]
    n = spec["size"]

    small = src.convert("RGB").resize((n, n), Image.LANCZOS)
    x = np.asarray(small, dtype=np.float32) / 255.0
    x = (x - np.array(spec["mean"], dtype=np.float32)) / np.array(spec["std"], dtype=np.float32)
    x = x.transpose(2, 0, 1)[None].astype(np.float32)

    sess = ort.InferenceSession(
        str(MODELS / f"{model}.onnx"), providers=["CPUExecutionProvider"]
    )
    pred = sess.run(None, {sess.get_inputs()[0].name: x})[0][0, 0]

    lo, hi = float(pred.min()), float(pred.max())
    pred = (pred - lo) / (hi - lo + 1e-8)

    m = Image.fromarray((pred * 255).astype(np.uint8), mode="L")
    return m.resize(src.size, Image.LANCZOS)


def largest_blob(alpha: Image.Image) -> tuple[Image.Image, int]:
    """Keep only the biggest connected region of the matte.

    A matte over a garden picks up stray flower heads and leaf edges as little
    islands of alpha. Laid back over the photograph they are invisible — they
    sit on themselves — right up until the heading passes under one, which is
    exactly where a stray island turns into a smear across a letter. So they go.
    """
    a = np.array(alpha)
    lab, n = ndimage.label(a > 24)
    if n <= 1:
        return alpha, 0
    sizes = ndimage.sum(a > 24, lab, range(1, n + 1))
    keep = int(np.argmax(sizes)) + 1
    a[lab != keep] = 0
    return Image.fromarray(a), n - 1


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    src = Image.open(SRC).convert("RGBA")
    print(f"source {SRC.name} {src.size[0]}x{src.size[1]}")

    for model in SPECS:
        path = MODELS / f"{model}.onnx"
        if not path.exists() or path.stat().st_size < 1_000_000:
            print(f"  {model}: SKIPPED (model not downloaded)")
            continue

        alpha = matte(model, src)
        alpha, dropped = largest_blob(alpha)
        # A sub-pixel feather stops the cut edge reading as a sticker outline
        # once the page upscales this plate past its native 1247px.
        alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))

        cut = src.copy()
        cut.putalpha(alpha)
        out = OUT_DIR / f"subject-{model}.png"
        cut.save(out)

        a = np.array(alpha, dtype=np.float32) / 255.0
        cols = np.where(a.sum(axis=0) > 1)[0]
        rows = np.where(a.sum(axis=1) > 1)[0]
        box = (
            f"x {cols.min()/src.size[0]:.0%}-{cols.max()/src.size[0]:.0%}, "
            f"y {rows.min()/src.size[1]:.0%}-{rows.max()/src.size[1]:.0%}"
        ) if len(cols) and len(rows) else "empty"
        print(
            f"  {model}: covers {a.mean():.1%} of frame, bounds {box}, "
            f"dropped {dropped} stray island(s) -> {out.name}"
        )

    print(f"\ncandidates in {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
