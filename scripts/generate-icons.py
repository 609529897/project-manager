#!/usr/bin/env python3
"""按 macOS 规范生成应用图标与菜单栏图标。"""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "resources" / "icons"

APP_ICON_SIZE = 1024
MACOS_CORNER_RADIUS_RATIO = 0.2237
TRAY_ICON_1X = 16
TRAY_ICON_2X = 32


def macos_icon_radius(size: int) -> int:
    return max(1, round(size * MACOS_CORNER_RADIUS_RATIO))


def apply_macos_squircle_mask(image: Image.Image) -> Image.Image:
    size = image.size[0]
    radius = macos_icon_radius(size)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(image.convert("RGBA"), (0, 0), mask)
    return result


def generate_tray_icon(size: int, output: Path) -> None:
    """菜单栏图标：仅线条，透明底，无实心黑块。"""
    scale = size / TRAY_ICON_1X
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    black = (0, 0, 0, 255)
    stroke = max(1, round(1.2 * scale))

    lines = [(3, 4, 13, 4), (2, 8, 14, 8), (3, 12, 13, 12)]
    for x1, y1, x2, y2 in lines:
        draw.line(
            (round(x1 * scale), round(y1 * scale), round(x2 * scale), round(y2 * scale)),
            fill=black,
            width=stroke,
        )

    img.save(output, optimize=True)


def generate_app_icon_from_svg() -> None:
    svg = ICONS / "icon.svg"
    output = ICONS / "icon-1024.png"
    rendered = ICONS / "icon.svg.png"

    subprocess.run(
        ["qlmanage", "-t", "-s", str(APP_ICON_SIZE), "-o", str(ICONS), str(svg)],
        check=True,
        capture_output=True,
    )

    if not rendered.exists():
        raise FileNotFoundError(f"SVG render failed: {rendered}")

    with Image.open(rendered) as img:
        if img.size != (APP_ICON_SIZE, APP_ICON_SIZE):
            img = img.resize((APP_ICON_SIZE, APP_ICON_SIZE), Image.Resampling.LANCZOS)
        squircle = apply_macos_squircle_mask(img)
        squircle.save(output, optimize=True)

    rendered.unlink(missing_ok=True)
    squircle.save(ICONS / "icon-512.png", optimize=True)


def generate_icns() -> None:
    iconset = ROOT / "resources" / "icon.iconset"
    iconset.mkdir(exist_ok=True)
    src = ICONS / "icon-1024.png"

    for size in (16, 32, 128, 256, 512):
        subprocess.run(
            ["sips", "-z", str(size), str(size), str(src), "--out", str(iconset / f"icon_{size}x{size}.png")],
            check=True,
        )

    for size in (32, 64, 256, 512, 1024):
        base = size // 2
        subprocess.run(
            ["sips", "-z", str(size), str(size), str(src), "--out", str(iconset / f"icon_{base}x{base}@2x.png")],
            check=True,
        )

    subprocess.run(
        ["iconutil", "-c", "icns", str(iconset), "-o", str(ROOT / "resources" / "icon.icns")],
        check=True,
    )

    for file in iconset.glob("*.png"):
        file.unlink()
    iconset.rmdir()


def main() -> None:
    generate_app_icon_from_svg()
    generate_tray_icon(TRAY_ICON_1X, ICONS / "trayTemplate.png")
    generate_tray_icon(TRAY_ICON_2X, ICONS / "trayTemplate@2x.png")
    generate_icns()
    print("Icons regenerated.")


if __name__ == "__main__":
    main()
