"""
Temporal Persistence Evaluation Module
Assesses whether a detected change is a transient disturbance or a persistent,
enduring physical structural change over consecutive observation epochs.
"""

from typing import List, Dict, Any


def calculate_temporal_persistence(
    observation_flags: List[bool],
    min_observations: int = 3,
) -> float:
    """
    Computes a normalized persistence score in [0.0, 1.0].
    Takes a list of boolean change detections across chronological observations.
    e.g. [True, True, True] -> 1.0
    e.g. [True, False, False] -> 0.33
    """
    if not observation_flags:
        return 0.50  # Default neutral persistence if single baseline-to-recent comparison

    total = len(observation_flags)
    positive_count = sum(1 for flag in observation_flags if flag)

    ratio = positive_count / total

    # Weight towards recent consistency: If the latest observation is positive, persistence is higher
    latest_positive = observation_flags[-1] if total > 0 else False
    if latest_positive:
        score = 0.70 * ratio + 0.30
    else:
        score = 0.50 * ratio

    return round(max(0.0, min(1.0, float(score))), 4)
