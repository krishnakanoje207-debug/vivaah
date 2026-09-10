"""
Build the product stage backdrop from the turntable frames' own background.

The owner's ask was to extend the *background* behind the spin viewer, not to
enlarge the garment. The frames are 1280x720 and are not background-removed, so
the plate reads as a rectangle sitting on the page. This makes a wide studio
field that continues the frames' own backdrop past their edges, so the plate
edge has something to dissolve into.

Method: the studio backdrop has no horizontal detail worth keeping, only a
vertical wall-to-floor gradient and a soft spotlight. So we read a vertical
colour profile from the frames' background margins (columns the garment never
reaches), smooth it, stretch it across a wide canvas, and lay the frames' own
spotlight vignette back over it. Because the profile is sampled per row, the
backdrop's colour at any height matches the plate's edge colour at that height
— which is what makes the seam disappear regardless of how the plate is scaled
on the page.

    python tools/make_stage_backdrop.py

Writes site/public/rentals/lahenga1/stage-backdrop.webp (2560x1440).
"""

from pathlib import Path

from PIL import Image, ImageFilter

SRC = Path("site/public/rentals/lahenga1/360")
OUT = Path("site/public/rentals/lahenga1/stage-backdrop.webp")

OUT_W, OUT_H = 2560, 1440
MARGIN = 72        # columns sampled from each edge; garment never reaches these
SAMPLE_EVERY = 6   # frames to average over, so one odd frame cannot skew it


def row_profile() -> list[tuple[float, float, float]]:
    """Average background colour per row, across the arc and both margins."""
    frames = sorted(SRC.glob("*.webp"))[::SAMPLE_EVERY]
    if not frames:
        raise SystemExit(f"no frames in {SRC}")

    acc: list[list[float]] = []
    for n, path in enumerate(frames):
        with Image.open(path) as im:
            rgb = im.convert("RGB")
            w, h = rgb.size
            # Squeeze each margin to one column: a per-row average of it.
            left = rgb.crop((0, 0, MARGIN, h)).resize((1, h), Image.BOX)
            right = rgb.crop((w - MARGIN, 0, w, h)).resize((1, h), Image.BOX)
            if not acc:
                acc = [[0.0, 0.0, 0.0] for _ in range(h)]
            for y in range(h):
                lp = left.getpixel((0, y))
                rp = right.getpixel((0, y))
                for c in range(3):
                    acc[y][c] += (lp[c] + rp[c]) / 2

    n = len(frames)
    return [(r / n, g / n, b / n) for r, g, b in acc]


def main() -> None:
    if not SRC.is_dir():
        raise SystemExit(f"missing {SRC} — run from the repo root")

    profile = row_profile()
    h = len(profile)

    # One column carrying the wall-to-floor gradient, then stretched wide.
    column = Image.new("RGB", (1, h))
    for y, (r, g, b) in enumerate(profile):
        column.putpixel((0, y), (round(r), round(g), round(b)))
    # Smooth the column before stretching, or per-row sampling noise becomes
    # horizontal banding once it is 2560px wide.
    column = column.resize((1, h * 4), Image.LANCZOS).filter(
        ImageFilter.GaussianBlur(6)
    ).resize((1, h), Image.LANCZOS)

    field = column.resize((OUT_W, OUT_H), Image.BICUBIC)

    # The frames carry a soft centre spotlight. Without it the wide field reads
    # flat and the plate looks pasted on. Rebuilt here as a large radial mask,
    # kept gentle: it only has to imply the falloff, not match it exactly.
    vignette = Image.new("L", (OUT_W, OUT_H), 0)
    small = Image.new("L", (64, 36), 0)
    cx, cy = 31.5, 15.0
    for y in range(36):
        for x in range(64):
            dx = (x - cx) / 32.0
            dy = (y - cy) / 20.0
            d = min(1.0, (dx * dx + dy * dy) ** 0.5)
            small.putpixel((x, y), round(255 * (1.0 - d) ** 1.6))
    vignette = small.resize((OUT_W, OUT_H), Image.BICUBIC).filter(
        ImageFilter.GaussianBlur(40)
    )

    lit = Image.new("RGB", (OUT_W, OUT_H), (255, 255, 255))
    field = Image.composite(
        Image.blend(field, lit, 0.10), field, vignette.point(lambda v: v // 2)
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    field.save(OUT, "WEBP", quality=88, method=6)
    kb = OUT.stat().st_size / 1024
    print(f"wrote {OUT} — {OUT_W}x{OUT_H}, {kb:.0f} KB")
    print(f"edge colour top {profile[0]}")
    print(f"edge colour mid {profile[h // 2]}")
    print(f"edge colour bottom {profile[-1]}")


if __name__ == "__main__":
    main()
