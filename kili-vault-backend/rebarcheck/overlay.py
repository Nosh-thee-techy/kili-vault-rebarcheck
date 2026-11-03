"""
RebarCheck overlay: annotated PNG for the foreman and the map popup.

Draws direction-coloured bars, the reference object, numbered indices,
spacing labels, and red highlights on violating gaps. The footer states the
trust-model disclaimer so the image cannot be mistaken for a sign-off.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence, Tuple

import cv2
import numpy as np

from .geometry import Bar, DirectionSummary, DISCLAIMER

HORIZONTAL_COLOR = (210, 140, 40)  # BGR blue-ish for horizontal bars
VERTICAL_COLOR = (40, 140, 210)  # BGR orange for vertical bars
REFERENCE_COLOR = (200, 200, 40)
VIOLATION_COLOR = (40, 40, 220)
TEXT_COLOR = (20, 20, 20)
FOOTER_BG = (245, 245, 245)


def draw_overlay(
    image: np.ndarray,
    horizontal: Sequence[Bar],
    vertical: Sequence[Bar],
    reference_mask: Optional[np.ndarray],
    h_summary: DirectionSummary,
    v_summary: DirectionSummary,
    violations: Sequence[Dict[str, Any]],
    mm_per_pixel: float,
    output_path: str,
) -> str:
    """
    Render an annotated copy of `image` to `output_path` and return that path.

    Spacing labels sit at the midpoint between consecutive bar projections.
    Violating gaps are drawn in red on top of the default label colour.
    """
    canvas = _to_bgr(image).copy()
    if reference_mask is not None and np.any(reference_mask):
        _tint(canvas, reference_mask, REFERENCE_COLOR, alpha=0.25)
        _outline(canvas, reference_mask, REFERENCE_COLOR)
    _draw_group(canvas, horizontal, HORIZONTAL_COLOR, prefix="H")
    _draw_group(canvas, vertical, VERTICAL_COLOR, prefix="V")
    violating = {(v["direction"], tuple(v["between"])) for v in violations}
    _draw_spacing_labels(
        canvas, horizontal, h_summary, "horizontal", mm_per_pixel, violating
    )
    _draw_spacing_labels(
        canvas, vertical, v_summary, "vertical", mm_per_pixel, violating
    )
    canvas = _footer(canvas)
    cv2.imwrite(output_path, canvas)
    return output_path


def _to_bgr(image: np.ndarray) -> np.ndarray:
    """Ensure a 3-channel BGR image for drawing."""
    if image.ndim == 2:
        return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    if image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
    return image


def _tint(canvas: np.ndarray, mask: np.ndarray, color: Tuple[int, int, int], alpha: float) -> None:
    """Blend `color` onto pixels where `mask` is true."""
    overlay = canvas.copy()
    overlay[mask.astype(bool)] = color
    cv2.addWeighted(overlay, alpha, canvas, 1.0 - alpha, 0, dst=canvas)


def _outline(canvas: np.ndarray, mask: np.ndarray, color: Tuple[int, int, int]) -> None:
    """Draw the outer contour of a mask."""
    binary = (mask.astype(np.uint8) > 0).astype(np.uint8) * 255
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(canvas, contours, -1, color, 2)


def _draw_group(
    canvas: np.ndarray,
    bars: Sequence[Bar],
    color: Tuple[int, int, int],
    prefix: str,
) -> None:
    """Tint each bar and write its index near the centre."""
    for index, bar in enumerate(bars):
        _tint(canvas, bar.mask, color, alpha=0.35)
        label = f"{prefix}{index}"
        origin = (int(bar.cx) + 4, int(bar.cy) - 4)
        cv2.putText(
            canvas,
            label,
            origin,
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            TEXT_COLOR,
            1,
            cv2.LINE_AA,
        )


def _draw_spacing_labels(
    canvas: np.ndarray,
    bars: Sequence[Bar],
    summary: DirectionSummary,
    direction: str,
    mm_per_pixel: float,
    violating: set,
) -> None:
    """Label each consecutive gap in millimetres at the midpoint of the two bars."""
    if len(bars) < 2 or mm_per_pixel <= 0:
        return
    order = np.argsort(summary.positions_px)
    for i in range(len(order) - 1):
        a = bars[int(order[i])]
        b = bars[int(order[i + 1])]
        measured = summary.spacings_mm[i] if i < len(summary.spacings_mm) else 0.0
        mid = (int((a.cx + b.cx) / 2), int((a.cy + b.cy) / 2))
        is_violation = (direction, (int(order[i]), int(order[i + 1]))) in violating
        color = VIOLATION_COLOR if is_violation else TEXT_COLOR
        if is_violation:
            cv2.line(
                canvas,
                (int(a.cx), int(a.cy)),
                (int(b.cx), int(b.cy)),
                VIOLATION_COLOR,
                2,
                cv2.LINE_AA,
            )
        cv2.putText(
            canvas,
            f"{measured:.0f} mm",
            (mid[0] + 4, mid[1] - 4),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.4,
            color,
            1,
            cv2.LINE_AA,
        )


def _footer(canvas: np.ndarray) -> np.ndarray:
    """Append a small disclaimer strip so the PNG carries the trust wording."""
    bar_h = 28
    out = np.full((canvas.shape[0] + bar_h, canvas.shape[1], 3), FOOTER_BG, dtype=np.uint8)
    out[: canvas.shape[0]] = canvas
    cv2.putText(
        out,
        "Visual spacing check. Not an engineer's sign-off.",
        (8, canvas.shape[0] + 20),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        TEXT_COLOR,
        1,
        cv2.LINE_AA,
    )
    return out
