"""
RebarCheck geometry: scale calibration, bar orientation clustering, and spacing.

All spacing math lives here so it can be unit-tested against synthetic masks
without a live image or a model. Pixel-to-mm conversion never guesses a scale:
it uses a segmented reference object or an explicit mmPerPixel fallback.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Tuple

import cv2
import numpy as np

# A4 long/short side ratio (297 mm / 210 mm). Used only as a camera-angle check.
A4_ASPECT_RATIO = 297.0 / 210.0
# Flag the photo as possibly not top-down when the reference aspect differs by
# more than this fraction of the expected ratio (8%).
PERSPECTIVE_ASPECT_TOLERANCE = 0.08
# Bars whose principal axis is within this many degrees of 0° or 90° join a
# grid group; anything else is discarded as a stray detection.
ORIENTATION_GROUP_DEG = 20.0
# Detections closer than this fraction of the expected spacing are treated as
# the same bar (double-counted mask fragments).
DUPLICATE_SPACING_FRACTION = 0.25
# A mesh result is only "within_tolerance" when both directions have this many
# bars (which yields at least two measurable gaps per direction).
MIN_BARS_PER_DIRECTION = 3
DISCLAIMER = (
    "Visual spacing check from a photo. Not an engineer's sign-off. "
    "Pending human verification."
)


@dataclass
class Bar:
    """One segmented bar: binary mask, score, and fitted centreline."""

    mask: np.ndarray
    score: float
    vx: float
    vy: float
    cx: float
    cy: float
    orientation_deg: float
    length_px: float


@dataclass
class ReferenceMeasurement:
    """Scale derived from a reference object mask (or a manual fallback)."""

    mm_per_pixel: float
    long_edge_px: float
    short_edge_px: float
    aspect_ratio: float
    source: str
    perspective_warning: bool
    warnings: List[str] = field(default_factory=list)


@dataclass
class DirectionSummary:
    """Aggregate spacing stats for one grid direction."""

    mean_mm: float
    min_mm: float
    max_mm: float
    count: int
    positions_px: List[float]
    spacings_mm: List[float]


def _angle_deg(vx: float, vy: float) -> float:
    """Return the line direction in [0, 180). 0° is image-horizontal."""
    angle = math.degrees(math.atan2(vy, vx)) % 180.0
    return angle


def angle_delta(a: float, b: float) -> float:
    """Smallest difference between two orientations in [0, 180)."""
    d = abs(a - b) % 180.0
    return min(d, 180.0 - d)


def fit_bar(mask: np.ndarray, score: float = 1.0) -> Optional[Bar]:
    """
    Fit a principal axis to a binary bar mask.

    Uses cv2.fitLine (L2) on mask pixel coordinates so a slightly broken or
    thick mask still yields a stable centreline. Returns None for empty masks.
    """
    if mask is None or mask.size == 0 or not np.any(mask):
        return None
    binary = (mask.astype(np.uint8) > 0).astype(np.uint8)
    ys, xs = np.where(binary > 0)
    if xs.size < 8:
        return None
    points = np.column_stack((xs.astype(np.float32), ys.astype(np.float32)))
    line = cv2.fitLine(points, cv2.DIST_L2, 0, 0.01, 0.01)
    vx, vy, cx, cy = [float(v) for v in np.asarray(line).reshape(-1)[:4]]
    # Length along the principal axis: project points onto the unit direction
    # and take the range. This is the visible bar length in pixels.
    proj = (xs - cx) * vx + (ys - cy) * vy
    length_px = float(proj.max() - proj.min()) if proj.size else 0.0
    return Bar(
        mask=binary.astype(bool),
        score=float(score),
        vx=vx,
        vy=vy,
        cx=cx,
        cy=cy,
        orientation_deg=_angle_deg(vx, vy),
        length_px=length_px,
    )


def measure_reference(
    reference_mask: Optional[np.ndarray],
    known_length_mm: Optional[float],
    mm_per_pixel_fallback: Optional[float] = None,
    expected_aspect: float = A4_ASPECT_RATIO,
) -> Tuple[Optional[ReferenceMeasurement], List[str]]:
    """
    Convert a reference-object mask into millimetres-per-pixel.

    The longest edge of the min-area rectangle is assumed to be the known
    physical length (A4 long side = 297 mm by default). We never invent a
    scale: missing mask and missing fallback yields (None, warnings).
    """
    warnings: List[str] = []
    if reference_mask is not None and np.any(reference_mask) and known_length_mm:
        binary = (reference_mask.astype(np.uint8) > 0).astype(np.uint8) * 255
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            warnings.append("Reference mask had no contour; cannot measure scale.")
        else:
            contour = max(contours, key=cv2.contourArea)
            rect = cv2.minAreaRect(contour)
            # minAreaRect size is (width, height) of the rotated box; order is
            # not guaranteed, so take max as the long edge.
            (box_w, box_h) = rect[1]
            long_edge_px = float(max(box_w, box_h))
            short_edge_px = float(min(box_w, box_h))
            if long_edge_px < 1:
                warnings.append("Reference long edge was degenerate (< 1 px).")
            else:
                mm_per_pixel = float(known_length_mm) / long_edge_px
                aspect = long_edge_px / short_edge_px if short_edge_px > 0 else 0.0
                # Perspective sanity: a flat A4 should be ~1.414. A large
                # deviation means the camera was likely not top-down, which
                # stretches spacings non-uniformly.
                perspective_warning = False
                if expected_aspect > 0 and aspect > 0:
                    relative = abs(aspect - expected_aspect) / expected_aspect
                    if relative > PERSPECTIVE_ASPECT_TOLERANCE:
                        perspective_warning = True
                        warnings.append(
                            "Photo may not be top-down: reference aspect "
                            f"{aspect:.3f} vs expected {expected_aspect:.3f} "
                            f"({relative * 100:.1f}% off)."
                        )
                return (
                    ReferenceMeasurement(
                        mm_per_pixel=mm_per_pixel,
                        long_edge_px=long_edge_px,
                        short_edge_px=short_edge_px,
                        aspect_ratio=aspect,
                        source="reference_object",
                        perspective_warning=perspective_warning,
                        warnings=list(warnings),
                    ),
                    warnings,
                )
    if mm_per_pixel_fallback is not None and mm_per_pixel_fallback > 0:
        warnings.append(
            "No reference object measured; using the supplied mmPerPixel fallback."
        )
        return (
            ReferenceMeasurement(
                mm_per_pixel=float(mm_per_pixel_fallback),
                long_edge_px=0.0,
                short_edge_px=0.0,
                aspect_ratio=0.0,
                source="manual_mm_per_pixel",
                perspective_warning=False,
                warnings=list(warnings),
            ),
            warnings,
        )
    warnings.append(
        "No reference object found and no mmPerPixel supplied; scale is unknown."
    )
    return None, warnings


def cluster_bars(
    bars: Sequence[Bar],
) -> Tuple[List[Bar], List[Bar], List[Bar]]:
    """
    Split bars into roughly-horizontal and roughly-vertical groups.

    A rebar mesh is a grid, so orientations cluster near 0° and 90° in a
    top-down photo. Bars outside ORIENTATION_GROUP_DEG of either axis are
    returned as discarded so the caller can warn.
    """
    horizontal: List[Bar] = []
    vertical: List[Bar] = []
    discarded: List[Bar] = []
    for bar in bars:
        to_h = angle_delta(bar.orientation_deg, 0.0)
        to_v = angle_delta(bar.orientation_deg, 90.0)
        if to_h <= ORIENTATION_GROUP_DEG and to_h <= to_v:
            horizontal.append(bar)
        elif to_v <= ORIENTATION_GROUP_DEG:
            vertical.append(bar)
        else:
            discarded.append(bar)
    return horizontal, vertical, discarded


def _mean_direction(bars: Sequence[Bar]) -> Tuple[float, float]:
    """Average unit direction, flipping vectors so they point the same way."""
    if not bars:
        return 1.0, 0.0
    ref_vx, ref_vy = bars[0].vx, bars[0].vy
    sx = 0.0
    sy = 0.0
    for bar in bars:
        vx, vy = bar.vx, bar.vy
        # Flip 180° if the vector opposes the reference, otherwise they cancel.
        if vx * ref_vx + vy * ref_vy < 0:
            vx, vy = -vx, -vy
        sx += vx
        sy += vy
    norm = math.hypot(sx, sy) or 1.0
    return sx / norm, sy / norm


def project_positions(bars: Sequence[Bar]) -> List[float]:
    """
    Project each bar centre onto the axis perpendicular to the group direction.

    Consecutive differences along this axis are the centre-to-centre spacings.
    For horizontal bars the perpendicular is roughly image-Y; for vertical
    bars it is roughly image-X.
    """
    if not bars:
        return []
    vx, vy = _mean_direction(bars)
    px, py = -vy, vx
    return [bar.cx * px + bar.cy * py for bar in bars]


def merge_duplicate_bars(
    bars: Sequence[Bar],
    expected_spacing_px: float,
) -> List[Bar]:
    """Keep the stronger detection when two masks sit on the same bar."""
    if not bars:
        return []
    threshold = max(1.0, DUPLICATE_SPACING_FRACTION * expected_spacing_px)
    indexed = list(zip(project_positions(bars), bars))
    indexed.sort(key=lambda item: item[0])
    merged: List[Tuple[float, Bar]] = []
    for pos, bar in indexed:
        if merged and abs(pos - merged[-1][0]) < threshold:
            prev_pos, prev_bar = merged[-1]
            # Prefer the larger / higher-scoring mask as the canonical bar.
            prev_area = int(np.count_nonzero(prev_bar.mask))
            area = int(np.count_nonzero(bar.mask))
            if bar.score > prev_bar.score or (
                bar.score == prev_bar.score and area > prev_area
            ):
                merged[-1] = (pos, bar)
            else:
                merged[-1] = (prev_pos, prev_bar)
            continue
        merged.append((pos, bar))
    return [bar for _, bar in merged]


def spacings_mm(positions_px: Sequence[float], mm_per_pixel: float) -> List[float]:
    """Consecutive centre-to-centre gaps in millimetres, in sort order."""
    if len(positions_px) < 2 or mm_per_pixel <= 0:
        return []
    ordered = sorted(positions_px)
    return [(ordered[i + 1] - ordered[i]) * mm_per_pixel for i in range(len(ordered) - 1)]


def summarize_direction(
    bars: Sequence[Bar],
    mm_per_pixel: float,
) -> DirectionSummary:
    """Mean / min / max spacing for one orientation group."""
    positions = project_positions(bars)
    gaps = spacings_mm(positions, mm_per_pixel)
    if not gaps:
        return DirectionSummary(
            mean_mm=0.0,
            min_mm=0.0,
            max_mm=0.0,
            count=len(bars),
            positions_px=list(positions),
            spacings_mm=[],
        )
    return DirectionSummary(
        mean_mm=float(np.mean(gaps)),
        min_mm=float(np.min(gaps)),
        max_mm=float(np.max(gaps)),
        count=len(bars),
        positions_px=list(positions),
        spacings_mm=gaps,
    )


def find_violations(
    horizontal: DirectionSummary,
    vertical: DirectionSummary,
    expected_mm: float,
    tolerance_mm: float,
) -> List[Dict[str, Any]]:
    """Flag every consecutive gap whose deviation exceeds the engineer spec."""
    violations: List[Dict[str, Any]] = []
    for direction, summary in (("horizontal", horizontal), ("vertical", vertical)):
        ordered_idx = np.argsort(summary.positions_px) if summary.positions_px else []
        # Gaps are already in sorted-position order from spacings_mm.
        for i, measured in enumerate(summary.spacings_mm):
            deviation = measured - expected_mm
            if abs(deviation) > tolerance_mm:
                left = int(ordered_idx[i]) if len(ordered_idx) > i else i
                right = int(ordered_idx[i + 1]) if len(ordered_idx) > i + 1 else i + 1
                violations.append(
                    {
                        "direction": direction,
                        "between": [left, right],
                        "measuredMm": round(measured, 2),
                        "expectedMm": expected_mm,
                        "deviationMm": round(deviation, 2),
                    }
                )
    return violations


def classify_result(
    horizontal_count: int,
    vertical_count: int,
    violations: Sequence[Dict[str, Any]],
    has_scale: bool,
) -> str:
    """
    Map measurements onto the trust-model labels.

    within_tolerance: scale known, both directions have enough bars, no gap
    outside the spec. outside_tolerance: at least one gap is out. Otherwise
    inconclusive (too few bars, no scale, or no measurable gaps).
    """
    if not has_scale:
        return "inconclusive"
    if violations:
        return "outside_tolerance"
    if (
        horizontal_count >= MIN_BARS_PER_DIRECTION
        and vertical_count >= MIN_BARS_PER_DIRECTION
    ):
        return "within_tolerance"
    return "inconclusive"


def compute_confidence(
    bar_scores: Sequence[float],
    horizontal_count: int,
    vertical_count: int,
    spacings: Sequence[float],
    expected_mm: float,
    scale: Optional[ReferenceMeasurement],
) -> float:
    """
    Blend segmentation quality, bar counts, gap consistency, and scale source.

    Formula (weights sum to 1 before the perspective penalty):
      0.40 * mean(segmentation scores, default 0.5 if none)
    + 0.25 * min(horizontal_count, vertical_count, 5) / 5
    + 0.20 * gap_consistency
          where gap_consistency = 1 - min(1, std(gaps) / expected_mm)
          (1.0 if fewer than two gaps)
    + 0.15 * scale_factor
          1.0 if the reference object was measured, 0.6 for manual mmPerPixel,
          0.0 if there is no scale
    Then multiply by 0.7 when the A4 aspect check failed (likely not top-down).
    Clamp to [0, 1].
    """
    mean_score = float(np.mean(bar_scores)) if bar_scores else 0.5
    count_factor = min(horizontal_count, vertical_count, 5) / 5.0
    if len(spacings) >= 2 and expected_mm > 0:
        gap_consistency = 1.0 - min(1.0, float(np.std(spacings)) / expected_mm)
    else:
        gap_consistency = 0.0 if not spacings else 1.0
    if scale is None:
        scale_factor = 0.0
    elif scale.source == "reference_object":
        scale_factor = 1.0
    else:
        scale_factor = 0.6
    value = (
        0.40 * mean_score
        + 0.25 * count_factor
        + 0.20 * gap_consistency
        + 0.15 * scale_factor
    )
    if scale is not None and scale.perspective_warning:
        value *= 0.7
    return float(max(0.0, min(1.0, value)))


def measure_spacing(
    bars: Sequence[Bar],
    scale: Optional[ReferenceMeasurement],
    spec_spacing_mm: float,
    tolerance_mm: float,
) -> Dict[str, Any]:
    """
    Cluster bars, merge duplicates, measure gaps, and classify the result.

    Returns the structured payload consumed by analyze.py and the Node service.
    """
    warnings: List[str] = []
    horizontal_raw, vertical_raw, discarded = cluster_bars(bars)
    if discarded:
        warnings.append(
            f"Discarded {len(discarded)} bar(s) that were not aligned with the grid."
        )
    has_scale = scale is not None and scale.mm_per_pixel > 0
    mm_per_pixel = scale.mm_per_pixel if has_scale else 0.0
    expected_px = (
        spec_spacing_mm / mm_per_pixel if has_scale and mm_per_pixel > 0 else spec_spacing_mm
    )
    horizontal = merge_duplicate_bars(horizontal_raw, expected_px)
    vertical = merge_duplicate_bars(vertical_raw, expected_px)
    h_summary = summarize_direction(horizontal, mm_per_pixel if has_scale else 1.0)
    v_summary = summarize_direction(vertical, mm_per_pixel if has_scale else 1.0)
    if not has_scale:
        # Without a scale the millimetre numbers would be invented. Zero them
        # and keep pixel positions only for overlay drawing.
        h_summary = DirectionSummary(
            mean_mm=0.0,
            min_mm=0.0,
            max_mm=0.0,
            count=h_summary.count,
            positions_px=h_summary.positions_px,
            spacings_mm=[],
        )
        v_summary = DirectionSummary(
            mean_mm=0.0,
            min_mm=0.0,
            max_mm=0.0,
            count=v_summary.count,
            positions_px=v_summary.positions_px,
            spacings_mm=[],
        )
        warnings.append("Spacing not converted to millimetres because scale is unknown.")
    violations = (
        find_violations(h_summary, v_summary, spec_spacing_mm, tolerance_mm)
        if has_scale
        else []
    )
    result = classify_result(len(horizontal), len(vertical), violations, has_scale)
    if len(horizontal) < MIN_BARS_PER_DIRECTION or len(vertical) < MIN_BARS_PER_DIRECTION:
        warnings.append(
            "Need at least 3 bars in each direction for a within-tolerance result "
            f"(found H={len(horizontal)}, V={len(vertical)})."
        )
    all_spacings = h_summary.spacings_mm + v_summary.spacings_mm
    confidence = compute_confidence(
        [bar.score for bar in list(horizontal) + list(vertical)],
        len(horizontal),
        len(vertical),
        all_spacings,
        spec_spacing_mm,
        scale,
    )
    if scale is not None:
        warnings.extend(scale.warnings)
    return {
        "result": result,
        "confidence": round(confidence, 4),
        "mmPerPixel": round(mm_per_pixel, 6) if has_scale else 0.0,
        "spacingMm": {
            "horizontal": [round(v, 2) for v in h_summary.spacings_mm],
            "vertical": [round(v, 2) for v in v_summary.spacings_mm],
        },
        "summary": {
            "horizontal": {
                "meanMm": round(h_summary.mean_mm, 2),
                "minMm": round(h_summary.min_mm, 2),
                "maxMm": round(h_summary.max_mm, 2),
                "count": h_summary.count,
            },
            "vertical": {
                "meanMm": round(v_summary.mean_mm, 2),
                "minMm": round(v_summary.min_mm, 2),
                "maxMm": round(v_summary.max_mm, 2),
                "count": v_summary.count,
            },
        },
        "violations": violations,
        "barCount": {"horizontal": len(horizontal), "vertical": len(vertical)},
        "warnings": warnings,
        "horizontal_bars": horizontal,
        "vertical_bars": vertical,
        "discarded_bars": discarded,
        "h_summary": h_summary,
        "v_summary": v_summary,
    }
