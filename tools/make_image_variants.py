"""Emit narrow WebP variants of the site's photographs, for srcset.

Why: the category pictures are one size, 660x880, and a 412px phone was
downloading all nine of them at full size for boxes it renders 162-250px wide.
This writes a `<name>-<width>.webp` beside each source at each ladder width
smaller than the source, so a phone can fetch a file its own size.

Originals are never touched and never deleted: they stay as the widest
candidate in every srcset.

    python tools/make_image_variants.py            # write what is missing
    python tools/make_image_variants.py --force    # rewrite everything

Quality 78 with method 6 matches what the sources were encoded at closely
enough that no variant is visibly softer than the original at its own size.
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DIRS = [ROOT / "site" / "public" / "categories", ROOT / "site" / "public" / "jewellery"]
WIDTHS = (160, 320, 480)
QUALITY = 78

force = "--force" in sys.argv


def is_variant(path: Path) -> bool:
    stem = path.stem.rsplit("-", 1)
    return len(stem) == 2 and stem[1].isdigit()


written = 0
for d in DIRS:
    for src in sorted(d.glob("*.webp")):
        if is_variant(src):
            continue
        with Image.open(src) as im:
            for w in WIDTHS:
                if w >= im.width:
                    continue
                out = src.with_name(f"{src.stem}-{w}.webp")
                if out.exists() and not force:
                    continue
                h = round(im.height * w / im.width)
                im.resize((w, h), Image.LANCZOS).save(
                    out, "WEBP", quality=QUALITY, method=6
                )
                print(f"{out.relative_to(ROOT)}  {w}x{h}  {out.stat().st_size // 1024} KB")
                written += 1

print(f"{written} variant(s) written")
