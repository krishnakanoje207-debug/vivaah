"""Cut the owner's logo (2 Oct 2026) into the assets the site uses.

    python tools/make_logo_assets.py [path/to/logo.jpg]

The source is a 2048px JPG with violet lettering and gold linework on an
off-white ground, plus the generator's sparkle in the bottom-right corner. This
lifts the ink off the ground (colour-to-alpha, so anti-aliased edges keep their
true colour instead of a white fringe), drops the corner mark, and writes:

  site/public/brand/logo-on-dark-{1,2}x.webp
                                       lettering in porcelain-50, gold kept,
                                       for the violet-950 footer
  site/public/brand/arch.webp          the gold arch alone, cut at the word's
                                       baseline, framing the live word in the
                                       loading mark (LoadingMark.tsx)
  site/public/og/og-default.jpg        1200x630 link card: the garden photo
                                       beside the logo on porcelain
  site/app/favicon.ico, site/app/apple-icon.png, site/public/brand/icon-{192,512}.png
                                       the arch's silhouette in gold on
                                       violet-950

It prints the word's box inside arch.webp, which is what LoadingMark positions
the arch by.
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "videos" / "Bridal_boutique_logo_design_2K_20261002205235.jpg"
BRAND = ROOT / "site" / "public" / "brand"
BRAND.mkdir(parents=True, exist_ok=True)

PORCELAIN_50 = (0xFA, 0xFA, 0xF7)
VIOLET_950 = (0x19, 0x11, 0x29)

src = Image.open(SRC).convert("RGB")
W, H = src.size

# The ground: the median of the four corners' patches.
patches = [src.crop((x, y, x + 40, y + 40)) for x, y in ((10, 10), (W - 50, 10), (10, H - 50), (W - 50, H - 50))]
px = sorted(p for patch in patches for p in patch.get_flattened_data())
bg = px[len(px) // 2]

# The generator's sparkle sits in the bottom-right corner; paint it out.
src.paste(bg, (W - 220, H - 220, W, H))

# Colour-to-alpha against the ground: every ink here is darker than the ground
# in every channel, so alpha is the largest per-channel darkening, and the
# un-mixed colour is what that pixel would be at full opacity.
r, g, b = src.split()
br, bgc, bb = bg
def chan_alpha(c, base):
    return c.point(lambda v: 0 if v >= base else round(255 * (base - v) / base))
alpha = ImageChops.lighter(ImageChops.lighter(chan_alpha(r, br), chan_alpha(g, bgc)), chan_alpha(b, bb))
alpha = alpha.point(lambda a: 0 if a < 10 else min(255, round((a - 10) * 255 / 245 * 1.35)))

def unmix(img, a):
    out = Image.new("RGB", img.size)
    ip, ap, op = img.load(), a.load(), out.load()
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            k = ap[x, y] / 255
            if k <= 0:
                op[x, y] = bg
                continue
            p = ip[x, y]
            op[x, y] = tuple(max(0, min(255, round((p[i] - (1 - k) * bg[i]) / k))) for i in range(3))
    return out

color = unmix(src, alpha)

# Which ink is which: gold has far more red than blue, the violet does not.
cp = color.load()
gold = Image.new("L", (W, H), 0)
violet = Image.new("L", (W, H), 0)
gp, vp, ap = gold.load(), violet.load(), alpha.load()
for y in range(H):
    for x in range(W):
        if ap[x, y] == 0:
            continue
        rr, gg, bbv = cp[x, y]
        if rr - bbv > 35:
            gp[x, y] = ap[x, y]
        else:
            vp[x, y] = ap[x, y]

def rgba(rgb, a):
    im = rgb.convert("RGBA")
    im.putalpha(a)
    return im

def tight(a, pad=24):
    x0, y0, x1, y1 = a.point(lambda v: 255 if v > 24 else 0).getbbox()
    return (max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad))

box = tight(alpha)
word = violet.point(lambda v: 255 if v > 60 else 0).getbbox()
print("logo box", box, "word box", word)

# 2. For the dark footer: lettering in porcelain, gold as drawn.
on_dark = color.copy()
on_dark.paste(PORCELAIN_50, mask=violet.point(lambda v: 255 if v > 0 else 0))
on_dark = rgba(on_dark, alpha).crop(box)
for scale, name in ((1, "logo-on-dark-1x.webp"), (2, "logo-on-dark-2x.webp")):
    w = 200 * scale
    on_dark.resize((w, round(on_dark.height * w / on_dark.width)), Image.LANCZOS).save(BRAND / name, quality=90)
print("footer logo aspect", on_dark.width, on_dark.height)

# 3. The arch alone, cut where the word sits, for the loading mark.
arch_alpha = gold.crop((0, 0, W, word[3])).copy()
ax0, ay0, ax1, ay1 = arch_alpha.point(lambda v: 255 if v > 24 else 0).getbbox()
arch_box = (min(ax0, word[0]), ay0, max(ax1, word[2]), word[3])
# One solid gold-500 with the drawing carried by alpha: on the violet ground it
# looks the same as the unmixed gold and weighs 16 KB instead of 70, which
# matters because it paints on a first visit's loading screen.
arch_mask = gold.crop(arch_box)
aw, ah = arch_mask.size
arch_w = 560
arch_a = arch_mask.resize((arch_w, round(ah * arch_w / aw)), Image.LANCZOS)
arch = Image.new("RGBA", arch_a.size, (0xC2, 0xA1, 0x55, 255))
arch.putalpha(arch_a)
arch.save(BRAND / "arch.webp", quality=85, method=6, alpha_quality=60)
# Where the word sits inside arch.webp, as fractions, for LoadingMark's CSS.
print(
    "arch.webp word box: left %.4f width %.4f top %.4f height %.4f (arch aspect %.4f)"
    % ((word[0] - arch_box[0]) / aw, (word[2] - word[0]) / aw, (word[1] - arch_box[1]) / ah, (word[3] - word[1]) / ah, aw / ah)
)

# 4. Link card: the garden photo beside the logo. The photo is the old card
# (its own corner carries the same sparkle, which this crop leaves out).
og_path = ROOT / "site" / "public" / "og" / "og-default.jpg"
photo_src = ROOT / "tools" / "og-photo-source.jpg"
if not photo_src.exists():
    Image.open(og_path).save(photo_src, quality=95)
photo = Image.open(photo_src).convert("RGB")
card = Image.new("RGB", (1200, 630), PORCELAIN_50)
pw = 560
crop = photo.crop((620 - pw // 2, 0, 620 + pw // 2, 630))
card.paste(crop, (0, 0))
logo_on_light = rgba(color, alpha).crop(box)
lh = 470
lw = round(logo_on_light.width * lh / logo_on_light.height)
logo_small = logo_on_light.resize((lw, lh), Image.LANCZOS)
card.paste(logo_small, (pw + (1200 - pw - lw) // 2, (630 - lh) // 2), logo_small)
card.save(og_path, quality=88)

# 5. Icons: the arch's silhouette (a domed doorway still reads at 16px, its
# paisley does not), strokes thickened with a round blur-and-threshold at full
# size so they survive the shrink, then centred on violet-950.
ix0, iy0, ix1, iy1 = arch_box
pa = gold.crop((ix0 + round((ix1 - ix0) * 0.08), iy0, ix1 - round((ix1 - ix0) * 0.08), word[1]))
pa = pa.filter(ImageFilter.GaussianBlur(3)).point(lambda v: 255 if v > 70 else round(v * 255 / 70))
side = max(pa.size)
def icon(size, radius_frac=0.22):
    from PIL import ImageDraw
    tile = Image.new("RGBA", (side, side), VIOLET_950 + (255,))
    mark = Image.new("RGBA", pa.size, (0xC2, 0xA1, 0x55, 255))
    mark.putalpha(pa)
    inner = round(side * 0.84)
    k = inner / max(pa.size)
    m = mark.resize((round(pa.width * k), round(pa.height * k)), Image.LANCZOS)
    tile.alpha_composite(m, ((side - m.width) // 2, (side - m.height) // 2))
    mask = Image.new("L", (side, side), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, side - 1, side - 1), radius=round(side * radius_frac), fill=255)
    tile.putalpha(mask)
    return tile.resize((size, size), Image.LANCZOS)

icon(256).save(ROOT / "site" / "app" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
icon(180, radius_frac=0).save(ROOT / "site" / "app" / "apple-icon.png")
# The web app manifest's icons (app/manifest.ts). Square, no corner radius: the
# phone applies its own mask.
for size in (192, 512):
    icon(size, radius_frac=0).save(BRAND / f"icon-{size}.png", optimize=True)
icon(512).save(Path(r"C:/Users/HP/AppData/Local/Temp/claude/D--vivaah-website-preview/e8d7ef94-f21b-4b5f-86ac-2c030b7c33cc/scratchpad") / "icon-preview.png")
print("done")
