"""
Synthesises assets/sounds/ringing.wav — the tinnitus ring that plays when the
player goes down in a puddle.

    python tools/make_ringing_sfx.py

Generated from scratch rather than sourced, so there is nothing to license or
cite. Shape: a dull low thud for the impact, then a high ringing tone that
swells fast and decays away, with a second tone a few Hz off so the two beat
against each other the way real tinnitus does.
"""

import math
import os
import struct
import wave

RATE = 44100
DUR = 1.9  # seconds; the knockout itself is shorter, the tail rings out under it
OUT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "assets", "sounds", "ringing.wav"
)


def main():
    n = int(RATE * DUR)
    samples = []
    for i in range(n):
        t = i / RATE

        # impact: a short low thud, gone in a tenth of a second
        thud = 0.0
        if t < 0.12:
            env = math.exp(-t * 34)
            thud = env * (
                0.55 * math.sin(2 * math.pi * 78 * t)
                + 0.25 * math.sin(2 * math.pi * 124 * t)
            )

        # the ring: fast swell, long decay, two close tones beating together
        attack = min(1.0, t / 0.045)
        decay = math.exp(-t * 2.3)
        ring = attack * decay * (
            0.34 * math.sin(2 * math.pi * 4180 * t)
            + 0.20 * math.sin(2 * math.pi * 4207 * t)  # ~27Hz beat
            + 0.10 * math.sin(2 * math.pi * 6350 * t)
        )

        # a slow wobble on the ring so it never sits perfectly still
        ring *= 0.86 + 0.14 * math.sin(2 * math.pi * 5.5 * t)

        v = thud + ring
        v = max(-1.0, min(1.0, v * 0.82))
        samples.append(int(v * 32767))

    # 4ms fade at each end so there is no click on loop or cut
    fade = int(RATE * 0.004)
    for i in range(fade):
        k = i / fade
        samples[i] = int(samples[i] * k)
        samples[-1 - i] = int(samples[-1 - i] * k)

    path = os.path.normpath(OUT)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", s) for s in samples))

    print(
        "wrote %s  (%.2fs mono %dHz, %.0f KB)"
        % (os.path.basename(path), DUR, RATE, os.path.getsize(path) / 1024)
    )


if __name__ == "__main__":
    main()
