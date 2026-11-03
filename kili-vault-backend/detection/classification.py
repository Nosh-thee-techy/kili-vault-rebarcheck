"""
Change Classification & False-Positive Prevention Module
Strictly enforces multi-class change categorization:
1. BUILDING_DEVELOPMENT
2. INFRASTRUCTURE_CHANGE
3. LAND_CLEARING
4. VEGETATION_CHANGE
5. SURFACE_CHANGE
6. UNKNOWN

Prioritizes PRECISION over recall for BUILDING_DEVELOPMENT.
Avoids false positives: roads != buildings, bare soil != construction, clearing != development.
"""

from typing import Dict, Any, Tuple

CHANGE_CLASSES = [
    "BUILDING_DEVELOPMENT",
    "INFRASTRUCTURE_CHANGE",
    "LAND_CLEARING",
    "VEGETATION_CHANGE",
    "SURFACE_CHANGE",
    "UNKNOWN",
]


def classify_change(
    delta_ndbi: float,
    delta_ndvi: float,
    recent_ndbi: float,
    recent_ndvi: float,
    area_m2: float,
    aspect_ratio: float = 1.0,
    confidence: float = 0.5,
    temporal_persistence: float = 1.0,
    min_confidence_threshold: float = 0.40,
) -> Tuple[str, Dict[str, Any]]:
    """
    Classifies a detected change feature based on spectral, geometric, and temporal signals.
    Returns: (change_type: str, explanation_dict: dict)
    """
    reasons = []

    # 1. Low Confidence / Ambiguity Guard
    if confidence < min_confidence_threshold:
        return "UNKNOWN", {
            "primary_reason": "Confidence below detection threshold",
            "is_building": False,
            "rule": "LOW_CONFIDENCE_UNKNOWN",
        }

    # 2. Linear Feature Check (Aspect Ratio > 3.2 indicates linear road/trench/corridor)
    # A newly resurfaced road or paved corridor must NOT be classified as a building.
    if aspect_ratio >= 3.2:
        return "INFRASTRUCTURE_CHANGE", {
            "primary_reason": f"High aspect ratio ({round(aspect_ratio, 2)} >= 3.2) indicates linear infrastructure (road, trench, corridor)",
            "is_building": False,
            "rule": "LINEAR_INFRASTRUCTURE_ASPECT_RATIO",
        }

    # 3. Revegetation / Greening check
    if delta_ndvi >= 0.15 and delta_ndbi <= 0.0:
        return "VEGETATION_CHANGE", {
            "primary_reason": f"Significant NDVI increase ({round(delta_ndvi, 2)}) indicates vegetative growth or seasonal greening",
            "is_building": False,
            "rule": "VEGETATION_GROWTH",
        }

    # 4. Vegetation Clearing vs Built Development
    # Vegetation loss (delta_ndvi < -0.10) with negative recent NDBI or negligible NDBI increase
    # represents bare soil / land clearing, NOT a building.
    if delta_ndvi <= -0.10 and delta_ndbi < 0.08:
        if recent_ndbi < 0.0:
            return "LAND_CLEARING", {
                "primary_reason": "Vegetation removed but recent NDBI remains negative (bare ground/soil, not impervious built structure)",
                "is_building": False,
                "rule": "LAND_CLEARING_BARE_SOIL",
            }
        else:
            return "VEGETATION_CHANGE", {
                "primary_reason": "Moderate vegetation reduction without strong built spectral response",
                "is_building": False,
                "rule": "VEGETATION_CHANGE_MILD",
            }

    # 5. Low Temporal Persistence (Single observation spike / temporary disturbance)
    if temporal_persistence < 0.35:
        return "SURFACE_CHANGE", {
            "primary_reason": f"Low temporal persistence ({round(temporal_persistence, 2)} < 0.35) suggests transient surface disturbance",
            "is_building": False,
            "rule": "TRANSIENT_SURFACE_CHANGE",
        }

    # 6. Building Development Conjunction Verification
    # Requires multiple independent signals:
    # - Increased NDBI (delta_ndbi >= 0.10)
    # - Positive recent NDBI (recent_ndbi >= 0.05)
    # - Decreased NDVI (delta_ndvi <= -0.10)
    # - Compact geometry (aspect ratio <= 3.0)
    # - Plausible area (100 m^2 <= area_m2 <= 50,000 m^2)
    # - Persistence >= 0.50
    is_built_spectral = (delta_ndbi >= 0.09) and (recent_ndbi >= 0.0)
    is_veg_drop = delta_ndvi <= -0.08
    is_compact = aspect_ratio <= 3.0
    is_plausible_area = 80.0 <= area_m2 <= 55000.0
    is_persistent = temporal_persistence >= 0.45

    if is_built_spectral and is_veg_drop and is_compact and is_plausible_area and is_persistent:
        return "BUILDING_DEVELOPMENT", {
            "primary_reason": "Multi-signal conjunction: strong built-up spectral shift, reduced vegetation, compact footprint, and persistent presence",
            "is_building": True,
            "rule": "CONJUNCTIVE_BUILDING_DEVELOPMENT",
        }

    # 7. Moderate built-up spectral response without vegetation clearing (e.g. rooftop replacement, impervious surfacing)
    if is_built_spectral and is_compact:
        return "SURFACE_CHANGE", {
            "primary_reason": "Impervious surface increase without vegetation displacement (paving or surface modification)",
            "is_building": False,
            "rule": "IMPERVIOUS_SURFACE_MODIFICATION",
        }

    # Fallback to UNKNOWN
    return "UNKNOWN", {
        "primary_reason": "Spectral signals do not meet threshold for specific development category",
        "is_building": False,
        "rule": "FALLBACK_UNKNOWN",
    }
