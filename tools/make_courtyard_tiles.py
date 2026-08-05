"""
Draws the courtyard tileset (level 2) for Hear No Evil.

Every tile is 32x32 RGBA, same as the mansion tileset, and the ones that
repeat across the ground (cobble, moss, water, hedge) wrap seamlessly so a
field of them has no visible grid.

    python tools/make_courtyard_tiles.py

Written by us; no external art was traced or imported.
"""

import math
import os
import random

from PIL import Image

N = 32
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "images")

# --- palette ---------------------------------------------------------
# Cool weathered stone + overgrowth, so the courtyard reads as "outside and
# abandoned" against the mansion's warm brick interior.
STONE = [(158, 161, 156), (136, 140, 135), (114, 119, 114), (94, 99, 95), (74, 79, 76)]
STONE_WARM = [(152, 143, 128), (128, 119, 106), (106, 98, 88)]
MORTAR = (48, 52, 49)
MOSS = [(112, 152, 74), (86, 124, 54), (62, 94, 38), (44, 68, 28)]
LEAF = [(104, 162, 78), (74, 130, 56), (52, 100, 40), (34, 72, 28), (22, 50, 22)]
WATER = [(134, 232, 226), (86, 198, 200), (50, 156, 168), (32, 114, 132), (22, 84, 104)]
WOOD = [(176, 118, 66), (142, 90, 46), (106, 64, 32), (74, 44, 22), (46, 28, 15)]
IRON = [(112, 116, 124), (78, 82, 90), (48, 52, 58)]
FLOWER = (240, 240, 226)
FLOWER_CORE = (234, 198, 92)
OUTLINE = (16, 15, 19)


# --- helpers ---------------------------------------------------------
def new(alpha=0):
    return Image.new("RGBA", (N, N), (0, 0, 0, alpha))


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def wrap_delta(a, b):
    """Shortest signed a-b on a 32px torus, so tiles line up edge to edge."""
    d = a - b
    if d > N / 2:
        d -= N
    if d < -N / 2:
        d += N
    return d


def value_noise(seed, freq):
    """Smooth 0..1 field that wraps at the tile edge."""
    rnd = random.Random(seed)
    g = [[rnd.random() for _ in range(freq)] for _ in range(freq)]
    out = [[0.0] * N for _ in range(N)]
    for y in range(N):
        fy = y * freq / N
        y0 = int(fy) % freq
        y1 = (y0 + 1) % freq
        ty = fy - int(fy)
        ty = ty * ty * (3 - 2 * ty)
        for x in range(N):
            fx = x * freq / N
            x0 = int(fx) % freq
            x1 = (x0 + 1) % freq
            tx = fx - int(fx)
            tx = tx * tx * (3 - 2 * tx)
            a = g[y0][x0] * (1 - tx) + g[y0][x1] * tx
            b = g[y1][x0] * (1 - tx) + g[y1][x1] * tx
            out[y][x] = a * (1 - ty) + b * ty
    return out


def outline_alpha(img, colour=OUTLINE):
    """1px dark border around opaque pixels — matches the mansion's props."""
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


# --- ground ----------------------------------------------------------
def cobble(seed, moss_level, warm_chance=0.16, tuft=0, moss_strength=0.75):
    """Irregular cobbles via a wrapping Voronoi, moss packed into the joints."""
    rnd = random.Random(seed)
    G = 4
    cell = N / G
    sites = []
    for gy in range(G):
        for gx in range(G):
            sx = (gx + 0.5) * cell + rnd.uniform(-1.7, 1.7)
            sy = (gy + 0.5) * cell + rnd.uniform(-1.7, 1.7)
            if rnd.random() < warm_chance:
                base = STONE_WARM[rnd.randrange(len(STONE_WARM))]
            else:
                base = STONE[rnd.randrange(0, 4)]
            sites.append((sx, sy, base, rnd.random() < moss_level))

    mossfield = value_noise(seed + 91, 4)
    img = new(255)
    px = img.load()
    for y in range(N):
        for x in range(N):
            best = second = 1e9
            bi = 0
            for i, (sx, sy, _, _) in enumerate(sites):
                dx = wrap_delta(x + 0.5, sx)
                dy = wrap_delta(y + 0.5, sy)
                d = math.hypot(dx, dy)
                if d < best:
                    second, best, bi = best, d, i
                elif d < second:
                    second = d
            sx, sy, base, mossy = sites[bi]
            gap = second - best
            dx = wrap_delta(x + 0.5, sx)
            dy = wrap_delta(y + 0.5, sy)
            m = mossfield[y][x]

            if gap < 1.2:  # joint between stones
                c = MORTAR
                if m > 0.46:
                    c = mix(MORTAR, MOSS[2], min(1.0, (m - 0.46) * 3.2))
            else:
                f = 1.0 - (dx + dy) * 0.028  # light from the top-left
                if gap < 2.5:  # bevel the stone's rim
                    f *= 0.84 if (dx + dy) > 0 else 1.12
                c = shade(base, f)
                if mossy and m > 0.40:
                    c = mix(c, MOSS[1], min(moss_strength, (m - 0.40) * 2.0))
            px[x, y] = c + (255,)

    # grass pushing up through the cracks
    for _ in range(tuft):
        tx, ty = rnd.randrange(N), rnd.randrange(N)
        h = rnd.randint(2, 4)
        for i in range(h):
            yy = (ty - i) % N
            px[tx, yy] = MOSS[min(3, i)] + (255,)
            if i and rnd.random() < 0.5:
                px[(tx + rnd.choice((-1, 1))) % N, yy] = MOSS[2] + (255,)
    return img


def ivy_ground():
    """Ivy swallowing the paving — walkable, purely decorative."""
    img = cobble(seed=23, moss_level=0.5, warm_chance=0.0, tuft=4)
    px = img.load()
    rnd = random.Random(404)
    cover = value_noise(77, 3)
    vein = value_noise(78, 5)
    for y in range(N):
        for x in range(N):
            base = px[x, y][:3]
            if cover[y][x] > 0.34:  # ivy mat
                t = min(1.0, (cover[y][x] - 0.34) * 3.0)
                leaf = LEAF[2] if vein[y][x] > 0.5 else LEAF[3]
                px[x, y] = mix(base, leaf, t) + (255,)
            else:  # bare stone still shows in the gaps
                px[x, y] = mix(base, MOSS[3], 0.3) + (255,)
    # individual leaves catching the light, so it isn't a flat green mat
    for _ in range(20):
        cx, cy = rnd.randrange(N), rnd.randrange(N)
        c = LEAF[0] if rnd.random() < 0.4 else LEAF[1]
        for dx, dy in ((1, 0), (2, 0), (0, 1), (1, 1), (2, 1), (1, 2)):
            px[(cx + dx) % N, (cy + dy) % N] = c + (255,)
    return img


# --- walls -----------------------------------------------------------
def _wall_profile(img, depth_of):
    """
    Shared body for wall + corner. `depth_of(x, y)` returns how far a pixel is
    from the room-facing edge; the engine rotates the tile, so 'inward' is +x
    at 0 degrees (same convention as the mansion's wall.png).
    """
    px = img.load()
    grime = value_noise(313, 4)
    moss = value_noise(515, 3)
    rnd = random.Random(808)

    for y in range(N):
        for x in range(N):
            d = depth_of(x, y)

            if d <= 1:  # contact shadow where the wall meets the ground
                px[x, y] = shade(MORTAR, 0.55 + 0.2 * d) + (255,)
                continue
            if d <= 5:  # mossy skirt at the base of the wall
                base = mix(MOSS[2], MOSS[1], (d - 2) / 3.0)
                if moss[y][x] < 0.44:
                    base = mix(base, STONE[3], 0.6)
                px[x, y] = base + (255,)
                continue
            if d <= 7:  # capstone lip catching the light
                px[x, y] = shade(STONE[1], 1.14) + (255,)
                continue

            # Masonry: two courses deep, blocks 8px tall, offset like brickwork.
            # Every period divides 32 so the joints line up tile to tile.
            bd = d - 8
            course = bd // 12
            yy = (y + (0 if course == 0 else 4)) % 8
            if bd % 12 < 2 or yy < 2:  # 2px mortar joints
                px[x, y] = MORTAR + (255,)
                continue
            block = (course * 7 + (y + (0 if course == 0 else 4)) // 8) % 3
            f = 0.86 + 0.26 * grime[y][x]
            c = shade(STONE[1 + block], f)
            if moss[y][x] > 0.66:
                c = mix(c, MOSS[2], (moss[y][x] - 0.66) * 1.7)
            px[x, y] = c + (255,)

    # chipped edges so the stone doesn't look extruded
    for _ in range(10):
        x, y = rnd.randrange(N), rnd.randrange(N)
        if depth_of(x, y) > 9:
            px[x, y] = shade(STONE[4], 1.0) + (255,)
    return img


def wall():
    # 0 degrees = left-hand wall, so the room is toward +x.
    return _wall_profile(new(255), lambda x, y: N - 1 - x)


def corner():
    # 0 degrees = top-left corner, so the room is toward +x and +y.
    return _wall_profile(new(255), lambda x, y: min(N - 1 - x, N - 1 - y))


# --- planting --------------------------------------------------------
def hedge(flowers=0):
    """Dense foliage block. Seamless, so hedges of any size read as one mass."""
    rnd = random.Random(1201 + flowers)
    big = value_noise(61, 3)
    small = value_noise(62, 6)
    img = new(255)
    px = img.load()
    for y in range(N):
        for x in range(N):
            v = big[y][x] * 0.6 + small[y][x] * 0.4
            if v > 0.66:
                c = LEAF[0]
            elif v > 0.55:
                c = LEAF[1]
            elif v > 0.42:
                c = LEAF[2]
            elif v > 0.30:
                c = LEAF[3]
            else:
                c = LEAF[4]
            px[x, y] = c + (255,)

    # clumps of lit leaves so the mass has structure under the flashlight
    for _ in range(22):
        cx, cy = rnd.randrange(N), rnd.randrange(N)
        c = LEAF[0] if rnd.random() < 0.45 else LEAF[1]
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1), (2, 0), (1, 2)):
            px[(cx + dx) % N, (cy + dy) % N] = c + (255,)

    for _ in range(flowers):
        cx = rnd.randrange(3, N - 5)
        cy = rnd.randrange(3, N - 5)
        for dx, dy in ((1, 0), (2, 0), (0, 1), (3, 1), (0, 2), (3, 2), (1, 3), (2, 3)):
            px[cx + dx, cy + dy] = FLOWER + (255,)
        for dx, dy in ((1, 1), (2, 1), (1, 2), (2, 2)):
            px[cx + dx, cy + dy] = FLOWER_CORE + (255,)
    return img


# --- water -----------------------------------------------------------
def pool():
    """Deep, still water. Kept dark so the flashlight highlight does the work."""
    img = new(255)
    px = img.load()
    ripple = value_noise(140, 4)
    fine = value_noise(141, 8)
    for y in range(N):
        for x in range(N):
            v = ripple[y][x] * 0.72 + fine[y][x] * 0.28
            if v > 0.70:
                c = WATER[2]
            elif v > 0.52:
                c = WATER[3]
            else:
                c = WATER[4]
            if x == 0 or y == 0:  # faint joint, reads as a lined pool floor
                c = shade(c, 0.88)
            px[x, y] = c + (255,)
    # a few slack ripple lines catching the light
    for y in range(2, N - 2):
        for x in range(N):
            if 0.62 < ripple[y][x] < 0.68 and fine[y][x] > 0.5:
                px[x, y] = WATER[1] + (255,)
    return img


def puddle():
    """
    Standing water on the paving — the courtyard's hazard tile. Deliberately
    loud when the beam is on it (bright meniscus + specular streak) and still
    a readable dark blot through the darkness, so a death is always your fault
    for not looking rather than the level hiding something.
    """
    img = cobble(seed=31, moss_level=0.16, warm_chance=0.06, moss_strength=0.4)
    px = img.load()
    edge = value_noise(915, 3)

    for y in range(N):
        for x in range(N):
            dx = (x + 0.5 - N / 2) / (N / 2)
            dy = (y + 0.5 - N / 2) / (N / 2)
            # ragged outline, so a run of puddles doesn't look stamped
            r = math.hypot(dx, dy) + (0.5 - edge[y][x]) * 0.42
            if r > 0.94:
                continue
            base = px[x, y][:3]
            if r > 0.84:  # bright meniscus catching the light
                px[x, y] = mix(base, WATER[0], 0.55) + (255,)
                continue
            depth = min(1.0, (0.84 - r) * 1.9)
            c = mix(base, WATER[3], 0.55 + 0.35 * depth)
            # sky reflected in the surface
            c = mix(c, WATER[1], 0.30 * max(0.0, edge[y][x] - 0.45))
            px[x, y] = c + (255,)

    # specular streak across the top-left, the giveaway that it's wet
    for i in range(11):
        sx, sy = 9 + i, 11 - i // 3
        for d in range(2):
            if 0 <= sx + d < N and 0 <= sy < N:
                px[sx + d, sy] = mix(px[sx + d, sy][:3], (236, 252, 250), 0.72) + (
                    255,
                )
    return img


def well_quarter():
    """
    One quadrant of the well: the map places four of these, rotated 0/90/180/270,
    to build a 2x2 tile ring. Lighting is kept radial so the rotations match.
    """
    img = new(0)
    px = img.load()
    cx = cy = float(N)  # well centre sits on the tile's bottom-right corner
    ripple = value_noise(222, 4)

    R_OUT, R_IN = 30.5, 20.0
    for y in range(N):
        for x in range(N):
            dx = x + 0.5 - cx
            dy = y + 0.5 - cy
            r = math.hypot(dx, dy)
            if r > R_OUT:
                continue
            ang = math.atan2(dy, dx)

            if r > R_IN:
                t = (r - R_IN) / (R_OUT - R_IN)  # 0 inner .. 1 outer
                # blocks every 30 degrees; 90 divides evenly so rotation is seamless
                joint = abs(((ang % (math.pi / 6)) / (math.pi / 6)) - 0.5) > 0.44
                if joint or t > 0.93 or t < 0.06:
                    px[x, y] = MORTAR + (255,)
                else:
                    tone = STONE[1] if int(ang / (math.pi / 6)) % 2 else STONE[2]
                    c = shade(tone, 1.16 - 0.5 * abs(t - 0.42))
                    if ripple[y][x] > 0.66:
                        c = mix(c, MOSS[2], (ripple[y][x] - 0.66) * 1.8)
                    px[x, y] = c + (255,)
                continue

            # water, dark at the rim and bright in the middle
            t = r / R_IN
            band = 0.5 + 0.5 * math.sin(r * 1.5)
            v = (1 - t) * 0.8 + band * 0.2 + ripple[y][x] * 0.18
            if v > 0.74:
                c = WATER[0]
            elif v > 0.58:
                c = WATER[1]
            elif v > 0.42:
                c = WATER[2]
            elif v > 0.26:
                c = WATER[3]
            else:
                c = WATER[4]
            if t > 0.88:  # shadow cast by the rim
                c = shade(c, 0.62)
            px[x, y] = c + (255,)
    return img


# --- props -----------------------------------------------------------
def crate():
    img = new(0)
    px = img.load()
    rnd = random.Random(55)
    x0, y0, x1, y1 = 3, 4, 28, 29
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            plank = ((x - x0) // 6) % 2
            c = WOOD[1] if plank else WOOD[2]
            if (x - x0) % 6 == 0:
                c = WOOD[3]
            c = shade(c, 0.94 + 0.12 * rnd.random())
            px[x, y] = c + (255,)
    # frame + diagonal brace
    for x in range(x0, x1 + 1):
        for y in (y0, y0 + 1, y1 - 1, y1):
            px[x, y] = WOOD[0] + (255,)
    for y in range(y0, y1 + 1):
        for x in (x0, x0 + 1, x1 - 1, x1):
            px[x, y] = WOOD[0] + (255,)
    for i in range(y1 - y0 + 1):
        t = i / (y1 - y0)
        bx = int(x0 + 2 + t * (x1 - x0 - 4))
        for d in (0, 1):
            px[min(x1 - 1, bx + d), y0 + i] = WOOD[0] + (255,)
    # top face highlight so it doesn't read flat
    for x in range(x0 + 2, x1 - 1):
        px[x, y0 + 2] = shade(WOOD[0], 1.16) + (255,)
    return outline_alpha(img)


def gate():
    """Boarded-up doorway set into the wall. Vertically seamless (1x3 tiles)."""
    img = new(255)
    px = img.load()
    rnd = random.Random(9)
    for y in range(N):
        for x in range(N):
            if x < 4 or x > 27:  # stone jamb
                px[x, y] = shade(STONE[3], 0.9 + 0.2 * rnd.random()) + (255,)
                continue
            plank = ((x - 4) // 5) % 2
            c = WOOD[2] if plank else WOOD[3]
            if (x - 4) % 5 == 0:
                c = WOOD[4]
            px[x, y] = shade(c, 0.92 + 0.14 * rnd.random()) + (255,)
    # one iron band per tile, so stacked tiles band evenly
    for y in range(13, 18):
        for x in range(4, 28):
            px[x, y] = (IRON[1] if y in (14, 15, 16) else IRON[2]) + (255,)
    for x in range(6, 28, 7):
        px[x, 15] = shade(IRON[0], 1.3) + (255,)
    return img


# --- entry point -----------------------------------------------------
TILES = {
    "courtyardfloor": lambda: cobble(seed=7, moss_level=0.22, tuft=3, moss_strength=0.55),
    "courtyardmoss": lambda: cobble(
        seed=13, moss_level=0.95, warm_chance=0.0, tuft=12, moss_strength=1.0
    ),
    "ivy": ivy_ground,
    "courtyardwall": wall,
    "courtyardcorner": corner,
    "hedge": lambda: hedge(flowers=0),
    "flowerbush": lambda: hedge(flowers=4),
    "poolwater": pool,
    "puddle": puddle,
    "wellquarter": well_quarter,
    "crate": crate,
    "gate": gate,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, fn in TILES.items():
        img = fn()
        assert img.size == (N, N), name
        path = os.path.normpath(os.path.join(OUT, name + ".png"))
        img.save(path)
        print("wrote", os.path.basename(path), img.size, img.mode)


if __name__ == "__main__":
    main()
