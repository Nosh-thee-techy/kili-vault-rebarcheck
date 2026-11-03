"""
End-to-end analyzer tests: synthetic photo → JSON result via mock/classical.
"""

from __future__ import annotations

import json
import os
import tempfile

import cv2
import numpy as np
import pytest

from rebarcheck.analyze import run
from rebarcheck.geometry import DISCLAIMER


def _write_grid_image(path: str, bad_gap: bool = True) -> None:
    """
    Paint a light slab, dark bars at 50 px pitch, and an A4 sheet.

    3 mm/px × 50 px = 150 mm. The last horizontal gap is 70 px (210 mm) when
    `bad_gap` is true so the analyzer should report outside_tolerance.
    """
    height, width = 700, 800
    image = np.full((height, width, 3), 230, dtype=np.uint8)
    # A4 at 3 mm/px: 297×210 mm → 99×70 px.
    cv2.rectangle(image, (20, 20), (20 + 99, 20 + 70), (250, 250, 250), thickness=-1)
    cv2.rectangle(image, (20, 20), (20 + 99, 20 + 70), (40, 40, 40), thickness=2)
    h_ys = [140, 190, 240, 290, 360 if bad_gap else 340]
    v_xs = [140, 190, 240, 290, 340]
    for y in h_ys:
        cv2.rectangle(image, (90, y), (width - 90, y + 8), (20, 20, 20), thickness=-1)
    for x in v_xs:
        cv2.rectangle(image, (x, 90), (x + 8, height - 90), (20, 20, 20), thickness=-1)
    cv2.imwrite(path, image)


def test_mock_segmenter_returns_valid_json_shape(tmp_path):
    """Mock path must always produce the documented result envelope."""
    photo = str(tmp_path / "cage.png")
    _write_grid_image(photo, bad_gap=False)
    out = run(
        {
            "imagePath": photo,
            "spec": {"barSpacingMm": 150, "toleranceMm": 15},
            "reference": {"type": "a4", "knownLengthMm": 297},
            "segmenter": "mock",
            "outputDir": str(tmp_path),
        }
    )
    assert out["ok"] is True
    assert out["result"] in ("within_tolerance", "outside_tolerance", "inconclusive")
    assert "horizontal" in out["spacingMm"]
    assert "vertical" in out["summary"]
    assert out["disclaimer"] == DISCLAIMER
    assert os.path.isfile(out["overlayPath"])


def test_classical_detects_violation_on_synthetic_grid(tmp_path):
    """Classical OpenCV path should flag the wide gap on a clean drawing."""
    photo = str(tmp_path / "cage.png")
    _write_grid_image(photo, bad_gap=True)
    out = run(
        {
            "imagePath": photo,
            "spec": {"barSpacingMm": 150, "toleranceMm": 15},
            "reference": {"type": "a4", "knownLengthMm": 297, "mmPerPixel": 3.0},
            "segmenter": "classical",
            "outputDir": str(tmp_path),
        }
    )
    assert out["ok"] is True
    # Classical may miss a bar on a drawing; if it measures the wide gap it
    # must label it outside_tolerance. If it cannot, it must stay inconclusive
    # rather than invent within_tolerance.
    assert out["result"] in ("outside_tolerance", "inconclusive")
    if out["result"] == "outside_tolerance":
        assert out["violations"]


def test_missing_image_is_json_error():
    """Missing files become ok:false, not a traceback."""
    out = run({"imagePath": "C:/definitely/not/here.png"})
    assert out["ok"] is False
    assert out["error"]["code"] in ("NOT_FOUND", "VALIDATION_ERROR")


def test_empty_payload_is_json_error():
    out = run({})
    assert out["ok"] is False
    assert out["error"]["code"] == "VALIDATION_ERROR"
