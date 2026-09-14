"""
Cut the bride out of the home hero photograph, as a mask, so the name can stand
BEHIND her.

The composite on the page (app/page.tsx, .hero-name / .hero-subject) is: the
garden plate and its scrims -> the name -> the same plate and scrims again,
masked by this file. The second plate is the same pixels as the first, so she
lands on herself exactly: no seam, no halo, and the only visible change is that
the name is now underneath her.

    tools/.venv-matte/Scripts/python.exe tools/cut_subject.py

Writes site/public/hero/hero-garden-subject.webp (alpha only, ~9 KB) plus a
check image in tools/matte-out/ to look at before committing.

Two things the first attempt (10 Sep) got wrong, and why this is shaped as it is:
- u2netp sees a 320px square. Fed the whole 1247x696 frame, the bride was ~80px
  wide to the network and the veil came back as a glow. Fed a crop around her,
  she is near native resolution and the edge holds. So: crop, matte, paste back.
- The crop is matted twice, once mirrored, and averaged; the network's edge
  noise is not symmetric, so the average is cleaner than either pass.
Only Apache-2.0 weights (u2netp) — BRIA RMBG-1.4 is CC BY-NC and not allowed.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
# The served WebP, not an original: the mask must fit the pixels the page shows.
SRC = ROOT / "site" / "public" / "hero" / "hero-garden.webp"
OUT = ROOT / "site" / "public" / "hero" / "hero-garden-subject.webp"
CHECK_DIR = ROOT / "tools" / "matte-out"
MODEL = ROOT / "tools" / "models" / "u2netp.onnx"

# Around the bride, as fractions of the frame (she spans x 41-61%, y 20-94%).
CROP = (0.36, 0.14, 0.66, 1.0)
# Alpha below this is dropped: over the name a faint wisp reads as a smudge.
WISP = 30


def matte(sess: ort.InferenceSession, img: Image.Image) -> np.ndarray:
    n = 320
    x = np.asarray(img.resize((n, n), Image.LANCZOS), dtype=np.float32) / 255.0
    x = (x - np.array((0.485, 0.456, 0.406), np.float32)) / np.array((0.229, 0.224, 0.225), np.float32)
    pred = sess.run(None, {sess.get_inputs()[0].name: x.transpose(2, 0, 1)[None]})[0][0, 0]
    pred = (pred - pred.min()) / (pred.max() - pred.min() + 1e-8)
    m = Image.fromarray((pred * 255).astype(np.uint8)).resize(img.size, Image.LANCZOS)
    return np.asarray(m, dtype=np.float32)


def main() -> int:
    if not MODEL.exists():
        print(f"missing {MODEL}: download u2netp.onnx from the rembg releases")
        return 1
    src = Image.open(SRC).convert("RGB")
    w, h = src.size
    x0, y0, x1, y1 = int(w * CROP[0]), int(h * CROP[1]), int(w * CROP[2]), int(h * CROP[3])
    crop = src.crop((x0, y0, x1, y1))

    sess = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    flip = Image.FLIP_LEFT_RIGHT
    a = (matte(sess, crop) + matte(sess, crop.transpose(flip))[:, ::-1]) / 2

    # Keep the largest region: stray flower heads would smear across a letter.
    lab, n = ndimage.label(a > 24)
    if n > 1:
        sizes = ndimage.sum(a > 24, lab, range(1, n + 1))
        a[lab != int(np.argmax(sizes)) + 1] = 0

    full = np.zeros((h, w), np.float32)
    full[y0:y1, x0:x1] = a
    alpha = np.asarray(
        Image.fromarray(full.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)),
        dtype=np.float32,
    ).copy()
    alpha[alpha < WISP] = 0

    mask = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask.putalpha(Image.fromarray(alpha.astype(np.uint8)))
    mask.save(OUT, "WEBP", lossless=True, quality=100, method=6)

    CHECK_DIR.mkdir(parents=True, exist_ok=True)
    check = Image.new("RGBA", (w, h), (40, 30, 70, 255))
    cut = src.convert("RGBA")
    cut.putalpha(mask.getchannel("A"))
    check.alpha_composite(cut)
    check.convert("RGB").crop((x0, y0, x1, y1)).save(CHECK_DIR / "CHECK-subject.png")

    print(f"{OUT.name}: {OUT.stat().st_size} bytes; check {CHECK_DIR / 'CHECK-subject.png'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
