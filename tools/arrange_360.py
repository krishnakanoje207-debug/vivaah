#!/usr/bin/env python3
"""
arrange_360.py — turn a folder of turntable frames into a web 360/pendulum
viewer asset set: evenly-sampled, centre-cropped (drops the bottom-right
KlingAI sparkle), WebP-encoded, plus a metadata.json the viewer reads.

Implements IMPLEMENTATION_PLAN.md §2.4 for Preview 0. Pillow only (works on
Python 3.14 where rembg/onnxruntime can't install — no bg-removal here).

Defaults are tuned for videos/lahenga1 (68 frames, ~90° front→profile arc,
1280×720, sparkle watermark bottom-right ~x1150). The garment stays within
x≈430–830 about the turntable axis (~x640), so a centred 4:5 crop removes the
watermark without clipping the dupatta.

Usage (from repo root):
  python tools/arrange_360.py \
      --in videos/lahenga1 \
      --out site/public/rentals/lahenga1/360 \
      --count 32 --arc 90 --no-loop
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image


def even_indices(n: int, k: int) -> list[int]:
    """k indices spread across 0..n-1 inclusive (first and last always chosen)."""
    if k >= n:
        return list(range(n))
    if k == 1:
        return [0]
    return [round(i * (n - 1) / (k - 1)) for i in range(k)]


def center_crop_box(w: int, h: int, aspect: float) -> tuple[int, int, int, int]:
    """Largest centred box of width:height = aspect that fits in w×h."""
    target_w = min(w, int(round(h * aspect)))
    target_h = min(h, int(round(target_w / aspect)))
    x0 = (w - target_w) // 2
    y0 = (h - target_h) // 2
    return (x0, y0, x0 + target_w, y0 + target_h)


def patch_box(im: Image.Image, box: tuple[int, int, int, int], src_x: int) -> None:
    """Paint out a rectangle (e.g. a corner watermark) by tiling a 1px background
    column from just outside the box — invisible on the smooth studio backdrop."""
    from PIL import ImageFilter

    w, h = im.size
    x0, y0, x1, y1 = box
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(w, x1), min(h, y1)
    if x1 <= x0 or y1 <= y0:
        return
    if src_x < 0:
        src_x = x1 + 8
    src_x = min(w - 1, max(0, src_x))
    strip = im.crop((src_x, y0, src_x + 1, y1)).resize((x1 - x0, y1 - y0))
    im.paste(strip, (x0, y0))
    # Feather the seam so the patch dissolves into the backdrop.
    pad = 10
    region = (max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad))
    blurred = im.crop(region).filter(ImageFilter.GaussianBlur(6))
    im.paste(blurred, region)


def main() -> int:
    ap = argparse.ArgumentParser(description="Build a 360/pendulum viewer asset set.")
    ap.add_argument("--in", dest="src", required=True, help="folder of source frames")
    ap.add_argument("--out", dest="out", required=True, help="output folder")
    ap.add_argument("--count", type=int, default=32, help="frames to emit (default 32)")
    ap.add_argument("--aspect", type=float, default=4 / 5, help="crop w:h (default 0.8 = 4:5)")
    ap.add_argument("--shift-x", type=int, default=0,
                    help="px to shift crop box right of centre (negative = left)")
    ap.add_argument("--max-height", type=int, default=900, help="scale so height <= this")
    ap.add_argument("--quality", type=int, default=82, help="WebP quality (default 82)")
    ap.add_argument("--arc", type=float, default=90.0, help="degrees of rotation covered")
    ap.add_argument("--loop", dest="loop", action="store_true",
                    help="full wrap-around 360 (default: pendulum, clamped)")
    ap.add_argument("--no-loop", dest="loop", action="store_false")
    ap.add_argument("--glob", default="*.jpg", help="source glob (default *.jpg)")
    ap.add_argument("--no-crop", dest="no_crop", action="store_true",
                    help="keep the full frame (no cropping)")
    ap.add_argument("--patch", default="",
                    help="watermark box 'x0,y0,x1,y1' (source px) painted out from bg")
    ap.add_argument("--patch-src-x", type=int, default=-1,
                    help="bg column x to sample the patch fill from (default: just right of box)")
    ap.set_defaults(loop=False)
    args = ap.parse_args()
    patch = tuple(int(v) for v in args.patch.split(",")) if args.patch else None

    src = Path(args.src)
    out = Path(args.out)
    frames = sorted(src.glob(args.glob))
    if not frames:
        print(f"No frames matched {args.glob} in {src}", file=sys.stderr)
        return 1

    picks = even_indices(len(frames), args.count)
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.webp"):
        old.unlink()

    pad = max(3, len(str(len(picks) - 1)))
    written = []
    total_kb = 0.0
    dims: tuple[int, int] | None = None

    for i, idx in enumerate(picks):
        with Image.open(frames[idx]) as im:
            im = im.convert("RGB")
            w, h = im.size
            if patch:
                patch_box(im, patch, args.patch_src_x)
            if not args.no_crop:
                x0, y0, x1, y1 = center_crop_box(w, h, args.aspect)
                if args.shift_x:
                    x0 = max(0, min(w - (x1 - x0), x0 + args.shift_x))
                    x1 = x0 + (x1 - x0)
                im = im.crop((x0, y0, x1, y1))
            if im.height > args.max_height:
                scale = args.max_height / im.height
                im = im.resize((round(im.width * scale), args.max_height), Image.LANCZOS)
            dims = im.size
            name = f"{i:0{pad}d}.webp"
            dest = out / name
            im.save(dest, "WEBP", quality=args.quality, method=6)
            kb = dest.stat().st_size / 1024
            total_kb += kb
            written.append(name)

    meta = {
        "basePath": "/" + out.relative_to(Path("site/public")).as_posix()
        if "site/public" in out.as_posix() else out.as_posix(),
        "count": len(written),
        "ext": "webp",
        "pad": pad,
        "width": dims[0] if dims else None,
        "height": dims[1] if dims else None,
        "arcDegrees": args.arc,
        "loop": args.loop,
    }
    (out / "metadata.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"Wrote {len(written)} frames -> {out}")
    print(f"  crop aspect {args.aspect:.3f}, dims {dims}, avg {total_kb/len(written):.1f} KB, "
          f"total {total_kb/1024:.2f} MB")
    print(f"  basePath {meta['basePath']}, arc {args.arc}°, loop={args.loop}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
