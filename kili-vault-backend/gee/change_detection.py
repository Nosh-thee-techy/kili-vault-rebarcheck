"""
Kili-Vault Earth Engine: Change Detection & False Positive Control
Computes bi-temporal index differentials (delta_NDVI, delta_NDBI),
combines multiple spectral signals, and classifies candidate spatial changes.

CRITICAL REMOTE SENSING PRINCIPLE:
Spectral change alone does NOT prove a building was erected.
Road resurfacing, ground clearing, parking expansion, or vegetation removal
can trigger simple detectors. This module distinguishes candidate types
and preserves observation uncertainty.
"""

from typing import Any, Dict


def compute_spectral_change(baseline_composite: Any, recent_composite: Any) -> Any:
    """
    Computes differences:
    delta_NDVI = recent_NDVI - baseline_NDVI (negative values indicate loss of vegetation)
    delta_NDBI = recent_NDBI - baseline_NDBI (positive values indicate increase in built/impervious surfaces)
    """
    import ee

    recent_ndvi = recent_composite.select("NDVI")
    baseline_ndvi = baseline_composite.select("NDVI")
    delta_ndvi = recent_ndvi.subtract(baseline_ndvi).rename("delta_NDVI")

    recent_ndbi = recent_composite.select("NDBI")
    baseline_ndbi = baseline_composite.select("NDBI")
    delta_ndbi = recent_ndbi.subtract(baseline_ndbi).rename("delta_NDBI")

    return ee.Image.cat([
        delta_ndvi,
        delta_ndbi,
        baseline_ndvi.rename("base_NDVI"),
        recent_ndvi.rename("rec_NDVI"),
        baseline_ndbi.rename("base_NDBI"),
        recent_ndbi.rename("rec_NDBI"),
        baseline_composite.select("observation_count").rename("base_obs"),
        recent_composite.select("observation_count").rename("rec_obs"),
    ])


def generate_candidate_mask(
    change_image: Any,
    delta_ndbi_threshold: float,
    delta_ndvi_threshold: float,
    min_observations: int
) -> Any:
    """
    Generates binary candidate mask based on multi-signal criteria:
    1. Significant NDBI increase (built/impervious material emergence)
    2. Significant NDVI decrease (loss of green canopy/grass cover)
    3. Both baseline and recent temporal windows have at least min_observations
    """
    import ee

    delta_ndbi = change_image.select("delta_NDBI")
    delta_ndvi = change_image.select("delta_NDVI")
    base_obs = change_image.select("base_obs")
    rec_obs = change_image.select("rec_obs")

    # Multi-signal built candidate rule
    built_signal = delta_ndbi.gt(delta_ndbi_threshold).And(
        delta_ndvi.lt(delta_ndvi_threshold))

    # Observation sufficiency check (ensures change is not residual cloud artifact)
    sufficient_obs = base_obs.gte(min_observations).And(
        rec_obs.gte(min_observations))

    candidate_mask = built_signal.And(
        sufficient_obs).rename("candidate_change")
    return candidate_mask


def classify_change_type_heuristics(
    delta_ndbi: float,
    delta_ndvi: float,
    recent_ndbi: float,
    recent_ndvi: float,
    area_m2: float,
    aspect_ratio: float = 1.0,
    is_near_road: bool = False
) -> str:
    """
    Classifies candidate polygon into one of the controlled change categories:
    - BUILDING_DEVELOPMENT: Compact geometry, high positive delta_NDBI, negative delta_NDVI, high recent NDBI
    - INFRASTRUCTURE_CHANGE: Highly elongated geometry, road proximity, or linear spectral change
    - LAND_CLEARING: Moderate NDBI increase with vegetation drop, but recent NDBI below dense built threshold
    - VEGETATION_CHANGE: Strong NDVI decrease without substantial NDBI built-up gain
    - SURFACE_CHANGE: Low to moderate change in both indices
    - UNKNOWN: Default fallback preserving uncertainty
    """
    # 1. Check for linear infrastructure (roadworks, resurfacing, trenching)
    # High aspect ratio (> 3.5) indicates linear feature rather than a building footprint
    if aspect_ratio > 3.5 or (is_near_road and delta_ndbi > 0.08 and area_m2 > 1000):
        return "INFRASTRUCTURE_CHANGE"

    # 2. Strong built signature
    if delta_ndbi >= 0.15 and delta_ndvi <= -0.15 and recent_ndbi > 0.0:
        return "BUILDING_DEVELOPMENT"

    # 3. Moderate built candidate
    if delta_ndbi >= 0.10 and delta_ndvi <= -0.10:
        if recent_ndbi > -0.05:
            return "BUILDING_DEVELOPMENT"
        else:
            return "LAND_CLEARING"

    # 4. Vegetation drop without built replacement (e.g. tree felling, lawn clearing)
    if delta_ndvi <= -0.20 and delta_ndbi < 0.08:
        return "VEGETATION_CHANGE"

    # 5. General bare soil / clearing
    if delta_ndbi > 0.05 and delta_ndvi < -0.05:
        return "LAND_CLEARING"

    return "SURFACE_CHANGE"
