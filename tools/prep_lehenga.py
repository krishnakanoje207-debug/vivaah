#!/usr/bin/env python3
"""
Prep lehenga photos for WAN image-to-video.

For each input image this:
  1. removes the background (rembg),
  2. trims to the garment and scales it to a consistent height,
  3. composites it onto a chosen studio backdrop, and
  4. grounds it with a soft shadow / halo so it sits in the scene.

The output PNG is the clean first frame you feed to WAN I2V.

Styles (--style):
  studio  (default)  bright light-grey studio with a soft spotlight and a floor
                     shadow  -- the clean e-commerce look (like the reference).
  dusk               deep dusk-purple with a warm marigold glow (Vivaah hero theme).

Usage:
    python prep_lehenga.py --input ./raw --output ./prepped
    python prep_lehenga.py --input ./raw --output ./prepped --style dusk
    python prep_lehenga.py --input ./raw --output ./prepped --alpha-matting   # cleaner edges

Notes:
  * rembg needs onnxruntime, which currently ships wheels for Python <= 3.13.
    If `pip install rembg` fails on Python 3.14, use a Python 3.12 venv, or run
    the background-removal cell in tools/wan_i2v_colab.ipynb instead.
  * Background removal KEEPS the mannequin (it's foreground). To get a "floating
    as if worn" ghost-mannequin look you need extra editing -- see README.
  * Sheer net dupattas are semi-transparent; use --alpha-matting for cleaner edges.
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    sys.exit("Pillow is missing. Run:  pip install -r tools/requirements-prep.txt")

IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

STYLES = {
    # bright light-grey studio (matches the e-commerce reference)
    "studio": dict(
        top=(233, 232, 230), bottom=(214, 212, 210),
        overlay=(246, 245, 243), overlay_strength=0.62, overlay_cy=0.40,
        ground_shadow=True, warm_halo=False,
    ),
    # deep dusk-purple hero theme (IMPLEMENTATION_PLAN.md §8)
    "dusk": dict(
        top=(26, 16, 48), bottom=(45, 27, 78),
        overlay=(255, 157, 60), overlay_strength=0.30, overlay_cy=0.62,
        ground_shadow=False, warm_halo=True,
    ),
}


def vertical_gradient(w, h, top, bottom):
    """Fast top->bottom gradient: build one column, then stretch."""
    col = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(h - 1, 1)
        col.putpixel((0, y), tuple(int(a + (b - a) * t) for a, b in zip(top, bottom)))
    return col.resize((w, h))


def radial_overlay(bg, color, strength, cy=0.42, rx=0.78, ry=0.62):
    """Soft radial wash (studio spotlight, or warm dusk glow)."""
    w, h = bg.size
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    ccx, ccy = w // 2, int(h * cy)
    ex, ey = int(w * rx), int(h * ry)
    d.ellipse([ccx - ex, ccy - ey, ccx + ex, ccy + ey], fill=int(255 * strength))
    mask = mask.filter(ImageFilter.GaussianBlur(max(w, h) // 5))
    return Image.composite(Image.new("RGB", (w, h), color), bg, mask)


def build_backdrop(cfg, w, h):
    bg = vertical_gradient(w, h, cfg["top"], cfg["bottom"])
    return radial_overlay(bg, cfg["overlay"], cfg["overlay_strength"], cy=cfg["overlay_cy"])


def ground_shadow(size, cut, pos, opacity=100):
    """Soft floor contact shadow beneath the garment (studio grounding)."""
    w, h = size
    x, y = pos
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    gx = x + cut.width // 2
    gy = y + cut.height - int(cut.height * 0.015)
    ew, eh = int(cut.width * 0.52), int(cut.width * 0.09)
    d.ellipse([gx - ew, gy - eh, gx + ew, gy + eh], fill=opacity)
    m = m.filter(ImageFilter.GaussianBlur(int(cut.width * 0.06)))
    shadow = Image.new("RGBA", (w, h), (45, 43, 43, 255))
    shadow.putalpha(m)
    return shadow


def subject_halo(size, cut, pos, opacity=90):
    """Warm-white halo behind the garment (dusk theme 'floating' look)."""
    w, h = size
    halo = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    tint = Image.new("RGBA", cut.size, (255, 240, 210, opacity))
    tint.putalpha(cut.split()[-1].point(lambda a: int(a * opacity / 255)))
    halo.paste(tint, pos, tint)
    return halo.filter(ImageFilter.GaussianBlur(int(max(w, h) * 0.04)))


def remove_bg(img, session, alpha_matting):
    from rembg import remove
    if alpha_matting:
        return remove(
            img, session=session, alpha_matting=True,
            alpha_matting_foreground_threshold=245,
            alpha_matting_background_threshold=15,
            alpha_matting_erode_size=8,
        )
    return remove(img, session=session)


def prep_one(path, out_path, session, cfg, W, H, fill_frac, alpha_matting):
    img = Image.open(path).convert("RGBA")
    cut = remove_bg(img, session, alpha_matting)

    bbox = cut.split()[-1].getbbox()   # trim to visible garment
    if bbox:
        cut = cut.crop(bbox)

    target_h = int(H * fill_frac)
    scale = target_h / cut.height
    if cut.width * scale > W * 0.94:
        scale = (W * 0.94) / cut.width
    cut = cut.resize((max(1, int(cut.width * scale)), max(1, int(cut.height * scale))))

    x = (W - cut.width) // 2
    y = max(int(H * 0.03), int(H * 0.90) - cut.height)

    canvas = build_backdrop(cfg, W, H).convert("RGBA")
    if cfg["ground_shadow"]:
        canvas = Image.alpha_composite(canvas, ground_shadow((W, H), cut, (x, y)))
    if cfg["warm_halo"]:
        canvas = Image.alpha_composite(canvas, subject_halo((W, H), cut, (x, y)))
    canvas.paste(cut, (x, y), cut)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(out_path, "PNG")


def main():
    ap = argparse.ArgumentParser(description="Prep lehenga images for WAN I2V.")
    ap.add_argument("--input", required=True, help="folder of raw lehenga photos")
    ap.add_argument("--output", required=True, help="folder for prepped PNGs")
    ap.add_argument("--style", default="studio", choices=list(STYLES),
                    help="backdrop style (default: studio)")
    ap.add_argument("--width", type=int, default=832, help="canvas width (WAN 480P 16:9: 832)")
    ap.add_argument("--height", type=int, default=480, help="canvas height (WAN 480P 16:9: 480)")
    ap.add_argument("--fill", type=float, default=0.86, help="fraction of height the garment fills")
    ap.add_argument("--model", default="isnet-general-use",
                    help="rembg model (u2net | isnet-general-use | u2netp)")
    ap.add_argument("--alpha-matting", action="store_true",
                    help="finer edges for sheer net (slower)")
    args = ap.parse_args()

    try:
        from rembg import new_session
    except ImportError:
        sys.exit(
            "rembg is missing / failed to install (common on Python 3.14 -- "
            "onnxruntime has no 3.14 wheel yet).\n"
            "Fix: use a Python 3.12 venv, or run the prep cell in "
            "tools/wan_i2v_colab.ipynb instead."
        )

    cfg = STYLES[args.style]
    in_dir, out_dir = Path(args.input), Path(args.output)
    images = sorted(p for p in in_dir.rglob("*") if p.suffix.lower() in IMG_EXT)
    if not images:
        sys.exit(f"No images found in {in_dir}")

    session = new_session(args.model)
    print(f"Prepping {len(images)} image(s) [{args.style}] -> {out_dir}  ({args.width}x{args.height})")
    for i, p in enumerate(images, 1):
        out_path = out_dir / (p.stem + ".png")
        prep_one(p, out_path, session, cfg, args.width, args.height, args.fill, args.alpha_matting)
        print(f"  [{i}/{len(images)}] {p.name} -> {out_path.name}")
    print("Done.")


if __name__ == "__main__":
    main()
