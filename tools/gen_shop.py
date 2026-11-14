#!/usr/bin/env python3
"""
Mağaza sprite'ları: aksesuarlar (fokun üstüne çizilir) ve süsler (masaya konur).

Aksesuarlar 48x48, fok karesiyle aynı hizada üretilir; böylece aynı (x, y, scale)
ile çizilince kafaya/gövdeye oturur. Süsler de 48x48, zemin çizgisi y=47.

Çıktı: assets/accessories/*.png + assets/decor/*.png + shop.json
Kullanım: python tools/gen_shop.py
"""
import json
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

W = H = 48
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")

OUTLINE = (26, 34, 48, 255)
WHITE = (255, 255, 255, 255)
GOLD = (255, 209, 102, 255)
GOLD_D = (214, 160, 56, 255)
RED = (232, 92, 84, 255)
RED_D = (186, 62, 60, 255)
PINK = (255, 116, 148, 255)
ICE = (143, 214, 242, 255)
ICE_D = (96, 168, 205, 255)
ICE_L = (223, 245, 255, 255)
GREEN = (94, 168, 106, 255)
GREEN_D = (62, 124, 78, 255)
WOOD = (168, 120, 78, 255)
WOOD_D = (120, 82, 52, 255)
DARK = (26, 34, 48, 255)
ORANGE = (255, 150, 96, 255)

# fok iskeletindeki referans noktaları (gen_sprites.py ile aynı)
HEAD_X, HEAD_Y = 31, 24
EYE_X, EYE_Y = 32, 20


def px(img, x, y, c):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((int(x), int(y)), c)


def rect(img, x, y, w, h, c):
    ImageDraw.Draw(img).rectangle([x, y, x + w - 1, y + h - 1], fill=c)


def poly(img, pts, c):
    ImageDraw.Draw(img).polygon([(int(x), int(y)) for x, y in pts], fill=c)


def ell(img, cx, cy, rx, ry, c):
    ImageDraw.Draw(img).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=c)


def outline_of(img, color=OUTLINE):
    """Saydam olmayan her pikselin çevresine 1px kontur ekler."""
    a = img.getchannel("A")
    dil = a.filter(ImageFilter.MaxFilter(3))
    ring = ImageChops.subtract(dil, a)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(color, mask=ring)
    out.alpha_composite(img)
    return out


# ---------------------------------------------------------------- 3x5 font
FONT = {
    "B": ["XX.", "X.X", "XX.", "X.X", "XX."],
    "U": ["X.X", "X.X", "X.X", "X.X", "XXX"],
    "Z": ["XXX", "..X", ".X.", "X..", "XXX"],
    "F": ["XXX", "X..", "XX.", "X..", "X.."],
    "O": [".X.", "X.X", "X.X", "X.X", ".X."],
    "K": ["X.X", "X.X", "XX.", "X.X", "X.X"],
    " ": ["...", "...", "...", "...", "..."],
}


def text(img, x, y, s, c):
    cx = x
    for ch in s:
        rows = FONT.get(ch)
        if rows:
            for j, row in enumerate(rows):
                for i, v in enumerate(row):
                    if v == "X":
                        px(img, cx + i, y + j, c)
        cx += 4


# ---------------------------------------------------------------- aksesuarlar
def acc_party_hat():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    poly(img, [(HEAD_X, 3), (HEAD_X - 6, 16), (HEAD_X + 6, 16)], PINK)
    poly(img, [(HEAD_X, 3), (HEAD_X - 3, 10), (HEAD_X + 3, 10)], GOLD)
    rect(img, HEAD_X - 7, 16, 14, 2, GOLD_D)
    px(img, HEAD_X, 2, GOLD)
    return outline_of(img)


def acc_crown():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    base_y = 13
    poly(
        img,
        [
            (HEAD_X - 8, base_y),
            (HEAD_X - 8, base_y - 6),
            (HEAD_X - 4, base_y - 2),
            (HEAD_X, base_y - 8),
            (HEAD_X + 4, base_y - 2),
            (HEAD_X + 8, base_y - 6),
            (HEAD_X + 8, base_y),
        ],
        GOLD,
    )
    rect(img, HEAD_X - 8, base_y, 17, 2, GOLD_D)
    px(img, HEAD_X, base_y - 5, PINK)
    px(img, HEAD_X - 6, base_y - 1, RED)
    px(img, HEAD_X + 6, base_y - 1, RED)
    return outline_of(img)


def acc_santa():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    poly(img, [(HEAD_X, 2), (HEAD_X - 8, 15), (HEAD_X + 8, 15)], RED)
    poly(img, [(HEAD_X, 2), (HEAD_X + 8, 15), (HEAD_X + 3, 15)], RED_D)
    rect(img, HEAD_X - 9, 14, 19, 3, WHITE)
    ell(img, HEAD_X + 2, 2, 2, 2, WHITE)
    return outline_of(img)


def acc_headphones():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # kafa üstünde bant (kafa elipsi rx=9, ry=8.6, merkez 31,24)
    for deg in range(15, 166, 2):
        a = math.radians(deg)
        x = HEAD_X + math.cos(a) * 9.6
        y = HEAD_Y - math.sin(a) * 9.6
        px(img, x, y, DARK)
        px(img, x, y + 1, DARK)
    # kulak tarafındaki tek kulaklık (yan görünüm)
    rect(img, HEAD_X - 8, HEAD_Y - 3, 5, 7, DARK)
    rect(img, HEAD_X - 7, HEAD_Y - 2, 3, 4, ICE)
    return outline_of(img)


def acc_sunglasses():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rect(img, EYE_X - 1, EYE_Y - 1, 7, 5, DARK)
    rect(img, EYE_X, EYE_Y, 5, 3, (58, 72, 96, 255))
    px(img, EYE_X + 1, EYE_Y, (150, 200, 230, 255))
    # sap: kafanın arkasına doğru kısa çizgi
    rect(img, EYE_X - 5, EYE_Y - 1, 4, 1, DARK)
    return outline_of(img)


def acc_eyepatch():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rect(img, EYE_X - 1, EYE_Y - 1, 6, 6, DARK)
    rect(img, EYE_X, EYE_Y, 4, 4, (44, 52, 68, 255))
    # bağ: kafanın arkasına doğru
    for i in range(5):
        px(img, EYE_X - 2 - i, EYE_Y - 1 + i // 3, DARK)
    return outline_of(img)


def acc_scarf():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # boyun: kafa altı ~32, gövde üstü ~26
    rect(img, HEAD_X - 6, 29, 16, 4, RED)
    rect(img, HEAD_X - 6, 32, 16, 1, RED_D)
    # sarkan uç
    poly(img, [(HEAD_X - 6, 33), (HEAD_X - 1, 33), (HEAD_X - 3, 40)], RED)
    rect(img, HEAD_X - 5, 36, 3, 1, WHITE)
    rect(img, HEAD_X - 5, 38, 3, 1, WHITE)
    return outline_of(img)


def acc_bowtie():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    poly(img, [(HEAD_X - 1, 29), (HEAD_X + 5, 32), (HEAD_X - 1, 35)], PINK)
    poly(img, [(HEAD_X + 9, 29), (HEAD_X + 3, 32), (HEAD_X + 9, 35)], PINK)
    rect(img, HEAD_X + 2, 31, 3, 3, (214, 80, 110, 255))
    return outline_of(img)


def acc_backpack():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rect(img, 8, 26, 11, 12, WOOD)
    rect(img, 8, 26, 11, 3, WOOD_D)
    rect(img, 10, 29, 7, 6, WOOD_D)
    rect(img, 11, 30, 5, 4, (196, 148, 100, 255))
    return outline_of(img)


ACCESSORIES = {
    "party_hat": acc_party_hat,
    "crown": acc_crown,
    "santa": acc_santa,
    "headphones": acc_headphones,
    "sunglasses": acc_sunglasses,
    "eyepatch": acc_eyepatch,
    "scarf": acc_scarf,
    "bowtie": acc_bowtie,
    "backpack": acc_backpack,
}


# ---------------------------------------------------------------- süsler
def dec_ice_block():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    poly(img, [(8, 47), (12, 33), (36, 33), (40, 47)], ICE)
    poly(img, [(12, 33), (36, 33), (34, 37), (14, 37)], ICE_L)
    rect(img, 8, 45, 33, 3, ICE_D)
    px(img, 18, 40, ICE_L)
    px(img, 27, 42, ICE_L)
    return outline_of(img)


def dec_seaweed():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for i, (bx, h, c) in enumerate([(18, 18, GREEN), (24, 26, GREEN_D), (30, 14, GREEN)]):
        for y in range(47 - h, 47):
            off = int(math.sin((y + i * 7) / 4.0) * 2)
            px(img, bx + off, y, c)
            px(img, bx + off + 1, y, c)
    return outline_of(img)


def dec_starfish():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cx, cy, r1, r2 = 24, 38, 10, 4.5
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        r = r1 if i % 2 == 0 else r2
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    poly(img, pts, ORANGE)
    for dx, dy in ((-3, -2), (3, -2), (0, 3)):
        px(img, cx + dx, cy + dy, (255, 200, 150, 255))
    return outline_of(img)


def dec_bunting():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # ip
    for x in range(2, 46):
        y = 8 + int(math.sin(x / 14.0) * 2)
        px(img, x, y, (90, 100, 120, 255))
    colors = [RED, GOLD, ICE, PINK, GREEN]
    for i, c in enumerate(colors):
        x = 6 + i * 8
        y = 8 + int(math.sin(x / 14.0) * 2)
        poly(img, [(x, y), (x + 6, y), (x + 3, y + 7)], c)
    return outline_of(img)


def dec_snow_pile():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ell(img, 24, 44, 15, 6, WHITE)
    ell(img, 17, 41, 8, 5, WHITE)
    ell(img, 30, 42, 7, 4, (235, 244, 252, 255))
    return outline_of(img)


def dec_shell():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ell(img, 24, 40, 10, 8, PINK)
    for i in range(-2, 3):
        for y in range(33, 46):
            px(img, 24 + i * 3 + int((y - 33) / 4), y, (214, 80, 110, 255))
    rect(img, 16, 45, 17, 2, (214, 80, 110, 255))
    return outline_of(img)


def dec_icicle():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for x, h in ((16, 14), (24, 22), (32, 12)):
        poly(img, [(x - 3, 47), (x, 47 - h), (x + 3, 47)], ICE_L)
        px(img, x, 47 - h + 2, ICE)
    return outline_of(img)


def dec_name_sign():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rect(img, 22, 30, 4, 17, WOOD_D)
    rect(img, 8, 18, 32, 14, WOOD)
    rect(img, 8, 18, 32, 2, (196, 148, 100, 255))
    text(img, 14, 22, "BUZ", (58, 44, 34, 255))
    return outline_of(img)


DECOR = {
    "ice_block": dec_ice_block,
    "seaweed": dec_seaweed,
    "starfish": dec_starfish,
    "bunting": dec_bunting,
    "snow_pile": dec_snow_pile,
    "shell": dec_shell,
    "icicle": dec_icicle,
    "name_sign": dec_name_sign,
}

# isim, fiyat, tür
SHOP = {
    "accessories": [
        {"id": "party_hat", "name": "Parti şapkası", "price": 15, "slot": "head"},
        {"id": "crown", "name": "Taç", "price": 60, "slot": "head"},
        {"id": "santa", "name": "Noel şapkası", "price": 40, "slot": "head"},
        {"id": "headphones", "name": "Kulaklık", "price": 35, "slot": "head"},
        {"id": "sunglasses", "name": "Güneş gözlüğü", "price": 25, "slot": "face"},
        {"id": "eyepatch", "name": "Göz bandı", "price": 20, "slot": "face"},
        {"id": "scarf", "name": "Atkı", "price": 18, "slot": "neck"},
        {"id": "bowtie", "name": "Papyon", "price": 22, "slot": "neck"},
        {"id": "backpack", "name": "Sırt çantası", "price": 45, "slot": "back"},
    ],
    "decor": [
        {"id": "ice_block", "name": "Buz kütlesi", "price": 20},
        {"id": "seaweed", "name": "Yosun", "price": 10},
        {"id": "starfish", "name": "Denizyıldızı", "price": 12},
        {"id": "bunting", "name": "Parti flaması", "price": 25},
        {"id": "snow_pile", "name": "Kar yığını", "price": 10},
        {"id": "shell", "name": "Deniz kabuğu", "price": 12},
        {"id": "icicle", "name": "Buz saçağı", "price": 14},
        {"id": "name_sign", "name": "İsim tabelası", "price": 30},
    ],
}


def main():
    acc_dir = os.path.join(ASSETS, "accessories")
    dec_dir = os.path.join(ASSETS, "decor")
    os.makedirs(acc_dir, exist_ok=True)
    os.makedirs(dec_dir, exist_ok=True)

    for name, fn in ACCESSORIES.items():
        fn().save(os.path.join(acc_dir, f"{name}.png"))
    for name, fn in DECOR.items():
        fn().save(os.path.join(dec_dir, f"{name}.png"))

    with open(os.path.join(ASSETS, "shop.json"), "w", encoding="utf-8") as f:
        json.dump(SHOP, f, indent=2, ensure_ascii=False)

    # önizleme: fok karesiyle üst üste bindirilmiş aksesuarlar
    seal = Image.open(os.path.join(ASSETS, "seal", "idle.png")).crop((0, 0, W, H))
    items = list(ACCESSORIES)
    cols = 5
    rows = (len(items) + cols - 1) // cols
    s = 4
    prev = Image.new("RGBA", (cols * W * s, rows * H * s), (32, 40, 56, 255))
    for i, name in enumerate(items):
        cell = seal.copy()
        cell.alpha_composite(Image.open(os.path.join(acc_dir, f"{name}.png")))
        big = cell.resize((W * s, H * s), Image.NEAREST)
        prev.alpha_composite(big, ((i % cols) * W * s, (i // cols) * H * s))
    prev.save(os.path.join(ROOT, "tools", "accessories_preview.png"))

    # süs önizlemesi
    items = list(DECOR)
    cols = 4
    rows = (len(items) + cols - 1) // cols
    prev = Image.new("RGBA", (cols * W * s, rows * H * s), (32, 40, 56, 255))
    for i, name in enumerate(items):
        img = Image.open(os.path.join(dec_dir, f"{name}.png"))
        big = img.resize((W * s, H * s), Image.NEAREST)
        prev.alpha_composite(big, ((i % cols) * W * s, (i // cols) * H * s))
    prev.save(os.path.join(ROOT, "tools", "decor_preview.png"))

    print(f"{len(ACCESSORIES)} aksesuar, {len(DECOR)} süs üretildi")


if __name__ == "__main__":
    main()
