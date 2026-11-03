"""
Combined Ensemble Model
Integrates Model A (Interpretable Spectral Change Baseline), Model B (Prithvi-EO),
and multi-temporal persistence into a unified development-change confidence score.
"""

from typing import Dict, Any, Optional, Tuple


class EnsembleChangeClassifier:
    """
    Combines spectral baseline probabilities, foundation model representations,
    and temporal persistence into a robust final prediction.
    All component weights are strictly configurable.
    """

    def __init__(
        self,
        weight_baseline: float = 0.50,
        weight_prithvi: float = 0.30,
        weight_persistence: float = 0.20,
    ):
        self.w_baseline = float(weight_baseline)
        self.w_prithvi = float(weight_prithvi)
        self.w_persistence = float(weight_persistence)

        # Normalize weights so sum equals 1.0
        total = self.w_baseline + self.w_prithvi + self.w_persistence
        if total > 0:
            self.w_baseline /= total
            self.w_prithvi /= total
            self.w_persistence /= total

    def combine_probabilities(
        self,
        baseline_prob: float,
        prithvi_prob: Optional[float] = None,
        temporal_persistence: float = 1.0,
        spectral_evidence: Optional[Dict[str, Any]] = None,
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Computes the weighted combined probability.
        If Prithvi is unavailable (awaiting weights), dynamically rescales baseline and persistence weights.
        """
        spectral_ev = spectral_evidence or {}
        p_base = max(0.0, min(1.0, float(baseline_prob)))
        p_pers = max(0.0, min(1.0, float(temporal_persistence)))

        if prithvi_prob is not None:
            p_prithvi = max(0.0, min(1.0, float(prithvi_prob)))
            eff_w_baseline = self.w_baseline
            eff_w_prithvi = self.w_prithvi
            eff_w_persistence = self.w_persistence
            raw_combined = (
                (eff_w_baseline * p_base)
                + (eff_w_prithvi * p_prithvi)
                + (eff_w_persistence * p_pers)
            )
            prithvi_active = True
        else:
            # Rebalance weights between baseline and persistence
            sub_total = self.w_baseline + self.w_persistence
            eff_w_baseline = self.w_baseline / sub_total if sub_total > 0 else 0.70
            eff_w_prithvi = 0.0
            eff_w_persistence = self.w_persistence / sub_total if sub_total > 0 else 0.30
            raw_combined = (eff_w_baseline * p_base) + (eff_w_persistence * p_pers)
            p_prithvi = None
            prithvi_active = False

        # False-positive guard: If NDBI did not increase at all, suppress building probability
        if spectral_ev.get("ndbi_increase") is False and raw_combined > 0.40:
            combined_prob = raw_combined * 0.45
        else:
            combined_prob = raw_combined

        combined_prob = round(max(0.0, min(1.0, float(combined_prob))), 4)

        ensemble_evidence = {
            "baseline_probability": round(p_base, 4),
            "prithvi_probability": round(p_prithvi, 4) if p_prithvi is not None else None,
            "prithvi_active": prithvi_active,
            "temporal_persistence": round(p_pers, 4),
            "weights_used": {
                "baseline": round(eff_w_baseline, 3),
                "prithvi": round(eff_w_prithvi, 3),
                "persistence": round(eff_w_persistence, 3),
            },
        }

        return combined_prob, ensemble_evidence
