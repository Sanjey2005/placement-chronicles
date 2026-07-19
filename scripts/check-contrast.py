#!/usr/bin/env python3
"""Assert every foreground/background token pair in globals.css clears WCAG AA.

Parses the real :root and .dark blocks rather than a copy, so it fails if
someone re-values a token without rechecking its pair.

    python3 scripts/check-contrast.py
"""
import re
import sys
from pathlib import Path

CSS = Path(__file__).resolve().parent.parent / "app" / "globals.css"

AA_TEXT = 4.5
AA_UI = 3.0

# (foreground token, background token, min ratio, label)
# Surfaces a token is actually painted on are listed explicitly; `text-outline`
# lands on all five tonal steps, which is where #7b7486 and #a09aa8 both died.
SURFACES = [
    "background", "card", "surface-container",
    "surface-container-high", "surface-container-highest",
]

PAIRS = [
    ("foreground", SURFACES, AA_TEXT),
    ("muted-foreground", SURFACES, AA_TEXT),
    ("outline", SURFACES, AA_TEXT),
    ("primary", ["background", "card"], AA_TEXT),
    ("primary-foreground", ["primary"], AA_TEXT),
    ("primary", ["primary-fixed", "primary-fixed-dim"], AA_TEXT),
    ("secondary-foreground", ["secondary"], AA_TEXT),
    ("on-secondary-container", ["secondary-fixed"], AA_TEXT),
    ("on-tertiary", ["tertiary"], AA_TEXT),
    ("on-destructive", ["destructive"], AA_TEXT),
    ("destructive", ["background", "card"], AA_TEXT),
    ("on-error-container", ["error-container"], AA_TEXT),
    ("accent-foreground", ["accent"], AA_TEXT),
    ("on-success", ["success"], AA_TEXT),
    ("success", ["background", "card"], AA_TEXT),
    ("on-success-container", ["success-container"], AA_TEXT),
    ("on-warning", ["warning"], AA_TEXT),
    ("warning", ["background", "card"], AA_TEXT),
    ("on-warning-container", ["warning-container"], AA_TEXT),
    ("on-info", ["info"], AA_TEXT),
    ("info", ["background", "card"], AA_TEXT),
    ("on-info-container", ["info-container"], AA_TEXT),
    # Focus ring must be perceivable against what it surrounds (UI, not text).
    ("ring", ["background", "card"], AA_UI),
]


def parse_block(css: str, selector: str) -> dict[str, str]:
    m = re.search(re.escape(selector) + r"\s*\{(.*?)\n\}", css, re.S)
    if not m:
        sys.exit(f"could not find `{selector}` block in {CSS}")
    return {
        k: v.strip()
        for k, v in re.findall(r"--([\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;", m.group(1))
    }


def luminance(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    channels = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        channels.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = channels
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    hi, lo = sorted([luminance(a), luminance(b)], reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def check(mode: str, tokens: dict[str, str]) -> list[str]:
    failures = []
    for fg, bgs, need in PAIRS:
        for bg in bgs:
            if fg not in tokens or bg not in tokens:
                failures.append(f"{mode}: missing token --{fg if fg not in tokens else bg}")
                continue
            ratio = contrast(tokens[fg], tokens[bg])
            status = "ok" if ratio >= need else "FAIL"
            line = (f"  {mode:<5} {fg:<22} on {bg:<24} "
                    f"{tokens[fg]} / {tokens[bg]}  {ratio:5.2f}:1  {status}")
            print(line)
            if ratio < need:
                failures.append(line.strip())
    return failures


def main() -> int:
    css = CSS.read_text()
    light = parse_block(css, ":root")
    dark = parse_block(css, ".dark")

    failures = check("light", light) + check("dark", dark)

    print()
    if failures:
        print(f"FAILED — {len(failures)} pair(s) below threshold:")
        for f in failures:
            print(f"  {f}")
        return 1
    print(f"PASS — all pairs clear AA in both modes "
          f"({len(light)} light tokens, {len(dark)} dark tokens)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
