"""Kili-Vault Detection Engine Package"""
from detection.detector import EarthObservationDetector
from detection.classification import classify_change, CHANGE_CLASSES
from detection.confidence import calculate_detection_confidence
from detection.temporal import calculate_temporal_persistence
from detection.postprocess import (
    postprocess_candidates,
    calculate_polygon_centroid,
    approximate_polygon_area_m2,
    generate_deduplication_hash,
)

__all__ = [
    "EarthObservationDetector",
    "classify_change",
    "CHANGE_CLASSES",
    "calculate_detection_confidence",
    "calculate_temporal_persistence",
    "postprocess_candidates",
    "calculate_polygon_centroid",
    "approximate_polygon_area_m2",
    "generate_deduplication_hash",
]
