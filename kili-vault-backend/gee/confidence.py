"""
Kili-Vault Earth Engine: Transparent Confidence Scoring Module
Calculates a multi-factor confidence score (0.0 to 1.0) with an auditable evidence breakdown.
"""

from typing import Dict, Any, Tuple


def calculate_confidence(
    delta_ndbi: float,
    delta_ndvi: float,
    base_obs: int,
    rec_obs: int,
    area_m2: float,
    persistence_observed: bool = False
) -> Tuple[float, Dict[str, Any]]:
    """
    Computes transparent confidence score and evidence factors dictionary.

    Factors:
    1. NDBI Change Magnitude (30%): Higher built-index jump = stronger evidence of built surface.
    2. NDVI Decrease Magnitude (30%): Greater canopy/green loss = stronger evidence of site development.
    3. Observation Quality (20%): More cloud-free scenes = lower risk of cloud shadow artifact.
    4. Size / Area Plausibility (10%): Candidate size in typical plot range (150 - 5,000 m2).
    5. Temporal Persistence (10%): Change maintained across multiple composite dates.
    """
    # 1. NDBI factor (0 to 1.0; 0.25 delta is considered very high)
    ndbi_factor = min(max(delta_ndbi / 0.25, 0.0), 1.0)

    # 2. NDVI factor (0 to 1.0; -0.30 delta is considered very high loss)
    ndvi_factor = min(max(abs(delta_ndvi) / 0.30, 0.0), 1.0) if delta_ndvi < 0 else 0.0

    # 3. Observation Quality factor (min 3 obs = 0.5, 8+ obs = 1.0)
    min_obs = min(base_obs, rec_obs)
    obs_factor = min(max(min_obs / 8.0, 0.2), 1.0)

    # 4. Area plausibility factor
    if 200 <= area_m2 <= 10000:
        area_factor = 1.0
    elif 100 <= area_m2 < 200:
        area_factor = 0.7
    else:
        area_factor = 0.5

    # 5. Persistence factor
    persistence_factor = 1.0 if persistence_observed else 0.6

    # Weighted sum
    raw_score = (
        (ndbi_factor * 0.30) +
        (ndvi_factor * 0.30) +
        (obs_factor * 0.20) +
        (area_factor * 0.10) +
        (persistence_factor * 0.10)
    )

    confidence_score = round(min(max(raw_score, 0.0), 1.0), 2)

    factors = {
        "ndbi_change": round(ndbi_factor, 2),
        "ndvi_change": round(ndvi_factor, 2),
        "observation_quality": round(obs_factor, 2),
        "area_plausibility": round(area_factor, 2),
        "persistence": round(persistence_factor, 2),
        "raw_signals": {
            "delta_ndbi": round(delta_ndbi, 3),
            "delta_ndvi": round(delta_ndvi, 3),
            "baseline_observations": base_obs,
            "recent_observations": rec_obs,
            "area_m2": round(area_m2, 1),
        }
    }

    return confidence_score, factors
