"""
Одноразовый скрипт: убирает тёмный фон у "foto/нижнее меню/профиль 1.jpg"
и сохраняет в webapp/tab_profile.png с альфа-каналом.

Алгоритм (chroma key):
1. Берём средний цвет 4 углов картинки — это фон.
2. Для каждого пикселя считаем евклидово расстояние до фона.
3. distance < LOW   → alpha = 0  (полностью прозрачно)
   distance > HIGH  → alpha = 255 (полностью видно)
   между            → плавный переход.

JPG-артефакты на краях гасит мягкая полоса перехода.
"""
from pathlib import Path
from PIL import Image
import math

SRC = Path(r"E:/Готовые рабочии боты/игра/duel-arena-server/foto/нижнее меню/профиль 1.jpg")
DST = Path("webapp/tab_profile.png")

LOW  = 35.0   # ниже — полная прозрачность
HIGH = 75.0   # выше — полная непрозрачность

def avg_corner(img: Image.Image, size: int = 16):
    w, h = img.size
    boxes = [
        (0, 0, size, size),
        (w - size, 0, w, size),
        (0, h - size, size, h),
        (w - size, h - size, w, h),
    ]
    rs, gs, bs, n = 0, 0, 0, 0
    for box in boxes:
        for px in img.crop(box).getdata():
            rs += px[0]; gs += px[1]; bs += px[2]; n += 1
    return rs / n, gs / n, bs / n

def main():
    img = Image.open(SRC).convert("RGBA")
    bg_r, bg_g, bg_b = avg_corner(img)
    print(f"bg color: ({bg_r:.1f}, {bg_g:.1f}, {bg_b:.1f})")

    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = pixels[x, y]
            d = math.sqrt((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2)
            if d < LOW:
                a = 0
            elif d > HIGH:
                a = 255
            else:
                a = int((d - LOW) / (HIGH - LOW) * 255)
            pixels[x, y] = (r, g, b, a)

    DST.parent.mkdir(parents=True, exist_ok=True)
    img.save(DST, "PNG")
    print(f"saved: {DST}")

if __name__ == "__main__":
    main()
