"""
Spatial Post-Processing & Geometry Validation Module
Implements:
- Probability and confidence thresholding
- Minimum mapping unit (area filter)
- Polygon closure and geometric validity checks
- Spatial deduplication hashing to link repeated observations to stable events
"""

import math
import hashlib
from typing import Dict, Any, List, Optional, Tuple


def calculate_polygon_centroid(coordinates: List[List[float]]) -> Tuple[float, float]:
    """Computes the arithmetic centroid (lon, lat) of a polygon ring."""
    if not coordinates:
        return 0.0, 0.0
    pts = coordinates[:-1] if coordinates[0] == coordinates[-1] and len(coordinates) > 1 else coordinates
    avg_lon = sum(p[0] for p in pts) / len(pts)
    avg_lat = sum(p[1] for p in pts) / len(pts)
    return round(avg_lon, 6), round(avg_lat, 6)


def approximate_polygon_area_m2(coordinates: List[List[float]]) -> float:
    """
    Computes approximate geodesic surface area in square meters for a WGS84 polygon.
    Uses spherical polygon area formula approximation.
    """
    if len(coordinates) < 3:
        return 0.0

    area = 0.0
    # Mean latitude for metric projection scaling
    mean_lat = math.radians(sum(p[1] for p in coordinates) / len(coordinates))
    meters_per_deg_lat = 111132.92
    meters_per_deg_lon = 111412.84 * math.cos(mean_lat)

    for i in range(len(coordinates)):
        j = (i + 1) % len(coordinates)
        x1 = coordinates[i][0] * meters_per_deg_lon
        y1 = coordinates[i][1] * meters_per_deg_lat
        x2 = coordinates[j][0] * meters_per_deg_lon
        y2 = coordinates[j][1] * meters_per_deg_lat
        area += (x1 * y2) - (x2 * y1)

    return round(abs(area) * 0.5, 2)


def generate_deduplication_hash(lon: float, lat: float, grid_precision: float = 0.0002) -> str:
    """
    Generates a stable spatial deduplication hash by snapping coordinates to a ~20m grid.
    Ensures recurring weekly satellite passes over the same site resolve to the same event.
    """
    snap_lon = round(lon / grid_precision) * grid_precision
    snap_lat = round(lat / grid_precision) * grid_precision
    key = f"{snap_lon:.5f}_{snap_lat:.5f}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]


def validate_and_close_polygon(coordinates: List[List[float]]) -> List[List[float]]:
    """Ensures polygon ring has at least 3 points and is closed (first == last)."""
    if len(coordinates) < 3:
        raise ValueError("Polygon ring must contain at least 3 points")
    ring = [list(pt) for pt in coordinates]
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    return ring


def postprocess_candidates(
    candidates: List[Dict[str, Any]],
    min_confidence: float = 0.40,
    min_area_m2: float = 100.0,
    max_area_m2: float = 50000.0,
) -> List[Dict[str, Any]]:
    """
    Filters and sanitizes raw candidate detections:
    - Filters by minimum confidence
    - Filters by area bounds
    - Validates polygon rings
    - Generates stable event hash and centroid
    """
    valid_detections = []

    for idx, c in enumerate(candidates):
        conf = c.get("confidence", 0.0)
        if conf < min_confidence:
            continue

        raw_coords = c.get("geometry", {}).get("coordinates", [])
        if not raw_coords or not isinstance(raw_coords, list):
            continue

        ring = raw_coords[0] if isinstance(raw_coords[0][0], list) else raw_coords
        try:
            closed_ring = validate_and_close_polygon(ring)
        except Exception:
            continue

        calc_area = c.get("area_m2") or approximate_polygon_area_m2(closed_ring)
        if calc_area < min_area_m2 or calc_area > max_area_m2:
            continue

        centroid_lon, centroid_lat = calculate_polygon_centroid(closed_ring)
        event_hash = generate_deduplication_hash(centroid_lon, centroid_lat)

        det_id = c.get("id") or f"det_{event_hash}_{idx+1}"
        event_id = f"evt_{event_hash}"

        sanitized = {
            "id": det_id,
            "event_id": event_id,
            "deduplication_hash": event_hash,
            "geometry": {
                "type": "Polygon",
                "coordinates": [closed_ring],
            },
            "properties": {
                "change_type": c.get("change_type", "UNKNOWN"),
                "confidence": conf,
                "baseline_probability": c.get("baseline_probability"),
                "prithvi_probability": c.get("prithvi_probability"),
                "ndbi_change": c.get("ndbi_change", 0.0),
                "ndvi_change": c.get("ndvi_change", 0.0),
                "temporal_persistence": c.get("temporal_persistence", 1.0),
                "area_m2": calc_area,
                "centroid": [centroid_lon, centroid_lat],
                "model_version": c.get("model_version", "kili-vault-dev-v0.1"),
                "evidence": c.get("evidence", {}),
            },
        }
        valid_detections.append(sanitized)

    return valid_detections
