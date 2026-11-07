#!/usr/bin/env python3
"""Render icons/iconN.png from the same geometry as icons/icon.svg.

Usage: python3 scripts/make-icons.py   (needs Pillow)
Small sizes use a bolder variant (icon-small.svg) so the mark survives 16px.
"""
from pathlib import Path
from PIL import Image, ImageDraw

INK, PAPER, ACCENT = (22, 19, 15, 255), (244, 241, 234, 255), (255, 74, 28, 255)
SS = 8  # supersampling factor
OUT = Path(__file__).resolve().parent.parent / "icons"

# All coordinates in the 128-unit SVG viewBox.
REGULAR = dict(tile=(4, 4, 124, 124), tile_r=28, dash=(29, 56, 99, 72), ring_r=41, stroke=11, slash=(35.5, 35.5, 92.5, 92.5))
BOLD = dict(tile=(0, 0, 128, 128), tile_r=26, dash=(24, 53, 104, 75), ring_r=45, stroke=16, slash=(32, 32, 96, 96))


def render(g, size):
    k = size * SS / 128
    s = lambda v: v * k
    img = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([s(v) for v in g["tile"]], radius=s(g["tile_r"]), fill=INK)
    x0, y0, x1, y1 = g["dash"]
    d.rounded_rectangle([s(x0), s(y0), s(x1), s(y1)], radius=s((y1 - y0) / 2), fill=PAPER)
    r, w = g["ring_r"], g["stroke"]
    outer = r + w / 2
    d.ellipse([s(64 - outer), s(64 - outer), s(64 + outer), s(64 + outer)], outline=ACCENT, width=round(s(w)))
    ax, ay, bx, by = g["slash"]
    d.line([s(ax), s(ay), s(bx), s(by)], fill=ACCENT, width=round(s(w)))
    for cx, cy in ((ax, ay), (bx, by)):  # round caps
        d.ellipse([s(cx - w / 2), s(cy - w / 2), s(cx + w / 2), s(cy + w / 2)], fill=ACCENT)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    for size in (16, 32, 48, 128):
        render(BOLD if size <= 32 else REGULAR, size).save(OUT / f"icon{size}.png", optimize=True)
    render(REGULAR, 512).save(OUT / "icon512.png", optimize=True)
    print("wrote", ", ".join(f"icon{n}.png" for n in (16, 32, 48, 128, 512)))
