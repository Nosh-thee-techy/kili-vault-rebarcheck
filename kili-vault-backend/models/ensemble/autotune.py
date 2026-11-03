"""
Ensemble Hyperparameter & Weight Tuning Engine
Optimizes probability combination weights across Model A, Model B,
and temporal persistence to maximize detection accuracy and stability.
"""

import os
import json
import glob
import logging
from typing import Dict, Any, List, Tuple
from models.baseline.spectral_change import SpectralChangeBaseline
from models.prithvi.model import PrithviModelAdapter
from models.prithvi.training import _extract_feature_vector
from models.ensemble.combine import EnsembleChangeClassifier

logger = logging.getLogger("kili-vault.models.ensemble.autotune")


def tune_ensemble_weights(
    data_dir: str = "data",
    output_checkpoint: str = "models/checkpoints/ensemble_config.json",
    target_min_precision: float = 0.80,
) -> Dict[str, Any]:
    """
    Evaluates candidate weight combinations on validation data
    to identify the highest-performing ensemble configuration.
    """
    val_files = sorted(glob.glob(os.path.join(data_dir, "validation", "*.json")))
    if not val_files:
        raise ValueError(f"No validation chips found in {data_dir}/validation")

    val_chips = []
    for p in val_files:
        with open(p, "r") as f:
            val_chips.append(json.load(f))

    # Initialize sub-models
    baseline_model = SpectralChangeBaseline()
    prithvi_adapter = PrithviModelAdapter()

    # Precompute sub-model predictions for all validation chips
    prepared = []
    for chip in val_chips:
        spec = chip["spectral"]
        p_base, base_ev = baseline_model.predict_development_probability(
            ndvi_before=spec["ndvi_before"],
            ndvi_after=spec["ndvi_after"],
            ndbi_before=spec["ndbi_before"],
            ndbi_after=spec["ndbi_after"],
            ndwi_before=spec.get("ndwi_before", 0.0),
            ndwi_after=spec.get("ndwi_after", 0.0),
        )

        # Get Prithvi probability for building development
        if prithvi_adapter.is_loaded:
            feat = _extract_feature_vector(chip)
            half = len(feat) // 2
            probs_dict = prithvi_adapter.head.forward_logits(feat[:half], feat[half:])
            p_prithvi = probs_dict.get("BUILDING_DEVELOPMENT", 0.05)
        else:
            p_prithvi = None

        persistence = chip.get("temporal_persistence", 0.90)
        is_building = chip.get("label") == "BUILDING_DEVELOPMENT"
        aspect_ratio = chip.get("spatial", {}).get("aspect_ratio", 1.0)
        rec_ndbi = spec.get("ndbi_after", 0.0)

        prepared.append({
            "p_base": p_base,
            "p_prithvi": p_prithvi,
            "persistence": persistence,
            "base_ev": base_ev,
            "is_building": is_building,
            "aspect_ratio": aspect_ratio,
            "rec_ndbi": rec_ndbi,
        })

    # Search space for weights
    candidates = [
        (0.50, 0.30, 0.20),
        (0.60, 0.25, 0.15),
        (0.45, 0.35, 0.20),
        (0.55, 0.30, 0.15),
        (0.40, 0.40, 0.20),
        (0.70, 0.15, 0.15),
    ]

    best_score = -1.0
    best_weights = candidates[0]
    best_metrics = {}

    for w_base, w_prith, w_pers in candidates:
        ensemble = EnsembleChangeClassifier(
            weight_baseline=w_base,
            weight_prithvi=w_prith,
            weight_persistence=w_pers,
        )

        tp = fp = fn = tn = 0
        for item in prepared:
            score, _ = ensemble.combine_probabilities(
                baseline_prob=item["p_base"],
                prithvi_prob=item["p_prithvi"],
                temporal_persistence=item["persistence"],
                spectral_evidence=item["base_ev"],
            )
            is_linear = item["aspect_ratio"] >= 3.2
            is_bare_soil = item["rec_ndbi"] < 0.02
            is_transient = item["persistence"] < 0.35

            pred_building = (score >= 0.50) and not is_linear and not is_bare_soil and not is_transient
            actual_building = item["is_building"]

            if pred_building and actual_building:
                tp += 1
            elif pred_building and not actual_building:
                fp += 1
            elif not pred_building and actual_building:
                fn += 1
            else:
                tn += 1

        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

        criterion = f1 if prec >= target_min_precision else f1 * 0.5
        if criterion > best_score:
            best_score = criterion
            best_weights = (w_base, w_prith, w_pers)
            best_metrics = {
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1": round(f1, 4),
                "tp": tp,
                "fp": fp,
                "fn": fn,
            }

    result = {
        "model": "Ensemble Change Classifier",
        "weights": {
            "baseline": best_weights[0],
            "prithvi": best_weights[1],
            "persistence": best_weights[2],
        },
        "validation_metrics": best_metrics,
        "precision_requirement_met": best_metrics.get("precision", 0.0) >= target_min_precision,
    }

    os.makedirs(os.path.dirname(output_checkpoint), exist_ok=True)
    with open(output_checkpoint, "w") as f:
        json.dump(result, f, indent=2)

    logger.info(
        "Ensemble weights auto-tuned: baseline=%.2f, prithvi=%.2f, persistence=%.2f | Val Prec: %.1f%%, F1: %.3f",
        best_weights[0],
        best_weights[1],
        best_weights[2],
        best_metrics.get("precision", 0.0) * 100,
        best_metrics.get("f1", 0.0),
    )

    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = tune_ensemble_weights()
    print("Auto-tune result:", json.dumps(res, indent=2))
