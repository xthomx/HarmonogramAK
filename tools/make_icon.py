"""Generuje assets/icon.ico (ikona programu: harmonogram z paskami zadań).

Uruchomienie: python tools/make_icon.py
Bez zewnętrznych bibliotek — PNG i ICO składane ręcznie.
"""
import struct
import zlib
from pathlib import Path

SIZES = [16, 24, 32, 48, 64, 128, 256]
SS = 3  # supersampling (SS x SS próbek na piksel) dla gładkich krawędzi


def rrect(x, y, x0, y0, x1, y1, r):
    """Czy punkt (x, y) leży w prostokącie z zaokrąglonymi rogami."""
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


# Paski harmonogramu: (x0, y0, x1, y1, kolor)
BARS = [
    (0.17, 0.25, 0.60, 0.37, (255, 255, 255)),
    (0.33, 0.44, 0.83, 0.56, (255, 255, 255)),
    (0.22, 0.63, 0.55, 0.75, (255, 255, 255)),
    (0.59, 0.63, 0.78, 0.75, (244, 183, 64)),
]


def sample(x, y):
    """Kolor RGBA w punkcie jednostkowego kwadratu albo None."""
    if not rrect(x, y, 0.02, 0.02, 0.98, 0.98, 0.22):
        return None
    for x0, y0, x1, y1, col in BARS:
        if rrect(x, y, x0, y0, x1, y1, 0.06):
            return col
    t = (y - 0.02) / 0.96  # pionowy gradient tła
    return (int(66 - 26 * t), int(150 - 48 * t), int(124 - 38 * t))


def render(size):
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            r = g = b = a = 0
            for sy in range(SS):
                for sx in range(SS):
                    c = sample((px + (sx + .5) / SS) / size, (py + (sy + .5) / SS) / size)
                    if c:
                        r += c[0]; g += c[1]; b += c[2]; a += 1
            n = SS * SS
            if a:
                row += bytes((r // a, g // a, b // a, round(255 * a / n)))
            else:
                row += bytes(4)
        rows.append(bytes(row))
    return rows


def png(size):
    raw = b''.join(b'\x00' + r for r in render(size))

    def chunk(tag, data):
        body = tag + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body))

    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))


def main():
    images = [(s, png(s)) for s in SIZES]
    out = struct.pack('<HHH', 0, 1, len(images))
    offset = 6 + 16 * len(images)
    for s, data in images:
        out += struct.pack('<BBBBHHII', s % 256, s % 256, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
    out += b''.join(d for _, d in images)
    target = Path(__file__).resolve().parent.parent / 'assets' / 'icon.ico'
    target.parent.mkdir(exist_ok=True)
    target.write_bytes(out)
    (target.parent / 'icon.png').write_bytes(dict(images)[256])
    print('Zapisano', target, len(out), 'B')


if __name__ == '__main__':
    main()
