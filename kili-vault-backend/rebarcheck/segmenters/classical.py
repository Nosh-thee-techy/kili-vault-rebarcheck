"""
Classical OpenCV segmenter: no neural model.

Safety net when SAM 3.1 is unavailable or performs poorly on rebar. Tuned for
clean top-down photos (dark bars on a lighter slab, A4 sheet in frame).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np


class ClassicalSegmenter:
    """Line detection + rectangle hunt, implemented with OpenCV only."""

    def segment(self, image: np.ndarray, **_kwargs) -> Dict[str, Any]:
        """
        Return `{ bars: [{mask, score}], reference: {mask, score} | None }`.

        Steps: grayscale → CLAHE → adaptive threshold → morphology →
        probabilistic Hough lines, merged into bar candidates. The reference
        object is the largest 4-sided contour whose aspect is near A4.
        """
        if image is None or image.size == 0:
            return {"bars": [], "reference": None}
        gray = _as_gray(image)
        bars = _detect_bars(gray)
        reference = _detect_reference(gray)
        return {"bars": bars, "reference": reference}


def _as_gray(image: np.ndarray) -> np.ndarray:
    """Convert BGR/BGRA/RGB to a single-channel uint8 image."""
    if image.ndim == 2:
        return image
    if image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_BGRA2GRAY)
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def _detect_bars(gray: np.ndarray) -> List[Dict[str, Any]]:
    """
    Extract bar-like line masks from a grayscale photo.

    Adaptive threshold handles uneven site lighting better than a global
    cutoff. HoughLinesP is used instead of LSD because LSD lives in
    opencv-contrib, which we do not require.
    """
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    # Bars are usually darker than the slab; invert so they become the
    # foreground (white) for Hough.
    binary = cv2.adaptiveThreshold(
        enhanced,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        31,
        8,
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel, iterations=1)

    min_length = max(40, min(gray.shape[:2]) // 8)
    lines = cv2.HoughLinesP(
        cleaned,
        rho=1,
        theta=np.pi / 180.0,
        threshold=max(30, min_length // 3),
        minLineLength=min_length,
        maxLineGap=max(8, min_length // 10),
    )
    if lines is None:
        return []
    merged = _merge_collinear(lines.reshape(-1, 4), gray.shape[:2])
    thickness = max(3, min(gray.shape[:2]) // 100)
    bars: List[Dict[str, Any]] = []
    height, width = gray.shape[:2]
    for (x1, y1, x2, y2), score in merged:
        mask = np.zeros((height, width), dtype=np.uint8)
        cv2.line(mask, (int(x1), int(y1)), (int(x2), int(y2)), 255, thickness)
        bars.append({"mask": mask.astype(bool), "score": float(score)})
    return bars


def _merge_collinear(
    segments: np.ndarray,
    shape: Tuple[int, int],
) -> List[Tuple[Tuple[float, float, float, float], float]]:
    """
    Join line fragments that share an angle and lie on the same centreline.

    Hough returns many short hits along one bar. We cluster by angle (20°)
    and perpendicular offset so geometry sees one mask per bar.
    """
    if segments.size == 0:
        return []
    items = []
    for x1, y1, x2, y2 in segments:
        dx = float(x2 - x1)
        dy = float(y2 - y1)
        length = float(np.hypot(dx, dy))
        if length < 8:
            continue
        angle = (np.degrees(np.arctan2(dy, dx)) + 180.0) % 180.0
        mx, my = (x1 + x2) / 2.0, (y1 + y2) / 2.0
        # Perpendicular offset from the origin: how far the infinite line sits
        # from (0,0) along the normal. Collinear fragments share this value.
        nx, ny = -dy / length, dx / length
        offset = mx * nx + my * ny
        items.append(
            {
                "angle": angle,
                "offset": offset,
                "length": length,
                "pts": [(float(x1), float(y1)), (float(x2), float(y2))],
            }
        )
    used = [False] * len(items)
    merged = []
    angle_tol = 20.0
    offset_tol = max(8.0, min(shape) * 0.02)
    for i, src in enumerate(items):
        if used[i]:
            continue
        used[i] = True
        cluster = [src]
        for j, other in enumerate(items):
            if used[j]:
                continue
            d_ang = abs(src["angle"] - other["angle"])
            d_ang = min(d_ang, 180.0 - d_ang)
            if d_ang <= angle_tol and abs(src["offset"] - other["offset"]) <= offset_tol:
                used[j] = True
                cluster.append(other)
        pts = [p for item in cluster for p in item["pts"]]
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        # Rebuild a single segment from the extremes of the cluster. Using
        # min/max of x (or y) keeps endpoints on the original fragments.
        if abs(src["angle"] - 90.0) < 45.0:
            # Mostly vertical: sort by y.
            pts_sorted = sorted(pts, key=lambda p: p[1])
        else:
            pts_sorted = sorted(pts, key=lambda p: p[0])
        x1, y1 = pts_sorted[0]
        x2, y2 = pts_sorted[-1]
        score = min(0.9, 0.4 + 0.1 * len(cluster))
        merged.append(((x1, y1, x2, y2), score))
    return merged


def _detect_reference(gray: np.ndarray) -> Optional[Dict[str, Any]]:
    """
    Find a large 4-sided contour to use as the A4 / ruler reference.

    We prefer the contour whose aspect is closest to A4 (~1.414) among the
    biggest blobs, so a bar mesh is less likely to win.
    """
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    edges = cv2.dilate(edges, kernel, iterations=1)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    height, width = gray.shape[:2]
    image_area = float(height * width)
    best = None
    best_score = 0.0
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < image_area * 0.01 or area > image_area * 0.45:
            continue
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.04 * peri, True)
        if len(approx) < 4:
            continue
        rect = cv2.minAreaRect(contour)
        rw, rh = rect[1]
        if rw < 8 or rh < 8:
            continue
        aspect = max(rw, rh) / max(1.0, min(rw, rh))
        # Score: prefer A4-like aspect and a reasonably large area.
        aspect_score = max(0.0, 1.0 - abs(aspect - 297.0 / 210.0) / 1.0)
        area_score = min(1.0, area / (image_area * 0.08))
        score = 0.6 * aspect_score + 0.4 * area_score
        if score > best_score:
            best_score = score
            mask = np.zeros((height, width), dtype=np.uint8)
            cv2.drawContours(mask, [contour], -1, 255, thickness=-1)
            best = {"mask": mask.astype(bool), "score": float(min(0.95, score))}
    return best
