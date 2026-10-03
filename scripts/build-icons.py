#!/usr/bin/env python3
"""
Generate Android launcher icons and the Android-12+ splash icon from the
ClassPay logo (amanah_fee_tracking_logo.png).

Outputs:
  www/img/logo.png                      (logo for in-app use)
  res/icons/android/{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}.png
  res/screens/android/splash.png        (Android 12+ splash icon, 1152x1152 safe zone)

Run: python scripts/build-icons.py
"""
import os
import shutil
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'amanah_fee_tracking_logo.png')

ICONS = {  # density → px
    'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192,
}
SPLASH_ICON = 432          # Android 12 splash icon default window (432dp @xxxhdpi canvas)
SPLASH_CANVAS = 1152       # generous canvas, logo centred with safe margins
BG = (238, 241, 249, 255)  # #EEF1F9 design-token background


def load_logo():
    im = Image.open(SRC).convert('RGBA')
    # 128px source is small; upscale smoothly so icons stay crisp-ish
    return im.resize((512, 512), Image.LANCZOS)


def write(path, im):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'PNG')
    print('wrote', os.path.relpath(path, ROOT), im.size)


def main():
    logo = load_logo()

    # in-app logo
    write(os.path.join(ROOT, 'www', 'img', 'logo.png'), logo)

    # launcher icons — full-bleed rounded square look via transparency padding
    for density, px in ICONS.items():
        canvas = Image.new('RGBA', (px, px), (0, 0, 0, 0))
        inset = max(2, px // 16)
        art = logo.resize((px - inset * 2, px - inset * 2), Image.LANCZOS)
        canvas.paste(art, (inset, inset), art)
        write(os.path.join(ROOT, 'res', 'icons', 'android', f'{density}.png'), canvas)

    # Android-12+ splash: logo centred on token background, inside safe circle
    canvas = Image.new('RGBA', (SPLASH_CANVAS, SPLASH_CANVAS), BG)
    art = logo.resize((SPLASH_ICON, SPLASH_ICON), Image.LANCZOS)
    canvas.paste(art, ((SPLASH_CANVAS - SPLASH_ICON) // 2, (SPLASH_CANVAS - SPLASH_ICON) // 2), art)
    write(os.path.join(ROOT, 'res', 'screens', 'android', 'splash.png'), canvas)

    # placeholders referenced by mock fixtures (QR + payment proof)
    img_dir = os.path.join(ROOT, 'www', 'img')

    qr = Image.new('RGBA', (512, 512), (255, 255, 255, 255))
    px_img = qr.load()
    cell = 16
    for y in range(0, 512, cell):
        for x in range(0, 512, cell):
            on = ((x // cell * 7 + y // cell * 13) % 3 != 0)
            if on:
                for dy in range(cell):
                    for dx in range(cell):
                        px_img[x + dx, y + dy] = (15, 27, 61, 255)
    # quiet-zone frame
    frame = Image.new('RGBA', (512, 512), (255, 255, 255, 255))
    frame.paste(qr, (48, 48))
    write(os.path.join(img_dir, 'qr-placeholder.png'), frame.crop((0, 0, 512, 512)).convert('RGB'))

    proof = Image.new('RGB', (640, 900), (245, 247, 252))
    bar = Image.new('RGB', (640, 90), (36, 71, 168))
    proof.paste(bar, (0, 0))
    px = proof.load()
    for row in range(180, 860, 70):
        for x in range(60, 580):
            px[x, row] = (219, 224, 236)
    write(os.path.join(img_dir, 'proof-placeholder.png'), proof)

    print('done.')


if __name__ == '__main__':
    main()
