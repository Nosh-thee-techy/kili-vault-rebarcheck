"""
RebarCheck analyzer CLI.

Node (and `npm run rebarcheck:demo`) spawn this as a child process. JSON in,
JSON out on stdout. Errors are `{ "ok": false, "error": {...} }` — never a
stack trace on stdout. Diagnostics go to stderr.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import traceback
from typing import Any, Dict, Optional

import cv2
import numpy as np

from .geometry import (
    DISCLAIMER,
    Bar,
    fit_bar,
    measure_reference,
    measure_spacing,
)
from .overlay import draw_overlay
from .segmenters import get_segmenter

# Keep stderr readable; stdout must stay valid JSON for the Node parser.
def _log(message: str) -> None:
    sys.stderr.write(message + "\n")
    sys.stderr.flush()


def fail(code: str, message: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Build the standard error envelope used by the Node service."""
    return {
        "ok": False,
        "error": {"code": code, "message": message, "details": details or {}},
    }


def load_image(path: str) -> Optional[np.ndarray]:
    """Read an image from disk. Returns None if the file is missing or empty."""
    image = cv2.imread(path, cv2.IMREAD_COLOR)
    if image is None or image.size == 0:
        return None
    return image


def run(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute the full analysis pipeline for one request.

    Input keys: imagePath, spec {barSpacingMm, toleranceMm},
    reference {type, knownLengthMm} or {mmPerPixel}, segmenter, outputDir,
    optional masksPath (SAM sidecar from Node).
    """
    image_path = payload.get("imagePath")
    if not image_path:
        return fail("VALIDATION_ERROR", "imagePath is required")
    image = load_image(image_path)
    if image is None:
        return fail("NOT_FOUND", f"Could not read image at '{image_path}'")

    spec = payload.get("spec") or {}
    bar_spacing_mm = float(spec.get("barSpacingMm", 150))
    tolerance_mm = float(spec.get("toleranceMm", 15))
    reference_cfg = payload.get("reference") or {}
    known_length_mm = reference_cfg.get("knownLengthMm", 297)
    mm_per_pixel_fallback = reference_cfg.get("mmPerPixel") or payload.get("mmPerPixel")
    segmenter_name = (
        payload.get("segmenter")
        or os.environ.get("REBARCHECK_SEGMENTER")
        or "classical"
    )
    output_dir = payload.get("outputDir") or os.path.dirname(image_path) or "."
    os.makedirs(output_dir, exist_ok=True)

    segmenter = get_segmenter(segmenter_name)
    try:
        segmented = segmenter.segment(
            image,
            masks_path=payload.get("masksPath"),
            masks=payload.get("masks"),
        )
    except Exception as err:  # noqa: BLE001 — convert to JSON error, log the rest
        _log(f"segmenter '{segmenter_name}' failed: {err}")
        if segmenter_name != "classical":
            _log("falling back to classical segmenter")
            segmented = get_segmenter("classical").segment(image)
        else:
            return fail("SEGMENTER_ERROR", str(err))

    bars = []
    for entry in segmented.get("bars") or []:
        fitted = fit_bar(entry.get("mask"), score=float(entry.get("score", 0.5)))
        if fitted is not None:
            bars.append(fitted)

    ref_entry = segmented.get("reference")
    ref_mask = ref_entry.get("mask") if ref_entry else None
    expected_aspect = 297.0 / 210.0
    ref_type = str(reference_cfg.get("type") or "a4").lower()
    if ref_type != "a4":
        # Tape / ruler: skip the A4 aspect check by passing 0 (disabled).
        expected_aspect = 0.0
    scale, scale_warnings = measure_reference(
        ref_mask,
        known_length_mm=float(known_length_mm) if known_length_mm else None,
        mm_per_pixel_fallback=float(mm_per_pixel_fallback)
        if mm_per_pixel_fallback
        else None,
        expected_aspect=expected_aspect,
    )

    measured = measure_spacing(bars, scale, bar_spacing_mm, tolerance_mm)
    warnings = list(scale_warnings) + list(measured.get("warnings") or [])
    if not bars:
        warnings.append("No bars detected in the photo.")

    overlay_name = "overlay.png"
    overlay_path = os.path.join(output_dir, overlay_name)
    try:
        draw_overlay(
            image,
            measured.get("horizontal_bars") or [],
            measured.get("vertical_bars") or [],
            ref_mask,
            measured["h_summary"],
            measured["v_summary"],
            measured.get("violations") or [],
            measured.get("mmPerPixel") or 0.0,
            overlay_path,
        )
    except Exception as err:  # noqa: BLE001
        _log(f"overlay failed: {err}")
        overlay_path = ""
        warnings.append("Overlay image could not be written.")

    return {
        "ok": True,
        "result": measured["result"],
        "confidence": measured["confidence"],
        "mmPerPixel": measured["mmPerPixel"],
        "spacingMm": measured["spacingMm"],
        "summary": measured["summary"],
        "violations": measured["violations"],
        "barCount": measured["barCount"],
        "overlayPath": overlay_path,
        "warnings": warnings,
        "disclaimer": DISCLAIMER,
        "segmenter": segmenter_name,
    }


def parse_args(argv: Optional[list] = None) -> argparse.Namespace:
    """CLI flags. JSON body still comes from --input or stdin."""
    parser = argparse.ArgumentParser(description="RebarCheck image analyzer")
    parser.add_argument(
        "--input",
        help="Path to a JSON request file. If omitted, read JSON from stdin.",
    )
    return parser.parse_args(argv)


def main(argv: Optional[list] = None) -> int:
    """Entry point used by `python -m rebarcheck.analyze` and Node spawn."""
    try:
        args = parse_args(argv)
        if args.input:
            with open(args.input, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        else:
            raw = sys.stdin.read()
            if not raw.strip():
                print(json.dumps(fail("VALIDATION_ERROR", "Empty stdin; expected JSON")))
                return 1
            payload = json.loads(raw)
        result = run(payload)
        print(json.dumps(result))
        return 0 if result.get("ok") else 1
    except Exception as err:  # noqa: BLE001 — stdout stays JSON
        _log(traceback.format_exc())
        print(
            json.dumps(
                fail("INTERNAL_ERROR", "Analyzer crashed", {"message": str(err)})
            )
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())
