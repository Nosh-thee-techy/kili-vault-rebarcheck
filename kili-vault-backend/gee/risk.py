"""
Kili-Vault Earth Engine: Spatial Risk & Review Prioritization
Calculates a 0-100 spatial priority score directing planning review resources.
"""

from typing import Dict, Any, Tuple


def calculate_spatial_risk(
    confidence_score: float,
    area_m2: float,
    near_riparian: bool = False,
    near_road: bool = False,
    is_persistent: bool = False
) -> Tuple[int, str, Dict[str, Any]]:
    """
    Computes spatial review prioritization score (0 - 100).
    Categorizes into: LOW, MEDIUM, HIGH, CRITICAL.
    """
    # 1. Confidence component (up to 30 pts)
    conf_pts = int(round(confidence_score * 30))

    # 2. Scale component (up to 25 pts)
    if area_m2 >= 5000:
        scale_pts = 25
    elif area_m2 >= 2000:
        scale_pts = 20
    elif area_m2 >= 800:
        scale_pts = 15
    else:
        scale_pts = 10

    # 3. Persistence component (up to 20 pts)
    pers_pts = 20 if is_persistent else 10

    # 4. Proximity to sensitive/infrastructure zones (up to 25 pts)
    env_pts = 0
    if near_riparian:
        env_pts += 15
    if near_road:
        env_pts += 10
    env_pts = min(env_pts, 25)

    total = min(max(conf_pts + scale_pts + pers_pts + env_pts, 0), 100)

    if total >= 80:
        level = "CRITICAL"
    elif total >= 60:
        level = "HIGH"
    elif total >= 35:
        level = "MEDIUM"
    else:
        level = "LOW"

    breakdown = {
        "confidence_points": conf_pts,
        "scale_points": scale_pts,
        "persistence_points": pers_pts,
        "environmental_points": env_pts,
        "near_riparian": near_riparian,
        "near_road": near_road,
    }

    return total, level, breakdown
