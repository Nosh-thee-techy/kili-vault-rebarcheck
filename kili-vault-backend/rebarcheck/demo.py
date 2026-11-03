"""
Print a readable RebarCheck report for `npm run rebarcheck:demo`.

Generates a synthetic cage photo when samples/ is empty so the demo runs
before the user adds real site photos.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile

import cv2
import numpy as np

from rebarcheck.analyze import run


def _synthetic_photo(path: str) -> None:
    """Dark bars at 50 px / 150 mm with an A4 sheet in the corner."""
    height, width = 700, 800
    image = np.full((height, width, 3), 230, dtype=np.uint8)
    cv2.rectangle(image, (20, 20), (20 + 99, 20 + 70), (250, 250, 250), thickness=-1)
    cv2.rectangle(image, (20, 20), (20 + 99, 20 + 70), (30, 30, 30), thickness=2)
    for y in (140, 190, 240, 290, 340):
        cv2.rectangle(image, (90, y), (width - 90, y + 8), (20, 20, 20), thickness=-1)
    for x in (140, 190, 240, 290, 340):
        cv2.rectangle(image, (x, 90), (x + 8, height - 90), (20, 20, 20), thickness=-1)
    cv2.imwrite(path, image)


def main() -> int:
    samples = os.path.join(os.path.dirname(__file__), "samples")
    photos = [
        os.path.join(samples, name)
        for name in os.listdir(samples)
        if name.lower().endswith((".jpg", ".jpeg", ".png"))
    ] if os.path.isdir(samples) else []
    tmp = None
    if photos:
        image_path = photos[0]
        print(f"Using sample photo: {image_path}")
    else:
        tmp = tempfile.TemporaryDirectory()
        image_path = os.path.join(tmp.name, "synthetic.png")
        _synthetic_photo(image_path)
        print("No files in rebarcheck/samples/; using a synthetic cage drawing.")
    output_dir = os.path.join(os.path.dirname(image_path), "demo-output")
    os.makedirs(output_dir, exist_ok=True)
    result = run(
        {
            "imagePath": image_path,
            "spec": {"barSpacingMm": 150, "toleranceMm": 15},
            "reference": {"type": "a4", "knownLengthMm": 297, "mmPerPixel": 3.0},
            "segmenter": os.environ.get("REBARCHECK_SEGMENTER", "mock"),
            "outputDir": output_dir,
        }
    )
    print(json.dumps(result, indent=2))
    print("\nResult:", result.get("result"))
    print("Disclaimer:", result.get("disclaimer"))
    if tmp:
        tmp.cleanup()
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
