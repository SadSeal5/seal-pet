#!/usr/bin/env python3
"""
Parametrik pixel-art fok sprite üreticisi.

48x48 tuval, 16 renkli kilitli palet, 1px outline, 3 ton cel-shading.
Her klip yatay şerit PNG olarak yazılır + atlas.json üretilir.

Kullanım:  python tools/gen_sprites.py
"""
import json
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

W = H = 48
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")

# ---------------------------------------------------------------- palet
PAL = {
    "outline": (26, 34, 48, 255),
    "dark": (126, 150, 175, 255),
    "mid": (178, 201, 221, 255),
    "light": (223, 237, 248, 255),
    "belly": (247, 252, 255, 255),
    "spot": (152, 176, 198, 255),
    "eye": (26, 34, 48, 255),
    "white": (255, 255, 255, 255),
    "blush": (246, 158, 184, 255),
    "mouth": (58, 48, 64, 255),
    "whisker": (138, 162, 186, 255),
    "water": (143, 214, 242, 255),
    "accent": (255, 138, 92, 255),
    "accent2": (255, 209, 102, 255),
    "zzz": (176, 210, 232, 255),
    "pink": (255, 116, 148, 255),
    "shadow": (0, 0, 0, 60),
}

BASE = dict(
    body_dx=0, body_dy=0, body_sx=1.0, body_sy=1.0,
    head_dx=0, head_dy=0, head_sx=1.0, head_sy=1.0,
    eye="open", eye_dx=0, eye_dy=0,
    mouth="smile", blush=False,
    flip=0.0,          # ön palet açısı (radyan)
    tail=0.0,          # kuyruk açısı
    scale_x=1.0,       # dönüş için yatay sıkıştırma
    fx=(),             # efekt listesi: (isim, t) t=0..1
    fish=0.0,          # 0..1 balık boyutu
)


# ---------------------------------------------------------------- yardımcılar
def poly_ellipse(cx, cy, rx, ry, angle=0.0, n=40):
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


def rect(img, x, y, w, h, color):
    d = ImageDraw.Draw(img)
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=color)


def pattern(img, x, y, rows, color, hi=None):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == "X":
                px(img, x + i, y + j, color)
            elif ch == "o" and hi:
                px(img, x + i, y + j, hi)


def paste_clipped(base, layer, mask):
    layer.putalpha(ImageChops.multiply(layer.getchannel("A"), mask))
    base.alpha_composite(layer)


# ---------------------------------------------------------------- gövde
def seal_masks(p):
    """Siluet + baş maskesi. Dönen: (mask, head, geom)"""
    bx = 20 + p["body_dx"]
    by = 34 + p["body_dy"]
    bw = 14.5 * p["body_sx"]
    bh = 8.5 * p["body_sy"]
    hx = 31 + p["head_dx"] + p["body_dx"]
    hy = 24 + p["head_dy"] + p["body_dy"]

    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)

    # kuyruk yüzgeci (arka sol)
    ta = p["tail"]
    d.polygon([
        (bx - bw + 6, by - 3),
        (bx - bw - 4, by - 7 - 2.5 * math.sin(ta)),
        (bx - bw - 2, by + 5),
    ], fill=255)

    # gövde
    ellipse(d, bx, by, bw, bh)

    # paletler
    ellipse(d, bx + 5.0, by + bh - 1.0, 5.5, 2.3, angle=p["flip"])
    ellipse(d, bx - bw + 5.0, by + bh - 1.4, 4.8, 2.0, angle=-0.30)

    # baş + burun
    head = Image.new("L", (W, H), 0)
    hd = ImageDraw.Draw(head)
    ellipse(hd, hx, hy, 9.0 * p["head_sx"], 8.6 * p["head_sy"])
    ellipse(hd, hx + 4.2, hy + 4.2, 4.2, 3.2)

    mask = ImageChops.lighter(mask, head)
    return mask, head, (hx, hy, bx, by, bw, bh)


def draw_seal(p):
    mask, head, (hx, hy, bx, by, bw, bh) = seal_masks(p)

    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # outline (dışa 1px)
    dil = mask.filter(ImageFilter.MaxFilter(3))
    out = ImageChops.subtract(dil, mask)
    img.paste(PAL["outline"], mask=out)

    # 3 ton gövde
    img.paste(PAL["mid"], mask=mask)
    img.paste(PAL["dark"], mask=ImageChops.subtract(mask, ImageChops.offset(mask, 0, -3)))
    img.paste(PAL["light"], mask=ImageChops.subtract(mask, ImageChops.offset(mask, 0, 3)))

    # karın
    belly = Image.new("L", (W, H), 0)
    ellipse(ImageDraw.Draw(belly), bx, by + 3.5, 8.5, 2.8)
    paste_clipped(img, Image.new("RGBA", (W, H), PAL["belly"]), ImageChops.multiply(belly, mask))

    # burun bölgesi (hafif açık)
    muzzle = Image.new("L", (W, H), 0)
    ellipse(ImageDraw.Draw(muzzle), hx + 4.5, hy + 4.2, 3.4, 2.6)
    paste_clipped(img, Image.new("RGBA", (W, H), PAL["light"]), ImageChops.multiply(muzzle, mask))

    # benekler
    spots = Image.new("L", (W, H), 0)
    sd = ImageDraw.Draw(spots)
    for sx, sy in ((bx - 7, by - 4), (bx - 2, by - 5), (bx + 4, by - 4), (bx + 8, by - 3)):
        sd.rectangle([sx, sy, sx + 1, sy + 1], fill=255)
    paste_clipped(img, Image.new("RGBA", (W, H), PAL["spot"]), ImageChops.multiply(spots, mask))

    # ---- yüz
    ex = int(hx + 1 + p["eye_dx"])
    ey = int(hy - 4 + p["eye_dy"])
    draw_eye(img, ex, ey, p["eye"])

    # burun
    nx, ny = int(hx + 7), int(hy + 1)
    rect(img, nx, ny, 2, 2, PAL["eye"])

    # ağız
    draw_mouth(img, int(hx + 5), int(hy + 4), p["mouth"])

    # bıyık
    wc = PAL["outline"]
    px(img, nx + 3, ny + 1, wc)
    px(img, nx + 4, ny + 2, wc)
    px(img, nx + 3, ny + 3, wc)
    px(img, nx + 4, ny + 4, wc)

    # allık
    if p["blush"]:
        rect(img, int(hx + 0), int(hy + 2), 3, 1, PAL["blush"])
        rect(img, int(hx + 1), int(hy + 3), 2, 1, PAL["blush"])

    # balık (ağızda)
    if p["fish"] > 0:
        draw_fish(img, int(hx + 11), int(hy + 5), p["fish"])

    # efektler
    for name, t in p["fx"]:
        draw_fx(img, name, t)

    # dönüş için yatay sıkıştırma
    if p["scale_x"] != 1.0:
        nw = max(2, int(round(W * p["scale_x"])))
        sq = img.resize((nw, H), Image.NEAREST)
        out_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        out_img.alpha_composite(sq, (max(0, (W - nw) // 2), 0))
        img = out_img

    return img


EYES = {
    "open": [".XX.", "XoXX", "XXXX", ".XX."],
    "half": ["....", "XXXX", "XXXX", "...."],
    "closed": ["....", "X..X", ".XX.", "...."],
    "happy": ["....", ".XX.", "X..X", "...."],
    "sad": ["....", "X..X", ".XX.", "...."],
    "wide": [".XXX.", "XoXXX", "XXXXX", "XXXXX", ".XXX."],
    "dizzy": ["X..X", ".XX.", ".XX.", "X..X"],
    "look": ["....", ".XXX", ".XXX", "...."],
}


def draw_eye(img, x, y, kind):
    rows = EYES.get(kind, EYES["open"])
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == "X":
                px(img, x + i, y + j, PAL["eye"])
            elif ch == "o":
                px(img, x + i, y + j, PAL["white"])
    if kind == "sad":
        # üzgün kaş
        px(img, x, y - 2, PAL["eye"])
        px(img, x + 1, y - 2, PAL["eye"])
        px(img, x + 2, y - 1, PAL["eye"])
    if kind == "annoyed":
        px(img, x, y - 2, PAL["eye"])
        px(img, x + 1, y - 2, PAL["eye"])
        px(img, x + 2, y - 2, PAL["eye"])


MOUTHS = {
    "smile": [(0, 0), (1, 1), (2, 0)],
    "flat": [(0, 0), (1, 0)],
    "open": [(0, 0), (1, 0), (2, 0), (0, 1), (1, 1), (2, 1)],
    "chew": [(0, 0), (1, 0), (0, 1), (1, 1)],
    "sad": [(0, 1), (1, 0), (2, 1)],
    "o": [(0, 0), (1, 0), (0, 1), (1, 1)],
}


def draw_mouth(img, x, y, kind):
    for dx, dy in MOUTHS.get(kind, MOUTHS["smile"]):
        px(img, x + dx, y + dy, PAL["mouth"])


# ---------------------------------------------------------------- efektler
HEART = [".X.X.", "XXXXX", "XXXXX", ".XXX.", "..X.."]
STAR = ["..X..", ".XXX.", "XXXXX", ".XXX.", "..X.."]


def draw_fish(img, x, y, size):
    c = PAL["accent"]
    if size > 0.5:
        rect(img, x - 3, y - 1, 5, 3, c)
        px(img, x - 5, y - 2, c)
        px(img, x - 5, y + 2, c)
        px(img, x - 4, y - 1, c)
        px(img, x - 4, y + 1, c)
        px(img, x - 2, y, PAL["white"])
    else:
        rect(img, x - 2, y, 3, 2, c)


def draw_fx(img, name, t):
    if name == "heart":
        x = 8 + int(6 * t)
        y = 6 - int(14 * t)
        pattern(img, x, y, HEART, PAL["pink"])
    elif name == "hearts":
        for k, (ox, oy) in enumerate(((2, 0), (14, 4), (8, 10))):
            tt = (t + k * 0.25) % 1.0
            pattern(img, 4 + ox, 16 - int(14 * tt) + oy // 2, HEART, PAL["pink"])
    elif name == "zzz":
        for k in range(3):
            tt = (t + k / 3.0) % 1.0
            x = 34 + int(6 * tt)
            y = 10 - int(9 * tt)
            s = 2 + k
            for i in range(s):
                px(img, x + i, y, PAL["zzz"])
                px(img, x + i, y + s - 1, PAL["zzz"])
            for i in range(s):
                px(img, x + s - 1 - i, y + i, PAL["zzz"])
    elif name == "sweat":
        x, y = 40, 12 + int(3 * t)
        px(img, x, y, PAL["water"])
        px(img, x, y + 1, PAL["water"])
        px(img, x - 1, y + 2, PAL["water"])
        px(img, x + 1, y + 2, PAL["water"])
        px(img, x, y + 2, PAL["water"])
    elif name == "star":
        pattern(img, 6 + int(10 * t), 8 - int(6 * t), STAR, PAL["accent2"])
    elif name == "stars":
        for k in range(4):
            a = t * 2 * math.pi + k * math.pi / 2
            pattern(img, int(24 + 13 * math.cos(a)) - 2, int(14 + 7 * math.sin(a)) - 2, STAR, PAL["accent2"])
    elif name == "bubble":
        for k in range(3):
            tt = (t + k / 3.0) % 1.0
            x = 40 + int(4 * math.sin(tt * 6)) + k
            y = 20 - int(16 * tt)
            r = 1 + k
            ImageDraw.Draw(img).ellipse([x - r, y - r, x + r, y + r], outline=PAL["water"])
    elif name == "ball":
        x, y = 40, 8 - int(2 * t)
        ImageDraw.Draw(img).ellipse([x - 4, y - 4, x + 4, y + 4], fill=PAL["accent"])
        px(img, x - 2, y - 2, PAL["white"])
        px(img, x - 1, y - 2, PAL["white"])
    elif name == "confetti":
        cols = (PAL["accent"], PAL["accent2"], PAL["pink"], PAL["water"])
        for k in range(6):
            x = 4 + k * 7
            y = 2 + int((t * 20 + k * 5) % 22)
            px(img, x, y, cols[k % 4])
    elif name == "note":
        x, y = 40, 10 - int(6 * t)
        px(img, x, y + 1, PAL["eye"])
        px(img, x + 1, y, PAL["eye"])
        px(img, x + 1, y + 1, PAL["eye"])
        px(img, x + 2, y - 3, PAL["eye"])
        px(img, x + 2, y - 2, PAL["eye"])


# ---------------------------------------------------------------- klipler
def P(**kw):
    d = dict(BASE)
    d.update(kw)
    return d


def clip_idle():
    return [
        P(),
        P(body_dy=-1, head_dy=-1, eye="open"),
        P(body_dy=-1, head_dy=0, eye="half"),
        P(body_dy=0, head_dy=0),
    ]


def clip_blink():
    return [P(), P(eye="half"), P(eye="closed"), P(eye="half")]


def clip_look_right():
    return [P(eye_dx=1, head_dx=1), P(eye_dx=1, head_dx=1, eye_dy=-1)]


def clip_look_left():
    return [P(eye_dx=-1, head_dx=-1), P(eye_dx=-1, head_dx=-1, eye_dy=-1)]


def clip_slide():
    out = []
    for i in range(6):
        s = math.sin(2 * math.pi * i / 6)
        out.append(P(
            body_dy=0 if s > 0 else 1,
            head_dy=-1 if s > 0 else 0,
            tail=0.5 * s,
            flip=0.35 * s,
            eye="open" if i % 3 else "half",
        ))
    return out


def clip_jump():
    return [
        P(body_sy=0.82, body_sx=1.12, body_dy=2, eye="half"),
        P(body_sy=1.12, body_sx=0.92, body_dy=-3, eye="wide"),
        P(body_sy=1.05, body_sx=0.96, body_dy=-6, eye="happy", flip=-0.5),
        P(body_dy=-4, eye="open", flip=-0.3),
    ]


def clip_fall():
    return [
        P(body_sy=1.1, body_sx=0.94, eye="wide", mouth="o", flip=-0.7),
        P(body_sy=1.12, body_sx=0.92, eye="wide", mouth="o", flip=-0.9),
        P(body_sy=1.08, body_sx=0.95, eye="wide", mouth="o", flip=-0.6),
    ]


def clip_land():
    return [
        P(body_sy=0.78, body_sx=1.18, body_dy=3, eye="closed", flip=0.2),
        P(body_sy=0.9, body_sx=1.08, body_dy=1, eye="half"),
        P(),
    ]


def clip_sleep():
    return [
        P(body_dy=1, eye="closed", mouth="flat", fx=[("zzz", 0.0)]),
        P(body_dy=2, eye="closed", mouth="flat", fx=[("zzz", 0.33)]),
        P(body_dy=1, eye="closed", mouth="flat", fx=[("zzz", 0.66)]),
        P(body_dy=2, eye="closed", mouth="flat", fx=[("zzz", 0.99)]),
    ]


def clip_wake():
    return [
        P(eye="closed", body_dy=1),
        P(eye="half", body_dy=0),
        P(eye="open", body_sy=1.05, body_dy=-1),
    ]


def clip_yawn():
    return [
        P(eye="half", mouth="flat"),
        P(eye="closed", mouth="open", head_dy=-1),
        P(eye="closed", mouth="open", head_dy=-2, body_sy=1.04),
        P(eye="half", mouth="o", head_dy=-1),
        P(eye="open", mouth="smile"),
    ]


def clip_happy():
    return [
        P(body_sy=0.85, body_dx=0, eye="happy", mouth="open"),
        P(body_sy=1.1, body_dy=-4, eye="happy", mouth="open", flip=-0.4),
        P(body_dy=-6, eye="happy", mouth="open", flip=-0.6, fx=[("heart", 0.2)]),
        P(body_dy=-3, eye="happy", mouth="open", flip=-0.3, fx=[("heart", 0.5)]),
        P(body_sy=0.85, body_dy=2, eye="happy", mouth="smile", fx=[("heart", 0.8)]),
        P(eye="happy", mouth="smile", blush=True),
    ]


def clip_hearts():
    return [
        P(eye="happy", mouth="smile", blush=True, fx=[("hearts", i / 5)] if i % 2 == 0 else [("hearts", (i + 1) / 5)])
        for i in range(5)
    ]


def clip_sad():
    return [
        P(body_dy=1, eye="sad", mouth="sad", head_dy=1),
        P(body_dy=2, eye="sad", mouth="sad", head_dy=2),
        P(body_dy=1, eye="sad", mouth="sad", head_dy=1),
    ]


def clip_annoyed():
    return [
        P(eye="half", mouth="flat", fx=[("sweat", 0.0)]),
        P(eye="half", mouth="flat", fx=[("sweat", 0.5)]),
        P(eye="half", mouth="flat", fx=[("sweat", 0.9)]),
    ]


def clip_eat():
    return [
        P(eye="open", mouth="open", fish=1.0),
        P(eye="happy", mouth="chew", fish=0.6),
        P(eye="happy", mouth="open", fish=0.0),
        P(eye="happy", mouth="chew", fish=0.0),
        P(eye="happy", mouth="open", fish=0.0),
        P(eye="happy", mouth="smile", fish=0.0, blush=True),
    ]


def clip_dangle():
    return [
        P(body_sy=1.18, body_dy=3, head_dy=-3, eye="wide", mouth="o", flip=-1.3, tail=0.8),
        P(body_sy=1.15, body_dy=3, head_dy=-3, eye="wide", mouth="o", flip=-1.05, tail=0.4),
    ]


def clip_dizzy():
    return [
        P(eye="dizzy", mouth="o", fx=[("stars", i / 4)]) for i in range(4)
    ]


def clip_spin():
    return [
        P(scale_x=1.0),
        P(scale_x=0.72, eye="happy"),
        P(scale_x=0.4, eye="happy"),
        P(scale_x=0.18, eye="happy"),
        P(scale_x=0.4, eye="happy"),
        P(scale_x=0.72, eye="happy"),
    ]


def clip_clap():
    return [
        P(flip=0.0, eye="happy", mouth="open"),
        P(flip=-0.7, eye="happy", mouth="open"),
        P(flip=-1.0, eye="happy", mouth="open"),
        P(flip=-0.7, eye="happy", mouth="open"),
    ]


def clip_balance_ball():
    return [
        P(eye="open", mouth="smile", fx=[("ball", 0.0)]),
        P(eye="open", mouth="smile", fx=[("ball", 0.3)]),
        P(eye="open", mouth="smile", fx=[("ball", 0.6)]),
        P(eye="open", mouth="smile", fx=[("ball", 0.9)]),
    ]


def clip_bubble():
    return [P(eye="open", mouth="o", fx=[("bubble", i / 6)]) for i in range(6)]


def clip_celebrate():
    return [
        P(body_sy=0.85, eye="happy", mouth="open"),
        P(body_dy=-4, eye="happy", mouth="open", flip=-0.5, fx=[("confetti", 0.1)]),
        P(body_dy=-6, eye="happy", mouth="open", flip=-0.8, fx=[("confetti", 0.3)]),
        P(body_dy=-4, eye="happy", mouth="open", flip=-0.5, fx=[("confetti", 0.5)]),
        P(body_sy=0.85, body_dy=2, eye="happy", mouth="open", fx=[("confetti", 0.7)]),
        P(eye="happy", mouth="open", blush=True, fx=[("confetti", 0.9)]),
        P(eye="happy", mouth="smile", blush=True, fx=[("star", 0.3)]),
        P(eye="happy", mouth="smile", blush=True, fx=[("star", 0.7)]),
    ]


CLIPS = {
    "idle": (clip_idle, 4, True),
    "blink": (clip_blink, 12, False),
    "look_right": (clip_look_right, 6, False),
    "look_left": (clip_look_left, 6, False),
    "slide": (clip_slide, 10, True),
    "jump": (clip_jump, 12, False),
    "fall": (clip_fall, 8, True),
    "land": (clip_land, 14, False),
    "sleep": (clip_sleep, 3, True),
    "wake": (clip_wake, 8, False),
    "yawn": (clip_yawn, 8, False),
    "happy": (clip_happy, 12, False),
    "hearts": (clip_hearts, 10, False),
    "sad": (clip_sad, 4, True),
    "annoyed": (clip_annoyed, 8, False),
    "eat": (clip_eat, 10, False),
    "dangle": (clip_dangle, 6, True),
    "dizzy": (clip_dizzy, 8, False),
    "spin": (clip_spin, 14, False),
    "clap": (clip_clap, 12, False),
    "balance_ball": (clip_balance_ball, 8, True),
    "bubble": (clip_bubble, 10, False),
    "celebrate": (clip_celebrate, 12, False),
}


# ---------------------------------------------------------------- props
def gen_props():
    out = os.path.join(ASSETS, "props")
    os.makedirs(out, exist_ok=True)

    # plaj topu
    b = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(b)
    d.ellipse([1, 1, 14, 14], fill=PAL["accent"], outline=PAL["outline"])
    d.pieslice([1, 1, 14, 14], 200, 340, fill=PAL["white"])
    d.pieslice([1, 1, 14, 14], 20, 160, fill=PAL["accent2"])
    d.ellipse([1, 1, 14, 14], outline=PAL["outline"])
    b.save(os.path.join(out, "ball.png"))

    # balık
    f = Image.new("RGBA", (16, 12), (0, 0, 0, 0))
    d = ImageDraw.Draw(f)
    d.ellipse([2, 3, 11, 9], fill=PAL["accent"], outline=PAL["outline"])
    d.polygon([(2, 6), (0, 2), (0, 9)], fill=PAL["accent"], outline=PAL["outline"])
    px(f, 8, 5, PAL["eye"])
    px(f, 9, 5, PAL["white"])
    f.save(os.path.join(out, "fish.png"))

    # çember
    h = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(h)
    d.ellipse([2, 2, 21, 21], outline=PAL["outline"], width=4)
    d.ellipse([2, 2, 21, 21], outline=PAL["accent2"], width=2)
    h.save(os.path.join(out, "hoop.png"))

    # köpük
    bb = Image.new("RGBA", (10, 10), (0, 0, 0, 0))
    d = ImageDraw.Draw(bb)
    d.ellipse([1, 1, 8, 8], outline=PAL["water"], width=1)
    px(bb, 3, 3, PAL["white"])
    bb.save(os.path.join(out, "bubble.png"))

    # kalp
    hp = Image.new("RGBA", (9, 9), (0, 0, 0, 0))
    pattern(hp, 2, 2, HEART, PAL["pink"])
    hp.save(os.path.join(out, "heart.png"))

    # yıldız
    st = Image.new("RGBA", (9, 9), (0, 0, 0, 0))
    pattern(st, 2, 2, STAR, PAL["accent2"])
    st.save(os.path.join(out, "star.png"))


# ---------------------------------------------------------------- main
def main():
    seal_dir = os.path.join(ASSETS, "seal")
    os.makedirs(seal_dir, exist_ok=True)

    atlas = {}
    sheet_rows = []

    for name, (fn, fps, loop) in CLIPS.items():
        frames = fn()
        strip = Image.new("RGBA", (W * len(frames), H), (0, 0, 0, 0))
        for i, p in enumerate(frames):
            strip.alpha_composite(draw_seal(p), (i * W, 0))
        strip.save(os.path.join(seal_dir, f"{name}.png"))
        atlas[name] = {
            "file": f"{name}.png",
            "frameW": W,
            "frameH": H,
            "frames": len(frames),
            "fps": fps,
            "loop": loop,
        }
        sheet_rows.append((name, strip))

    with open(os.path.join(seal_dir, "atlas.json"), "w", encoding="utf-8") as f:
        json.dump(atlas, f, indent=2, ensure_ascii=False)

    gen_props()

    # ---- önizleme sayfası
    scale = 3
    pad = 6
    row_h = H * scale + 14
    pw = max(r[1].width for r in sheet_rows) * scale + pad * 2
    ph = row_h * len(sheet_rows) + pad
    prev = Image.new("RGBA", (pw, ph), (32, 40, 56, 255))
    d = ImageDraw.Draw(prev)
    for i, (name, strip) in enumerate(sheet_rows):
        y = pad + i * row_h
        d.text((pad, y), name, fill=(200, 220, 240, 255))
        big = strip.resize((strip.width * scale, strip.height * scale), Image.NEAREST)
        prev.alpha_composite(big, (pad, y + 12))
    prev.save(os.path.join(ROOT, "tools", "preview.png"))

    # yakın inceleme: gövde 8x + kafa 16x
    zoom_names = ["idle", "happy", "sleep", "eat"]
    z = Image.new("RGBA", (W * 8 * len(zoom_names), H * 8), (32, 40, 56, 255))
    for i, nm in enumerate(zoom_names):
        fr = draw_seal(CLIPS[nm][0]()[0])
        z.alpha_composite(fr.resize((W * 8, H * 8), Image.NEAREST), (i * W * 8, 0))
    z.save(os.path.join(ROOT, "tools", "zoom.png"))

    crop = (22, 8, 48, 40)
    cw, chh = crop[2] - crop[0], crop[3] - crop[1]
    hz = Image.new("RGBA", (cw * 16 * 4, chh * 16), (32, 40, 56, 255))
    for i, nm in enumerate(zoom_names):
        fr = draw_seal(CLIPS[nm][0]()[0]).crop(crop)
        hz.alpha_composite(fr.resize((cw * 16, chh * 16), Image.NEAREST), (i * cw * 16, 0))
    hz.save(os.path.join(ROOT, "tools", "head.png"))

    # uygulama + tray ikonu
    frame = draw_seal(CLIPS["idle"][0]()[0])
    crop = frame.crop(frame.getbbox())
    icon = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    sc = min(232 / crop.width, 232 / crop.height)
    nw, nh = int(crop.width * sc), int(crop.height * sc)
    icon.alpha_composite(crop.resize((nw, nh), Image.NEAREST), ((256 - nw) // 2, (256 - nh) // 2))
    icon.save(os.path.join(ASSETS, "icon.png"))

    tray = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    sc = min(30 / crop.width, 30 / crop.height)
    nw, nh = int(crop.width * sc), int(crop.height * sc)
    tray.alpha_composite(crop.resize((nw, nh), Image.LANCZOS), ((32 - nw) // 2, (32 - nh) // 2))
    tray.save(os.path.join(ASSETS, "tray.png"))

    print(f"{len(CLIPS)} klip üretildi -> {seal_dir}")


if __name__ == "__main__":
    main()
