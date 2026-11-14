#!/usr/bin/env python3
"""
Uygulama / installer / tray ikonları.

Fok karesi 48x48 pixel art; her ikon boyutu NEAREST ile ölçeklenir, böylece
16x16'da bile kenarlar keskin kalır (Pillow'un ICO küçültmesi yumuşatıyordu).

Çıktı: assets/icon.png (256), assets/icon.ico (16..256), assets/tray.png (32)
Kullanım: python tools/gen_icon.py
"""
import os
import struct

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
SIZES = [16, 24, 32, 48, 64, 128, 256]


def render(crop, size, pad_ratio=0.05):
    """Kırpılmış fok karesini size×size tuvale keskin biçimde ortalar."""
    inner = max(1, int(round(size * (1 - 2 * pad_ratio))))
    sc = min(inner / crop.width, inner / crop.height)
    nw = max(1, int(round(crop.width * sc)))
    nh = max(1, int(round(crop.height * sc)))

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.alpha_composite(crop.resize((nw, nh), Image.NEAREST), ((size - nw) // 2, (size - nh) // 2))
    return img


def write_ico(images, path):
    """PNG sıkıştırmalı ICO yazar (Vista+ destekler, Windows 10/11 sorunsuz)."""
    blobs = []
    for img in images:
        tmp = os.path.join(os.path.dirname(path), f".ico_{img.width}.png")
        img.save(tmp, format="PNG")
        with open(tmp, "rb") as f:
            blobs.append(f.read())
        os.remove(tmp)

    count = len(images)
    header = struct.pack("<HHH", 0, 1, count)
    offset = 6 + 16 * count
    entries = b""
    for img, blob in zip(images, blobs):
        w = 0 if img.width >= 256 else img.width
        h = 0 if img.height >= 256 else img.height
        entries += struct.pack("<BBBBHHII", w, h, 0, 0, 1, 32, len(blob), offset)
        offset += len(blob)

    with open(path, "wb") as f:
        f.write(header + entries)
        for blob in blobs:
            f.write(blob)


def build_icons(frame, assets_dir=ASSETS):
    """frame: 48x48 (veya daha büyük) fok karesi."""
    crop = frame.crop(frame.getbbox())
    if not crop.width or not crop.height:
        raise ValueError("boş fok karesi")

    render(crop, 256).save(os.path.join(assets_dir, "icon.png"))
    write_ico([render(crop, s) for s in SIZES], os.path.join(assets_dir, "icon.ico"))
    render(crop, 32, pad_ratio=0.03).save(os.path.join(assets_dir, "tray.png"))


def main():
    idle = Image.open(os.path.join(ASSETS, "seal", "idle.png")).convert("RGBA")
    frame = idle.crop((0, 0, 48, 48))
    build_icons(frame)
    print("ikonlar yazıldı: icon.png, icon.ico, tray.png")


if __name__ == "__main__":
    main()
