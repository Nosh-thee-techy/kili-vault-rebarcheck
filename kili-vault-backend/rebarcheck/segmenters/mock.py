"""
Deterministic mock segmenter for tests and UI work before a model is wired.

Ignores photo content and paints a regular grid plus an A4-sized rectangle.
That keeps Node tests and `npm run rebarcheck:demo` runnable without SAM.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import numpy as np


class MockSegmenter:
    """Return a synthetic 5x5 rebar mesh and a reference sheet."""

    def segment(self, image: np.ndarray, **_kwargs) -> Dict[str, Any]:
        """
        Build boolean masks sized to `image`.

        Horizontal bars run along X, vertical bars along Y, at equal pitch so
        geometry measurements are stable. The reference is an A4-proportion
        rectangle in the top-left so scale calibration has something to fit.
        """
        if image is None or image.size == 0:
            return {"bars": [], "reference": None}
        height, width = image.shape[:2]
        bars: List[Dict[str, Any]] = []
        # Keep a margin so bars do not touch the frame, which makes fitLine
        # more stable than a mask that runs off the edge.
        margin_x = max(16, width // 10)
        margin_y = max(16, height // 10)
        usable_w = width - 2 * margin_x
        usable_h = height - 2 * margin_y
        thickness = max(4, min(width, height) // 80)
        # Five bars in each direction → four measurable gaps.
        for i in range(5):
            y = margin_y + int(round((usable_h - thickness) * i / 4.0))
            mask = np.zeros((height, width), dtype=bool)
            mask[y : y + thickness, margin_x : width - margin_x] = True
            bars.append({"mask": mask, "score": 0.95})
        for i in range(5):
            x = margin_x + int(round((usable_w - thickness) * i / 4.0))
            mask = np.zeros((height, width), dtype=bool)
            mask[margin_y : height - margin_y, x : x + thickness] = True
            bars.append({"mask": mask, "score": 0.95})
        reference = _a4_mask(height, width)
        return {"bars": bars, "reference": {"mask": reference, "score": 0.99}}


def _a4_mask(height: int, width: int) -> np.ndarray:
    """A4-proportion rectangle (long side along X) in the top-left corner."""
    long_px = max(40, width // 6)
    short_px = int(round(long_px * 210.0 / 297.0))
    mask = np.zeros((height, width), dtype=bool)
    x0, y0 = 8, 8
    mask[y0 : y0 + short_px, x0 : x0 + long_px] = True
    return mask
