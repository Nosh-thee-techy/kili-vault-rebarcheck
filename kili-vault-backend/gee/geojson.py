"""
Kili-Vault Earth Engine: GeoJSON Serialization & Validation Module
Converts Earth Engine vector candidate changes into standard GeoJSON FeatureCollections
with strict schema compliance for external GIS and ArcGIS Maps SDK consumption.
"""

import json
from typing import Dict, Any, List

from shapely.geometry import shape, mapping
from shapely.validation import make_valid


def normalize_geometry(
    geometry: Dict[str, Any],
    aoi_geometry: Dict[str, Any] = None,
) -> Dict[str, Any]:
    """Return a valid WGS84 GeoJSON geometry without discarding repaired parts."""
    candidate = make_valid(shape(geometry))
    if aoi_geometry is not None:
        candidate = candidate.intersection(shape(aoi_geometry))
    if candidate.is_empty:
        raise ValueError("Detection geometry is empty after AOI clipping")
    return mapping(candidate)


def format_detection_feature(
    feature_id: str,
    geometry: Dict[str, Any],
    centroid: Dict[str, Any],
    area_m2: float,
    bbox: List[float],
    detection_date: str,
    baseline_period: Dict[str, str],
    recent_period: Dict[str, str],
    change_type: str,
    confidence_score: float,
    confidence_factors: Dict[str, Any],
    risk_score: int,
    risk_level: str,
    risk_factors: Dict[str, Any],
    baseline_probability: float,
    prithvi_probability: float = None,
    ndbi_change: float = None,
    ndvi_change: float = None,
    temporal_persistence: float = None,
    aoi_geometry: Dict[str, Any] = None,
    processing_version: str = "v1.0.0",
    model_version: str = "gee_s2_v1"
) -> Dict[str, Any]:
    """
    Constructs a compliant GeoJSON Feature dictionary.
    """
    return {
        "type": "Feature",
        "id": feature_id,
        "geometry": normalize_geometry(geometry, aoi_geometry),
        "properties": {
            "detection_id": feature_id,
            "centroid": centroid,
            "area_m2": round(area_m2, 2),
            "bbox": bbox,
            "detection_date": detection_date,
            "baseline_period_start": baseline_period.get("start"),
            "baseline_period_end": baseline_period.get("end"),
            "recent_period_start": recent_period.get("start"),
            "recent_period_end": recent_period.get("end"),
            "change_type": change_type,
            "confidence_score": confidence_score,
            "baseline_probability": baseline_probability,
            "prithvi_probability": prithvi_probability,
            "ndbi_change": ndbi_change,
            "ndvi_change": ndvi_change,
            "temporal_persistence": temporal_persistence,
            "confidence_factors": confidence_factors,
            "persistence_status": "PERSISTENT_CHANGE" if confidence_factors.get("persistence", 0) >= 0.8 else "NEW_DETECTION",
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "source": "Sentinel-2 L2A",
            "model_version": model_version,
            "processing_version": processing_version,
            "review_status": "AI_FLAGGED",
        }
    }


def to_feature_collection(features: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Wraps a list of GeoJSON Features into a FeatureCollection.
    """
    return {
        "type": "FeatureCollection",
        "features": features,
    }


def save_geojson(data: Dict[str, Any], file_path: str) -> None:
    """
    Saves GeoJSON dictionary to disk with clean formatting.
    """
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
