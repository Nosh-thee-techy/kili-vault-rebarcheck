"""
Confidence Scoring & Evidence Attribution Module
Computes a calibrated 0.0 - 1.0 confidence score and detailed evidence object.
Provides explainable justification for downstream planning consumption.
"""

from typing import Dict, Any, Tuple


def calculate_detection_confidence(
    delta_ndbi: float,
    delta_ndvi: float,
    baseline_prob: float,
    prithvi_prob: float = None,
    temporal_persistence: float = 1.0,
    valid_observations: int = 5,
    area_m2: float = 500.0,
    aspect_ratio: float = 1.2,
) -> Tuple[float, Dict[str, Any]]:
    """
    Derives confidence score based on multi-factor remote sensing signals.
    Returns: (confidence: float [0.0, 1.0], evidence: dict)
    """
    # 1. Observation Quality Factor (0.0 to 1.0)
    # More cloud-free observations -> higher reliability
    if valid_observations >= 6:
        obs_factor = 1.0
    elif valid_observations >= 3:
        obs_factor = 0.80
    elif valid_observations >= 1:
        obs_factor = 0.50
    else:
        obs_factor = 0.20

    # 2. Spectral Signal Strength
    spectral_mag = 0.0
    if delta_ndbi >= 0.15:
        spectral_mag += 0.50
    elif delta_ndbi >= 0.08:
        spectral_mag += 0.30

    if delta_ndvi <= -0.15:
        spectral_mag += 0.50
    elif delta_ndvi <= -0.08:
        spectral_mag += 0.30

    # 3. Model Consensus
    if prithvi_prob is not None:
        model_score = 0.55 * baseline_prob + 0.45 * prithvi_prob
        prithvi_support = bool(prithvi_prob >= 0.60)
    else:
        model_score = baseline_prob
        prithvi_support = None

    # 4. Geometry Plausibility
    # Standard urban plot footprint in Kilimani: 150m^2 - 10,000m^2
    if 150.0 <= area_m2 <= 10000.0:
        geom_factor = 1.0
    elif 100.0 <= area_m2 <= 25000.0:
        geom_factor = 0.85
    else:
        geom_factor = 0.65

    # 5. Combined Confidence Calculation
    raw_confidence = (
        0.35 * model_score
        + 0.25 * spectral_mag
        + 0.20 * temporal_persistence
        + 0.10 * obs_factor
        + 0.10 * geom_factor
    )

    confidence = round(max(0.0, min(1.0, float(raw_confidence))), 4)

    # 6. Structured Evidence Object (Section 13)
    is_linear = aspect_ratio >= 3.2
    evidence = {
        "spectral_change": bool(abs(delta_ndbi) >= 0.08 or abs(delta_ndvi) >= 0.10),
        "ndbi_increase": bool(delta_ndbi >= 0.10),
        "ndvi_decrease": bool(delta_ndvi <= -0.10),
        "temporal_persistence": bool(temporal_persistence >= 0.60),
        "prithvi_support": prithvi_support,
        "compact_patch": bool(aspect_ratio <= 2.5),
        "linear_infrastructure": is_linear,
        "delta_ndbi": round(float(delta_ndbi), 4),
        "delta_ndvi": round(float(delta_ndvi), 4),
        "observation_count": int(valid_observations),
        "aspect_ratio": round(float(aspect_ratio), 2),
        "explanation": (
            "Multiple independent spectral, temporal, and spatial signals support candidate."
            if confidence >= 0.70
            else "Moderate spectral change with intermediate confidence."
            if confidence >= 0.50
            else "Low-confidence or ambiguous spectral variation."
        ),
    }

    return confidence, evidence
