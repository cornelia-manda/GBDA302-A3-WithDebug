"""
Draws the street tileset (level 3) for Hear No Evil.

Every tile is 32x32 RGBA, same as the mansion and courtyard sets, and the ones
that repeat across the ground (asphalt, verge, treeline) wrap seamlessly so a
field of them has no visible grid.

    python tools/make_street_tiles.py

The level is set at night, so the whole palette is darkened and pushed toward
blue against the daytime reference we worked from — the road reads as lit only
by the moon until a streetlamp is near.

ONE TILE HERE IS A PLACEHOLDER. streetlamp.png is a stand-in so the safe-zone
mechanic can be built and tested; the group is drawing the real one. Everything
else is final.

Written by us; no external art was traced or imported.
"""

import math
import os
import random

from PIL import Image

N = 32
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "images")

# --- palette ---------------------------------------------------------
# Night: low value, low saturation, everything biased a few points toward blue.
ASPHALT = [(78, 80, 88), (66, 68, 76), (56, 58, 66), (46, 48, 56), (38, 40, 47)]
PAINT = [(196, 198, 190), (162, 164, 158), (128, 130, 126)]
CONCRETE = [(120, 122, 126), (98, 100, 105), (78, 80, 86), (60, 62, 68)]
GRASS = [(58, 92, 54), (46, 76, 44), (36, 62, 36), (28, 50, 30), (20, 38, 24)]
GRASS_DRY = [(74, 82, 48), (58, 66, 40), (44, 50, 32)]
LEAF = [(44, 78, 46), (34, 62, 38), (26, 48, 30), (18, 36, 24), (12, 26, 18)]
DIRT = [(84, 68, 50), (68, 54, 40), (52, 42, 32), (38, 31, 24)]
IRON = [(96, 100, 108), (70, 74, 82), (48, 51, 58), (32, 34, 40)]
LAMP_WARM = (255, 214, 138)
OUTLINE = (12, 12, 16)


# --- helpers (same as the courtyard set) -----------------------------
def new(alpha=0):
    return Image.new("RGBA", (N, N), (0, 0, 0, alpha))


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def value_noise(seed, freq):
    """Smooth 0..1 field that wraps at the tile edge."""
    rnd = random.Random(seed)
    g = [[rnd.random() for _ in range(freq)] for _ in range(freq)]
    out = [[0.0] * N for _ in range(N)]
    for y in range(N):
        fy = y * freq / N
        y0, y1 = int(fy) % freq, (int(fy) + 1) % freq
        ty = fy - int(fy)
        ty = ty * ty * (3 - 2 * ty)
        for x in range(N):
            fx = x * freq / N
            x0, x1 = int(fx) % freq, (int(fx) + 1) % freq
            tx = fx - int(fx)
            tx = tx * tx * (3 - 2 * tx)
            a = g[y0][x0] * (1 - tx) + g[y0][x1] * tx
            b = g[y1][x0] * (1 - tx) + g[y1][x1] * tx
            out[y][x] = a * (1 - ty) + b * ty
    return out


def outline_alpha(img, colour=OUTLINE):
    """1px dark border around opaque pixels — matches the other tilesets."""
    px = img.load()
    edge = []
    for y in range(N):
        for x in range(N):
            if px[x, y][3] > 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < N and 0 <= ny < N and px[nx, ny][3] > 200:
                    edge.append((x, y))
                    break
    for x, y in edge:
        px[x, y] = colour + (255,)
    return img


# --- shape helpers ---------------------------------------------------
# The first two levels are built from readable shapes — bricks with mortar
# lines, cobbles with outlines — in a handful of flat colours. An earlier draft
# of this set used per-pixel noise instead, which reads as photographic grain
# rather than pixel art and did not sit next to them. Everything below is drawn
# as flat regions at a 3-6px scale, with speckle used only as an accent.


def patches(seed, freq, levels):
    """Wrapping field flattened to `levels` bands — large flat regions of
    slightly different tone, rather than a continuous gradient."""
    f = value_noise(seed, freq)
    return [[min(levels - 1, int(f[y][x] * levels)) for x in range(N)] for y in range(N)]


def blob(px, cx, cy, r, colour, rnd=None, ragged=0.0):
    """Filled disc, wrapping at the tile edge."""
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            d = math.hypot(x - cx, y - cy)
            edge = r + (rnd.uniform(-ragged, ragged) if rnd and ragged else 0)
            if d <= edge:
                px[x % N, y % N] = colour + (255,)


# --- road ------------------------------------------------------------
def asphalt(seed=7):
    """Tarmac: a flat base broken into a few large worn patches, with sparse
    chips of aggregate. No per-pixel grain."""
    img = new(255)
    px = img.load()
    band = patches(seed, 3, 3)
    rnd = random.Random(seed + 2)
    for y in range(N):
        for x in range(N):
            px[x, y] = ASPHALT[1 + band[y][x]] + (255,)
    # aggregate: a handful of 2x2 chips, light and dark
    for _ in range(14):
        cx, cy = rnd.randrange(N), rnd.randrange(N)
        c = ASPHALT[0] if rnd.random() < 0.6 else ASPHALT[4]
        for dy in range(2):
            for dx in range(2):
                px[(cx + dx) % N, (cy + dy) % N] = c + (255,)
    # a couple of longer cracks, drawn as short runs rather than noise
    for _ in range(2):
        x, y = rnd.randrange(N), rnd.randrange(N)
        for _ in range(rnd.randint(6, 11)):
            px[x % N, y % N] = ASPHALT[4] + (255,)
            x += rnd.choice((0, 1, 1))
            y += rnd.choice((-1, 0, 1))
    return img


def road_dash():
    """Asphalt carrying one segment of the centre line.

    The road runs left to right, so the dash is a horizontal bar. The bar sits
    on the tile's centre line, so a dash tile placed on the road's middle row
    puts the paint exactly down the middle of the carriageway.
    """
    img = asphalt(11)
    px = img.load()
    rnd = random.Random(31)
    for y in range(14, 18):
        for x in range(N):
            c = PAINT[0] if 15 <= y <= 16 else PAINT[1]
            px[x, y] = c + (255,)
    # worn: a few flat bites taken out of the paint, not a noise mask
    for _ in range(7):
        cx, cy = rnd.randrange(N), rnd.choice((14, 17))
        for dx in range(rnd.randint(1, 3)):
            px[(cx + dx) % N, cy] = ASPHALT[1] + (255,)
    return img


def road_edge():
    """Asphalt with the solid white edge line along its top.

    Drawn once and rotated 180 degrees by the renderer for the far side of the
    road, the same trick the wall set uses, so one tile serves both.
    """
    img = asphalt(13)
    px = img.load()
    rnd = random.Random(37)
    for y in range(2, 5):
        for x in range(N):
            px[x, y] = (PAINT[0] if y == 3 else PAINT[1]) + (255,)
    for _ in range(6):
        cx = rnd.randrange(N)
        px[cx, rnd.choice((2, 4))] = ASPHALT[1] + (255,)
    return img


def kerb():
    """Concrete strip between road and verge, laid as slabs. Symmetric top to
    bottom so the same tile serves either side of the carriageway."""
    img = new(255)
    px = img.load()
    rnd = random.Random(41)
    for y in range(N):
        # three flat bands: darker where it meets road and grass, light between
        d = abs(y - (N - 1) / 2) / ((N - 1) / 2)
        c = CONCRETE[0] if d < 0.35 else (CONCRETE[1] if d < 0.75 else CONCRETE[2])
        for x in range(N):
            px[x, y] = c + (255,)
    # slab joints every 16px, wrapping, plus the long edges
    for x in (0, 16):
        for y in range(N):
            px[x, y] = CONCRETE[3] + (255,)
    for y in (0, N - 1):
        for x in range(N):
            px[x, y] = CONCRETE[3] + (255,)
    # a few chipped corners
    for _ in range(6):
        cx, cy = rnd.randrange(N), rnd.randrange(N)
        px[cx, cy] = CONCRETE[2] + (255,)
        px[(cx + 1) % N, cy] = CONCRETE[2] + (255,)
    return img


# --- verge -----------------------------------------------------------
def verge(seed=3, dry=0.0, tuft=0):
    """Night grass: two flat tones in large patches, with readable tufts sitting
    on top. Built the way the courtyard's moss is, so the two sit together."""
    img = new(255)
    px = img.load()
    # Higher frequency than the road: large aligned bands make the repeat
    # obvious once a field of these is laid down.
    band = patches(seed, 5, 2)
    rnd = random.Random(seed + 9)
    for y in range(N):
        for x in range(N):
            px[x, y] = GRASS[2 + band[y][x]] + (255,)

    # dry ground shows as whole patches, not speckle
    if dry:
        for _ in range(int(3 + dry * 6)):
            blob(px, rnd.randrange(N), rnd.randrange(N), rnd.uniform(3, 5.5),
                 GRASS_DRY[1], rnd, ragged=0.8)

    # tufts: a 4-5px clump of blades, dark base and lit tip, so it reads as a
    # shape at 40px on screen rather than as scattered pixels
    for _ in range(9 + tuft * 5):
        bx, by = rnd.randrange(N), rnd.randrange(N)
        w = rnd.randint(3, 5)
        for i in range(w):
            h = rnd.choice((3, 4, 4, 5))
            x = (bx + i) % N
            for j in range(h):
                y = (by - j) % N
                px[x, y] = (GRASS[1] if j < h - 1 else GRASS[3]) + (255,)
            px[x, (by - h) % N] = GRASS[0] + (255,)
    return img


def bush():
    """Low shrub on the verge. Solid — it blocks the player and the vampire.
    Built from a few overlapping clumps with a dark outline, matching the
    courtyard hedge."""
    img = new(0)
    px = img.load()
    rnd = random.Random(77)
    for cx, cy, r, tone in ((11, 13, 8, 2), (21, 15, 7, 2), (16, 22, 7, 3),
                            (24, 23, 5, 3), (8, 22, 5, 3)):
        blob(px, cx, cy, r, LEAF[tone], rnd, ragged=1.0)
    # lit crowns, offset up-left as if catching the moon
    for cx, cy, r in ((10, 11, 4), (20, 13, 3.5), (15, 20, 3.5)):
        blob(px, cx, cy, r, LEAF[1], rnd, ragged=0.7)
    for cx, cy, r in ((9, 10, 2), (19, 12, 1.8)):
        blob(px, cx, cy, r, LEAF[0], rnd, ragged=0.4)
    return outline_alpha(img)


def tree():
    """Dense canopy for the treeline that walls the level in. Fills the tile, so
    a run of them reads as unbroken woodland, but keeps visible clump structure
    rather than dissolving into noise."""
    img = new(255)
    px = img.load()
    rnd = random.Random(83)
    for y in range(N):
        for x in range(N):
            px[x, y] = LEAF[4] + (255,)
    # Canopy clumps at three depths, wrapping. More and smaller than the first
    # pass: a few big blobs made the tile repeat read as a pattern.
    for tone, count, rad in ((3, 14, (3, 5)), (2, 12, (2, 3.5)), (1, 8, (1.4, 2.4))):
        for _ in range(count):
            blob(px, rnd.randrange(N), rnd.randrange(N),
                 rnd.uniform(*rad), LEAF[tone], rnd, ragged=1.1)
    return img


def dirt():
    """Worn patch where the grass has given up — bare ground by the roadside."""
    img = new(255)
    px = img.load()
    band = patches(91, 3, 2)
    rnd = random.Random(101)
    for y in range(N):
        for x in range(N):
            px[x, y] = DIRT[1 + band[y][x]] + (255,)
    # stones, as 2x2 blocks
    for _ in range(9):
        cx, cy = rnd.randrange(N), rnd.randrange(N)
        c = DIRT[0] if rnd.random() < 0.6 else DIRT[3]
        for dy in range(2):
            for dx in range(2):
                px[(cx + dx) % N, (cy + dy) % N] = c + (255,)
    # grass creeping back in, as clumps
    for _ in range(3):
        blob(px, rnd.randrange(N), rnd.randrange(N), rnd.uniform(2, 3.5),
             GRASS[3], rnd, ragged=0.7)
    return img


# --- PLACEHOLDER -----------------------------------------------------
# 5x7 pixel letters, only the four this placeholder needs.
FONT = {
    "L": ("X....", "X....", "X....", "X....", "X....", "X....", "XXXXX"),
    "A": (".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"),
    "M": ("X...X", "XX.XX", "X.X.X", "X.X.X", "X...X", "X...X", "X...X"),
    "P": ("XXXX.", "X...X", "X...X", "XXXX.", "X....", "X....", "X...."),
}


def streetlamp():
    """PLACEHOLDER, and deliberately not a drawing of a lamp.

    It says LAMP so nobody mistakes it for finished art or ships it by accident.
    The group is drawing the real streetlamp. The pool of light on the ground is
    drawn by the game rather than baked into this tile, so dropping the real art
    in at the same filename and size changes nothing but the post itself.
    """
    img = new(255)
    px = img.load()

    BG = (44, 40, 52)
    EDGE = (232, 196, 92)
    TEXT = (240, 236, 224)

    for y in range(N):
        for x in range(N):
            px[x, y] = BG + (255,)
    # hatched border, so it reads as "missing asset" at a glance
    for i in range(N):
        for e in (0, 1, N - 2, N - 1):
            px[i, e] = EDGE + (255,)
            px[e, i] = EDGE + (255,)
    for i in range(0, N, 4):
        px[i, 2] = EDGE + (255,)
        px[i, N - 3] = EDGE + (255,)

    word = "LAMP"
    total = len(word) * 5 + (len(word) - 1)
    x0 = (N - total) // 2
    y0 = (N - 7) // 2
    for k, ch in enumerate(word):
        for row, bits in enumerate(FONT[ch]):
            for col, bit in enumerate(bits):
                if bit == "X":
                    px[x0 + k * 6 + col, y0 + row] = TEXT + (255,)
    return img


# --- build -----------------------------------------------------------
def main():
    tiles = {
        "roadasphalt": asphalt(7),
        "roaddash": road_dash(),
        "roadedge": road_edge(),
        "kerb": kerb(),
        "verge": verge(3),
        "vergetuft": verge(19, dry=0.25, tuft=1),
        "roadbush": bush(),
        "roadtree": tree(),
        "roaddirt": dirt(),
        "streetlamp": streetlamp(),
    }
    os.makedirs(OUT, exist_ok=True)
    for name, img in tiles.items():
        path = os.path.normpath(os.path.join(OUT, name + ".png"))
        img.save(path)
        print("wrote", os.path.basename(path), img.size)
    print("\nstreetlamp.png is a PLACEHOLDER — replace with the group's own art.")


if __name__ == "__main__":
    main()
