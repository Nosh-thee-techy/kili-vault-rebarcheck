"""
Tape-measure validation: compare analyzer output to a CSV of true spacings.

CSV columns: image, true_spacing_mm
Prints per-image error and the mean absolute error in millimetres — the
"it works" evidence for judges.

Usage (PowerShell):
  python -m rebarcheck.validate --csv rebarcheck/samples/tape.csv
"""

from __future__ import annotations

import argparse
import csv
import os
import sys

from rebarcheck.analyze import run


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="RebarCheck tape-measure validation")
    parser.add_argument("--csv", required=True, help="CSV with image,true_spacing_mm")
    parser.add_argument("--segmenter", default=os.environ.get("REBARCHECK_SEGMENTER", "classical"))
    parser.add_argument("--spec", type=float, default=150.0)
    parser.add_argument("--tolerance", type=float, default=15.0)
    args = parser.parse_args(argv)

    rows = []
    with open(args.csv, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            rows.append(row)
    if not rows:
        print("CSV is empty")
        return 1

    errors = []
    print(f"{'image':40} {'true':>8} {'measured':>10} {'abs_err':>8} result")
    for row in rows:
        image = row["image"]
        if not os.path.isabs(image):
            image = os.path.join(os.path.dirname(args.csv), image)
        true_mm = float(row["true_spacing_mm"])
        out = run(
            {
                "imagePath": image,
                "spec": {"barSpacingMm": args.spec, "toleranceMm": args.tolerance},
                "reference": {"type": "a4", "knownLengthMm": 297},
                "segmenter": args.segmenter,
                "outputDir": os.path.dirname(image),
            }
        )
        measured = None
        gaps = (out.get("spacingMm") or {}).get("horizontal") or []
        gaps += (out.get("spacingMm") or {}).get("vertical") or []
        if gaps:
            measured = sum(gaps) / len(gaps)
        err = abs(measured - true_mm) if measured is not None else None
        if err is not None:
            errors.append(err)
        print(
            f"{os.path.basename(image):40} {true_mm:8.1f} "
            f"{(measured if measured is not None else float('nan')):10.1f} "
            f"{(err if err is not None else float('nan')):8.1f} {out.get('result')}"
        )
    if errors:
        print(f"\nMean absolute error: {sum(errors) / len(errors):.2f} mm  (n={len(errors)})")
    else:
        print("\nNo measurable gaps; cannot compute MAE.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
