#!/usr/bin/env python3
"""
pattern_draft.py — turn a garment photo into a "pattern draft" line drawing:
dark ink lines on a porcelain background, static PNG (no live SVG filter,
which is too expensive on mid-range Android phones).

Pipeline: greyscale -> mild blur (kill sensor noise) -> contrast boost ->
Sobel edge magnitude -> threshold -> despeckle (drop small isolated blobs,
this is what keeps busy photo backgrounds quiet) -> optional line thickening
-> composite ink on paper (or ink on transparent alpha).

For a background that still bleeds through the despeckle pass, pass
--mask with a hand-painted white(garment)/black(background) PNG the same
aspect as the input; edges outside the white area are dropped outright.
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from scipy.ndimage import sobel, label, sum as ndi_sum, generate_binary_structure

DEFAULT_THRESHOLD = 45.0   # % of max gradient magnitude (0-255 scale)
DEFAULT_THICKNESS = 1
MIN_BLOB_PIXELS = 6        # connected edge blobs smaller than this are dropped as noise
EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def edge_map(img, threshold, mask_img=None):
    grey = img.convert("L").filter(ImageFilter.GaussianBlur(radius=1.5))
    grey = ImageEnhance.Contrast(grey).enhance(1.4)
    arr = np.asarray(grey, dtype=np.float32)

    gx = sobel(arr, axis=1)
    gy = sobel(arr, axis=0)
    mag = np.hypot(gx, gy)
    if mag.max() > 0:
        mag = mag / mag.max() * 255.0

    edges = mag >= threshold

    # despeckle: drop small isolated edge blobs (background sky/fence/wall
    # texture fragments into tiny disconnected specks; real garment seams
    # and embroidery lines form long connected runs and survive this)
    structure = generate_binary_structure(2, 2)
    labeled, n = label(edges, structure=structure)
    if n > 0:
        sizes = ndi_sum(edges, labeled, range(1, n + 1))
        keep = np.zeros(n + 1, dtype=bool)
        keep[1:] = sizes >= MIN_BLOB_PIXELS
        edges = keep[labeled]

    if mask_img is not None:
        m = mask_img.convert("L").resize(grey.size, Image.NEAREST)
        edges &= np.asarray(m) > 127

    return edges


def thicken(edges, thickness):
    if thickness <= 1:
        return edges
    size = thickness if thickness % 2 else thickness + 1
    img = Image.fromarray((edges * 255).astype(np.uint8))
    img = img.filter(ImageFilter.MaxFilter(size))
    return np.asarray(img) > 0


def compose(edges, ink, paper, transparent):
    h, w = edges.shape
    ink_rgb = hex_to_rgb(ink)
    if transparent:
        out = np.zeros((h, w, 4), dtype=np.uint8)
        out[edges] = (*ink_rgb, 255)
        return Image.fromarray(out, "RGBA")
    out = np.empty((h, w, 3), dtype=np.uint8)
    out[:] = hex_to_rgb(paper)
    out[edges] = ink_rgb
    return Image.fromarray(out, "RGB")


def process_one(in_path, out_path, args, mask_img=None):
    img = Image.open(in_path).convert("RGB")
    edges = edge_map(img, args.threshold, mask_img)
    edges = thicken(edges, args.thickness)
    out = compose(edges, args.ink, args.paper, args.transparent)
    out.save(out_path)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("input", nargs="?", help="input photo")
    p.add_argument("output", nargs="?", help="output PNG")
    p.add_argument("--batch", nargs=2, metavar=("INDIR", "OUTDIR"), help="convert every image in INDIR into OUTDIR")
    p.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD, help=f"edge strength floor, 0-255 (default {DEFAULT_THRESHOLD})")
    p.add_argument("--thickness", type=int, default=DEFAULT_THICKNESS, help="line thickness in px (default 1)")
    p.add_argument("--paper", default="#FAFAF7", help="background hex colour (ignored with --transparent)")
    p.add_argument("--ink", default="#241D31", help="line hex colour")
    p.add_argument("--transparent", action="store_true", help="emit ink-on-alpha PNG instead of ink-on-paper")
    p.add_argument("--mask", help="white(garment)/black(background) PNG restricting where lines can draw; single-file mode only")
    args = p.parse_args()

    mask_img = Image.open(args.mask) if args.mask else None

    if args.batch:
        indir, outdir = Path(args.batch[0]), Path(args.batch[1])
        outdir.mkdir(parents=True, exist_ok=True)
        files = sorted(f for f in indir.iterdir() if f.suffix.lower() in EXTS)
        if not files:
            sys.exit(f"no images found in {indir}")
        for f in files:
            out = outdir / (f.stem + ".png")
            process_one(f, out, args, mask_img)
            print(f"wrote {out}")
    else:
        if not args.input or not args.output:
            p.error("input and output are required unless --batch is used")
        process_one(args.input, args.output, args, mask_img)
        print(f"wrote {args.output}")


if __name__ == "__main__":
    main()
