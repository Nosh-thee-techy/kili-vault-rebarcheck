"""
Geometry unit tests using synthetic masks at a known millimetre scale.

A 3.0 mm/px grid with 150 mm pitch must measure within 2 mm of truth, and a
deliberately wide gap must be flagged as a violation.
"""

from __future__ import annotations

import numpy as np
import pytest

from rebarcheck.geometry import (
    classify_result,
    fit_bar,
    measure_reference,
    measure_spacing,
)


MM_PER_PIXEL = 3.0
EXPECTED_MM = 150.0
TOLERANCE_MM = 15.0
# 150 mm / 3 mm/px = 50 px centre-to-centre.
PITCH_PX = int(EXPECTED_MM / MM_PER_PIXEL)
HEIGHT = 700
WIDTH = 800
THICKNESS = 8


def _rect_mask(y0: int, x0: int, y1: int, x1: int) -> np.ndarray:
    """Filled axis-aligned rectangle as a boolean mask."""
    mask = np.zeros((HEIGHT, WIDTH), dtype=bool)
    mask[y0:y1, x0:x1] = True
    return mask


def _horizontal_bar(y: int) -> np.ndarray:
    return _rect_mask(y, 80, y + THICKNESS, WIDTH - 80)


def _vertical_bar(x: int) -> np.ndarray:
    return _rect_mask(80, x, HEIGHT - 80, x + THICKNESS)


def _a4_mask(origin=(20, 20), long_px=99, short_px=70) -> np.ndarray:
    """A4 long side 297 mm → 99 px at 3 mm/px; short side 210 mm → 70 px."""
    y0, x0 = origin
    return _rect_mask(y0, x0, y0 + short_px, x0 + long_px)


def test_spacing_within_2mm_and_flags_violation():
    """Regular 150 mm grid plus one 210 mm gap must report that violation."""
    # Horizontal centres at 120, 170, 220, 270, then 340 (70 px = 210 mm).
    h_ys = [120, 170, 220, 270, 340]
    v_xs = [120, 170, 220, 270, 320]
    bars = [fit_bar(_horizontal_bar(y), 0.9) for y in h_ys]
    bars += [fit_bar(_vertical_bar(x), 0.9) for x in v_xs]
    bars = [b for b in bars if b is not None]
    scale, _ = measure_reference(_a4_mask(), known_length_mm=297.0)
    assert scale is not None
    assert abs(scale.mm_per_pixel - MM_PER_PIXEL) < 0.15
    result = measure_spacing(bars, scale, EXPECTED_MM, TOLERANCE_MM)
    assert result["result"] == "outside_tolerance"
    h_gaps = result["spacingMm"]["horizontal"]
    v_gaps = result["spacingMm"]["vertical"]
    # Convert the known pixel pitch through the measured scale rather than
    # assuming mmPerPixel is exactly 3.0 (minAreaRect can be 1 px off).
    true_ok = PITCH_PX * result["mmPerPixel"]
    true_bad = 70 * result["mmPerPixel"]
    for gap in h_gaps[:3]:
        assert abs(gap - true_ok) <= 2.0
    for gap in v_gaps:
        assert abs(gap - true_ok) <= 2.0
    assert any(abs(v["measuredMm"] - true_bad) <= 2.0 for v in result["violations"])
    assert result["barCount"]["horizontal"] >= 5
    assert result["barCount"]["vertical"] >= 5


def test_no_reference_without_fallback_is_inconclusive():
    """Scale is never guessed: missing reference and mmPerPixel → inconclusive."""
    bars = [fit_bar(_horizontal_bar(y), 0.9) for y in (100, 150, 200, 250)]
    bars = [b for b in bars if b is not None]
    scale, warnings = measure_reference(None, known_length_mm=297.0)
    assert scale is None
    result = measure_spacing(bars, scale, EXPECTED_MM, TOLERANCE_MM)
    assert result["result"] == "inconclusive"
    assert result["mmPerPixel"] == 0.0
    assert any("scale" in w.lower() or "reference" in w.lower() for w in warnings + result["warnings"])


def test_tilted_reference_warns_about_camera_angle():
    """A squashed 'A4' (perspective) must trip the 8% aspect check."""
    # 99 x 40 px → aspect 2.475 vs 1.414, well beyond 8%.
    mask = _a4_mask(long_px=99, short_px=40)
    scale, warnings = measure_reference(mask, known_length_mm=297.0)
    assert scale is not None
    assert scale.perspective_warning is True
    assert any("top-down" in w.lower() for w in warnings)


def test_too_few_bars_is_inconclusive_when_gaps_are_fine():
    """Two bars per direction cannot support a within_tolerance result."""
    bars = [
        fit_bar(_horizontal_bar(120), 0.9),
        fit_bar(_horizontal_bar(170), 0.9),
        fit_bar(_vertical_bar(120), 0.9),
        fit_bar(_vertical_bar(170), 0.9),
    ]
    bars = [b for b in bars if b is not None]
    scale, _ = measure_reference(_a4_mask(), known_length_mm=297.0)
    result = measure_spacing(bars, scale, EXPECTED_MM, TOLERANCE_MM)
    assert result["result"] == "inconclusive"
    assert result["violations"] == []


def test_empty_image_fits_no_bars():
    """An empty mask must not produce a Bar."""
    empty = np.zeros((HEIGHT, WIDTH), dtype=bool)
    assert fit_bar(empty) is None


def test_manual_mm_per_pixel_fallback():
    """When the sheet is missing, an explicit mmPerPixel is allowed."""
    scale, warnings = measure_reference(
        None, known_length_mm=297.0, mm_per_pixel_fallback=3.0
    )
    assert scale is not None
    assert scale.mm_per_pixel == 3.0
    assert scale.source == "manual_mm_per_pixel"
    assert any("fallback" in w.lower() for w in warnings)


def test_classify_result_labels():
    """Trust-model labels: never approved/compliant, only the three results."""
    assert classify_result(5, 5, [], True) == "within_tolerance"
    assert classify_result(5, 5, [{"direction": "horizontal"}], True) == "outside_tolerance"
    assert classify_result(1, 1, [], True) == "inconclusive"
    assert classify_result(5, 5, [], False) == "inconclusive"
