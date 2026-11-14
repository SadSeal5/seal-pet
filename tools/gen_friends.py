#!/usr/bin/env python3
"""
Arkadaş sprite üreticisi — fokun masaüstüne gelen küçük dostları.

32x32 tuval, aynı 16 renkli palet ailesi, 1px outline, 2 ton gölge.
Her arkadaş için 2 klip: `idle` (2 kare) ve `walk` (4 kare).

Çıktı: assets/friends/<isim>_<klip>.png + friends.json
Kullanım: python tools/gen_friends.py
"""
import json
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

W = H = 32
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
OUT = os.path.join(ASSETS, "friends")

OUTLINE = (26, 34, 48, 255)
WHITE = (255, 255, 255, 255)
EYE = (26, 34, 48, 255)

# ---------------------------------------------------------------- yardımcılar


def poly_ellipse(cx, cy, rx, ry, angle=0.0, n=36):
    pts = []
    ca, sa = math.cos(angle), math.sin(angle)
    for i in range(n):
        t = 2 * math.pi * i / n
        x, y = rx * math.cos(t), ry * math.sin(t)
        pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    return pts


def ellipse(d, cx, cy, rx, ry, angle=0.0, fill=255):
    d.polygon(poly_ellipse(cx, cy, rx, ry, angle), fill=fill)


def px(img, x, y, color):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((int(x), int(y)), color)


def paste_clipped(base, layer, mask):
    layer.putalpha(ImageChops.multiply(layer.getchannel("A"), mask))
    base.alpha_composite(layer)


def finish(mask, layers):
    """maskeden outline üret, sonra renk katmanlarını maskeyle kırp."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dil = mask.filter(ImageFilter.MaxFilter(3))
    out = ImageChops.subtract(dil, mask)
    img.paste(OUTLINE, mask=out)
    for color, m in layers:
        paste_clipped(img, Image.new("RGBA", (W, H), color), m)
    return img


def ell_mask(cx, cy, rx, ry, angle=0.0):
    m = Image.new("L", (W, H), 0)
    ellipse(ImageDraw.Draw(m), cx, cy, rx, ry, angle)
    return m


def poly_mask(points):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon(points, fill=255)
    return m


def union(*masks):
    out = masks[0]
    for m in masks[1:]:
        out = ImageChops.lighter(out, m)
    return out


def diff(a, b):
    return ImageChops.subtract(a, b)


# ---------------------------------------------------------------- türler
# Her tür: (palet, çizim fonksiyonu). Çizim fonksiyonu (bob, step) alır.


def penguin(bob, step):
    body_c, belly_c, beak_c = (43, 52, 70, 255), (247, 252, 255, 255), (255, 176, 74, 255)
    y = 20 + bob
    body = ell_mask(16, y, 8.0, 9.0)
    head = ell_mask(16, 10 + bob, 6.4, 6.0)
    mask = union(body, head)
    wings = union(ell_mask(8.2, y + 1, 2.6, 5.0, -0.18), ell_mask(23.8, y + 1, 2.6, 5.0, 0.18))
    mask = union(mask, wings)

    belly = ell_mask(16, y + 2.5, 5.4, 6.2)
    face = ell_mask(16, 12 + bob, 4.4, 3.6)
    beak = poly_mask([(16, 12 + bob), (20, 13.5 + bob), (16, 15 + bob)])

    img = finish(mask, [(body_c, mask), (belly_c, union(belly, face))])
    paste_clipped(img, Image.new("RGBA", (W, H), beak_c), beak)

    # gözler
    px(img, 14, 10 + bob, EYE)
    px(img, 18, 10 + bob, EYE)
    px(img, 14, 11 + bob, WHITE)
    px(img, 18, 11 + bob, WHITE)

    # ayaklar
    foot = beak_c
    fx = 12 + int(step)
    for ox in (0, 6):
        ImageDraw.Draw(img).rectangle([fx + ox, 29, fx + ox + 3, 30], fill=foot)
    return img


def otter(bob, step):
    fur, fur_d, belly_c = (146, 106, 74, 255), (110, 78, 54, 255), (232, 210, 186, 255)
    y = 21 + bob
    body = ell_mask(16, y, 9.0, 6.6)
    head = ell_mask(16, 12 + bob, 6.2, 5.6)
    ears = union(ell_mask(11.5, 8 + bob, 2.0, 2.0), ell_mask(20.5, 8 + bob, 2.0, 2.0))
    tail = poly_mask([(24, y + 2), (31, y - 2), (30, y + 4)])
    mask = union(body, head, ears, tail)

    img = finish(mask, [(fur, mask)])
    paste_clipped(img, Image.new("RGBA", (W, H), belly_c), ell_mask(16, y + 2, 6.0, 4.0))
    paste_clipped(img, Image.new("RGBA", (W, H), fur_d), union(ears, ell_mask(16, 15 + bob, 3.4, 2.6)))

    px(img, 14, 11 + bob, EYE)
    px(img, 18, 11 + bob, EYE)
    px(img, 14, 12 + bob, WHITE)
    px(img, 18, 12 + bob, WHITE)
    # burun + bıyık
    px(img, 16, 14 + bob, EYE)
    for i in range(3):
        px(img, 13 - i, 15 + bob + i // 2, fur_d)
        px(img, 19 + i, 15 + bob + i // 2, fur_d)

    # patiler
    fx = 12 + int(step)
    for ox in (0, 6):
        ImageDraw.Draw(img).rectangle([fx + ox, 28, fx + ox + 3, 29], fill=fur_d)
    return img


def seagull(bob, step):
    body_c, wing_c, beak_c = (247, 252, 255, 255), (176, 198, 218, 255), (255, 176, 74, 255)
    y = 21 + bob
    body = ell_mask(16, y, 8.6, 6.0)
    head = ell_mask(16, 12 + bob, 5.4, 5.0)
    tail = poly_mask([(23, y), (31, y - 3), (30, y + 3)])
    mask = union(body, head, tail)

    img = finish(mask, [(body_c, mask)])
    paste_clipped(img, Image.new("RGBA", (W, H), wing_c), ell_mask(13, y - 1, 6.0, 3.4, 0.12))
    beak = poly_mask([(20, 12 + bob), (26, 13.5 + bob), (20, 15 + bob)])
    paste_clipped(img, Image.new("RGBA", (W, H), beak_c), beak)

    px(img, 16, 11 + bob, EYE)
    px(img, 16, 12 + bob, WHITE)

    # bacaklar
    lc = (255, 176, 74, 255)
    fx = 13 + int(step)
    for ox in (0, 5):
        ImageDraw.Draw(img).rectangle([fx + ox, 27, fx + ox + 1, 30], fill=lc)
    return img


def crab(bob, step):
    shell, shell_d, claw = (232, 92, 84, 255), (186, 62, 60, 255), (255, 138, 92, 255)
    y = 21 + bob
    body = ell_mask(16, y, 9.0, 5.6)
    mask = body

    img = finish(mask, [(shell, mask)])
    paste_clipped(img, Image.new("RGBA", (W, H), shell_d), ell_mask(16, y + 2.4, 7.0, 2.6))

    # kıskaçlar
    for side, ang in ((1, 0.5), (-1, -0.5)):
        cx = 16 + side * 10.5
        cl = union(ell_mask(cx, y - 1, 3.0, 2.2, ang), ell_mask(cx + side * 2.2, y - 2.4, 2.2, 1.6, ang))
        paste_clipped(img, Image.new("RGBA", (W, H), claw), cl)

    # göz sapları
    for side in (1, -1):
        sx = 16 + side * 3
        ImageDraw.Draw(img).line([sx, y - 4, sx, y - 7], fill=shell_d)
        px(img, sx, y - 8, EYE)
        px(img, sx, y - 9, WHITE)

    # bacaklar
    lc = shell_d
    fx = 11 + int(step)
    for i in range(3):
        ImageDraw.Draw(img).line([fx + i * 5, y + 4, fx + i * 5 - 2, 30], fill=lc)
    return img


def fish(bob, step):
    body_c, fin_c = (255, 150, 96, 255), (255, 209, 102, 255)
    y = 17 + bob
    body = ell_mask(16, y, 8.0, 5.4)
    tail = poly_mask([(8, y), (2, y - 4), (2, y + 4)])
    fin = poly_mask([(16, y - 5), (20, y - 8), (21, y - 4)])
    mask = union(body, tail, fin)

    img = finish(mask, [(body_c, mask)])
    paste_clipped(img, Image.new("RGBA", (W, H), fin_c), union(tail, fin, ell_mask(16, y + 2, 6.0, 2.4)))
    px(img, 21, y - 1, EYE)
    px(img, 21, y, WHITE)
    return img


SPECIES = {
    "penguin": penguin,
    "otter": otter,
    "seagull": seagull,
    "crab": crab,
    "fish": fish,
}

# klip -> (kare sayısı, fps, döngü, kare üretici)
CLIPS = {
    "idle": (2, 3, True, lambda i: (0 if i == 0 else -1, 0)),
    "walk": (4, 9, True, lambda i: ([-1, 0, -1, 0][i], [0, 2, 0, -2][i])),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    atlas = {}

    for name, fn in SPECIES.items():
        for clip, (count, fps, loop, pose) in CLIPS.items():
            strip = Image.new("RGBA", (W * count, H), (0, 0, 0, 0))
            for i in range(count):
                bob, step = pose(i)
                strip.alpha_composite(fn(bob, step), (i * W, 0))
            fname = f"{name}_{clip}.png"
            strip.save(os.path.join(OUT, fname))
            atlas[f"{name}_{clip}"] = {
                "file": fname,
                "frameW": W,
                "frameH": H,
                "frames": count,
                "fps": fps,
                "loop": loop,
            }

    with open(os.path.join(OUT, "friends.json"), "w", encoding="utf-8") as f:
        json.dump(atlas, f, indent=2, ensure_ascii=False)

    # önizleme: her türün walk klibi 6x
    scale = 6
    names = list(SPECIES)
    prev = Image.new("RGBA", (W * scale * 4, H * scale * len(names)), (32, 40, 56, 255))
    for row, name in enumerate(names):
        strip = Image.open(os.path.join(OUT, f"{name}_walk.png"))
        big = strip.resize((strip.width * scale, strip.height * scale), Image.NEAREST)
        prev.alpha_composite(big, (0, row * H * scale))
    prev.save(os.path.join(ROOT, "tools", "friends_preview.png"))

    print(f"{len(atlas)} arkadaş klibi üretildi -> {OUT}")


if __name__ == "__main__":
    main()
