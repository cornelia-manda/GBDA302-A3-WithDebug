"""
Rebuilds the mansion's junction tiles so they sit flush against the straights.

    python tools/make_wall_junctions.py

wallVertical.png is the source of truth and is never modified. It is a pure
extruded profile: one 32px cross-section repeated down its length. This script
reads that cross-section and mitres it into the pieces that have to meet it:

    wallHorizontal.png  the same profile turned 90 degrees
    wallCorner.png      joins right + down at 0 rotation
    wallTee.png         joins up + down + right at 0 rotation
    wallPlus.png        joins all four

Because every piece is cut from the same cross-section, the moulding lines up
exactly across every tile boundary. Redraw wallVertical.png and re-run this and
the whole set follows.

The wall art itself is the group's; this only re-cuts the junctions from it.
"""

import os

from PIL import Image

N = 32
IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "images")


def wedge(x, y):
    """Which of the four 45-degree wedges a pixel falls in."""
    if y < x:
        return "up" if x + y < N - 1 else "right"
    return "left" if x + y < N - 1 else "down"


def build(profile, arms):
    """
    Cut a tile from the cross-section. A wedge whose arm exists shows that arm's
    profile; a wedge whose arm is missing is filled by the neighbour that carries
    the wall through, which is what puts the mitre on the diagonal.
    """
    img = Image.new("RGBA", (N, N))
    px = img.load()
    for y in range(N):
        for x in range(N):
            w = wedge(x, y)
            if w in arms:
                px[x, y] = profile[x] if w in ("up", "down") else profile[y]
            elif "up" in arms or "down" in arms:
                px[x, y] = profile[x]  # a vertical run passes through
            else:
                px[x, y] = profile[y]  # a horizontal run passes through
    return img


def corner(profile):
    """Right + down. Both absent wedges lean on their adjacent arm, so the seam
    lands on the main diagonal."""
    img = Image.new("RGBA", (N, N))
    px = img.load()
    for y in range(N):
        for x in range(N):
            px[x, y] = profile[y] if y < x else profile[x]
    return img


def main():
    src = os.path.normpath(os.path.join(IMG, "wallVertical.png"))
    v = Image.open(src).convert("RGBA")
    assert v.size == (N, N), "wallVertical.png must be 32x32"
    pv = v.load()

    # sanity: the straight must be a clean extrusion or nothing can line up
    for x in range(N):
        for y in range(N):
            assert pv[x, y] == pv[x, 0], (
                "wallVertical.png varies down its length at (%d,%d); it has to be "
                "one cross-section repeated, or the junctions cannot match it" % (x, y)
            )

    profile = [pv[x, 0] for x in range(N)]

    out = {
        "wallHorizontal": build(profile, {"left", "right"}),
        "wallCorner": corner(profile),
        "wallTee": build(profile, {"up", "down", "right"}),
        "wallPlus": build(profile, {"up", "down", "left", "right"}),
    }

    for name, img in out.items():
        path = os.path.normpath(os.path.join(IMG, name + ".png"))
        img.save(path)
        print("wrote", os.path.basename(path))

    # verify: every arm edge must equal the straight's cross-section exactly
    def row(im, y):
        p = im.load()
        return [p[x, y] for x in range(N)]

    def col(im, x):
        p = im.load()
        return [p[x, y] for y in range(N)]

    checks = [
        ("Horizontal left", col(out["wallHorizontal"], 0), profile),
        ("Horizontal right", col(out["wallHorizontal"], N - 1), profile),
        ("Corner right", col(out["wallCorner"], N - 1), profile),
        ("Corner down", row(out["wallCorner"], N - 1), profile),
        ("Tee up", row(out["wallTee"], 0), profile),
        ("Tee down", row(out["wallTee"], N - 1), profile),
        ("Tee right", col(out["wallTee"], N - 1), profile),
        ("Plus up", row(out["wallPlus"], 0), profile),
        ("Plus down", row(out["wallPlus"], N - 1), profile),
        ("Plus left", col(out["wallPlus"], 0), profile),
        ("Plus right", col(out["wallPlus"], N - 1), profile),
    ]
    bad = [n for n, got, want in checks if got != want]
    if bad:
        raise SystemExit("edges still do not match: " + ", ".join(bad))
    print("all %d arm edges match the straight profile exactly" % len(checks))


if __name__ == "__main__":
    main()
