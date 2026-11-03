"""
Model A: Interpretable Spectral Change Baseline
Calculates multi-temporal differences across Sentinel-2 spectral indices:
- NDVI (Vegetation)
- NDBI (Built-up / Impervious)
- NDWI (Water / Moisture)
Produces a calibrated baseline development-change probability.
"""

from typing import Dict, Any, Tuple


class SpectralChangeBaseline:
    """Interpretable remote sensing spectral change baseline detector."""

    def __init__(
        self,
        delta_ndbi_threshold: float = 0.10,
        delta_ndvi_threshold: float = -0.10,
    ):
        self.delta_ndbi_threshold = delta_ndbi_threshold
        self.delta_ndvi_threshold = delta_ndvi_threshold

    def calculate_spectral_differences(
        self,
        ndvi_before: float,
        ndvi_after: float,
        ndbi_before: float,
        ndbi_after: float,
        ndwi_before: float = 0.0,
        ndwi_after: float = 0.0,
    ) -> Dict[str, float]:
        """Derives delta values for each index."""
        return {
            "ndvi_before": float(ndvi_before),
            "ndvi_after": float(ndvi_after),
            "delta_ndvi": float(ndvi_after - ndvi_before),
            "ndbi_before": float(ndbi_before),
            "ndbi_after": float(ndbi_after),
            "delta_ndbi": float(ndbi_after - ndbi_before),
            "ndwi_before": float(ndwi_before),
            "ndwi_after": float(ndwi_after),
            "delta_ndwi": float(ndwi_after - ndwi_before),
        }

    def predict_development_probability(
        self,
        ndvi_before: float,
        ndvi_after: float,
        ndbi_before: float,
        ndbi_after: float,
        ndwi_before: float = 0.0,
        ndwi_after: float = 0.0,
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Estimates the baseline probability that a spectral transition represents physical built development.
        Returns: (probability: float [0.0, 1.0], evidence: dict)
        """
        diffs = self.calculate_spectral_differences(
            ndvi_before, ndvi_after, ndbi_before, ndbi_after, ndwi_before, ndwi_after
        )
        d_ndbi = diffs["delta_ndbi"]
        d_ndvi = diffs["delta_ndvi"]
        rec_ndbi = diffs["ndbi_after"]
        rec_ndvi = diffs["ndvi_after"]

        # 1. Built-up signal component: positive NDBI shift
        if d_ndbi >= self.delta_ndbi_threshold:
            # Scaled between 0.5 and 1.0 as d_ndbi grows from threshold to +0.40
            ndbi_score = min(1.0, 0.5 + ((d_ndbi - self.delta_ndbi_threshold) / 0.30) * 0.5)
        elif d_ndbi > 0:
            ndbi_score = (d_ndbi / self.delta_ndbi_threshold) * 0.5
        else:
            ndbi_score = 0.0

        # 2. Vegetation clearing component: negative NDVI shift
        if d_ndvi <= self.delta_ndvi_threshold:
            # Scaled between 0.5 and 1.0 as d_ndvi drops from threshold to -0.40
            ndvi_score = min(1.0, 0.5 + ((abs(d_ndvi) - abs(self.delta_ndvi_threshold)) / 0.30) * 0.5)
        elif d_ndvi < 0:
            ndvi_score = (abs(d_ndvi) / abs(self.delta_ndvi_threshold)) * 0.5
        else:
            ndvi_score = 0.0

        # 3. Post-change absolute built status verification
        # High confidence building must exhibit positive recent NDBI
        rec_built_multiplier = 1.0 if rec_ndbi >= 0.05 else (0.7 if rec_ndbi >= -0.05 else 0.3)

        # 4. Joint probability calculation
        # If NDBI did not increase, it cannot be high-confidence development (could be bare soil or clearing)
        if d_ndbi <= 0.02:
            base_prob = 0.15 * ndvi_score
        else:
            # Multiplicative interaction ensures both signals are needed for high confidence
            base_prob = (0.60 * ndbi_score + 0.40 * ndvi_score) * rec_built_multiplier

        base_prob = max(0.0, min(1.0, float(base_prob)))

        evidence = {
            "spectral_change": bool(abs(d_ndbi) >= 0.05 or abs(d_ndvi) >= 0.08),
            "ndbi_increase": bool(d_ndbi >= self.delta_ndbi_threshold),
            "ndvi_decrease": bool(d_ndvi <= self.delta_ndvi_threshold),
            "recent_built_signature": bool(rec_ndbi >= 0.0),
            "delta_ndbi": round(d_ndbi, 4),
            "delta_ndvi": round(d_ndvi, 4),
            "ndbi_score": round(ndbi_score, 4),
            "ndvi_score": round(ndvi_score, 4),
        }

        return base_prob, evidence
