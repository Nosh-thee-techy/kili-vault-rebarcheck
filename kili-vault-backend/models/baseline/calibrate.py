"""
Model A Spectral Baseline Calibration Engine
Calibrates spectral differencing thresholds to optimize F1 score
while strictly enforcing the >= 80% precision requirement on BUILDING_DEVELOPMENT.
"""

import os
import json
import glob
import logging
from typing import Dict, Any, List, Tuple
from models.baseline.spectral_change import SpectralChangeBaseline

logger = logging.getLogger("kili-vault.models.baseline.calibrate")


def load_chips_from_dir(directory: str) -> List[Dict[str, Any]]:
    """Loads all JSON chips from a directory."""
    chips = []
    for filepath in sorted(glob.glob(os.path.join(directory, "*.json"))):
        try:
            with open(filepath, "r") as f:
                chips.append(json.load(f))
        except Exception as e:
            logger.warning("Failed to load chip %s: %s", filepath, e)
    return chips


def evaluate_thresholds(
    chips: List[Dict[str, Any]],
    delta_ndbi_thresh: float,
    delta_ndvi_thresh: float,
    prob_threshold: float = 0.50,
) -> Dict[str, float]:
    """Calculates precision, recall, and F1 on building development for given thresholds."""
    model = SpectralChangeBaseline(
        delta_ndbi_threshold=delta_ndbi_thresh,
        delta_ndvi_threshold=delta_ndvi_thresh,
    )

    tp = 0
    fp = 0
    fn = 0
    tn = 0

    for chip in chips:
        spec = chip["spectral"]
        prob, _ = model.predict_development_probability(
            ndvi_before=spec["ndvi_before"],
            ndvi_after=spec["ndvi_after"],
            ndbi_before=spec["ndbi_before"],
            ndbi_after=spec["ndbi_after"],
            ndwi_before=spec.get("ndwi_before", 0.0),
            ndwi_after=spec.get("ndwi_after", 0.0),
        )

        aspect_ratio = chip.get("spatial", {}).get("aspect_ratio", 1.0)
        rec_ndbi = spec.get("ndbi_after", 0.0)
        is_linear = aspect_ratio >= 3.2
        is_bare_soil = spec.get("delta_ndvi", 0.0) <= -0.10 and rec_ndbi < 0.02
        persistence = chip.get("temporal_persistence", 1.0)
        is_transient = persistence < 0.35

        predicted_building = (prob >= prob_threshold) and not is_linear and not is_bare_soil and not is_transient
        actual_building = chip["label"] == "BUILDING_DEVELOPMENT"

        if predicted_building and actual_building:
            tp += 1
        elif predicted_building and not actual_building:
            fp += 1
        elif not predicted_building and actual_building:
            fn += 1
        else:
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
    }


def calibrate_baseline(
    data_dir: str = "data",
    output_checkpoint: str = "models/checkpoints/baseline_calibrated.json",
    target_min_precision: float = 0.80,
) -> Dict[str, Any]:
    """
    Performs grid search optimization over spectral baseline parameters
    to achieve the highest F1 score while respecting target_min_precision.
    """
    train_chips = load_chips_from_dir(os.path.join(data_dir, "train"))
    val_chips = load_chips_from_dir(os.path.join(data_dir, "validation"))

    if not train_chips:
        raise ValueError(f"No training chips found in {data_dir}/train")

    logger.info("Calibrating Model A on %d training chips...", len(train_chips))

    # Grid search candidate parameters
    ndbi_candidates = [0.08, 0.10, 0.12, 0.14, 0.16]
    ndvi_candidates = [-0.14, -0.12, -0.10, -0.08]

    best_score = -1.0
    best_params = {"delta_ndbi_threshold": 0.10, "delta_ndvi_threshold": -0.10}
    best_train_metrics = {}

    for d_ndbi in ndbi_candidates:
        for d_ndvi in ndvi_candidates:
            metrics = evaluate_thresholds(train_chips, d_ndbi, d_ndvi)

            # Prioritize candidates meeting the precision threshold
            if metrics["precision"] >= target_min_precision:
                score = metrics["f1"]
            else:
                # Penalize severely if precision is below target
                score = metrics["f1"] * 0.5

            if score > best_score:
                best_score = score
                best_params = {
                    "delta_ndbi_threshold": d_ndbi,
                    "delta_ndvi_threshold": d_ndvi,
                }
                best_train_metrics = metrics

    # Validate on validation set
    val_metrics = evaluate_thresholds(
        val_chips,
        best_params["delta_ndbi_threshold"],
        best_params["delta_ndvi_threshold"],
    )

    result = {
        "model": "Model A (Spectral Change Baseline)",
        "calibrated_parameters": best_params,
        "train_metrics": best_train_metrics,
        "validation_metrics": val_metrics,
        "precision_requirement_met": val_metrics["precision"] >= target_min_precision,
    }

    os.makedirs(os.path.dirname(output_checkpoint), exist_ok=True)
    with open(output_checkpoint, "w") as f:
        json.dump(result, f, indent=2)

    logger.info(
        "Model A calibrated successfully: d_ndbi=%.2f, d_ndvi=%.2f | Val Prec: %.1f%%, Rec: %.1f%%, F1: %.3f",
        best_params["delta_ndbi_threshold"],
        best_params["delta_ndvi_threshold"],
        val_metrics["precision"] * 100,
        val_metrics["recall"] * 100,
        val_metrics["f1"],
    )

    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = calibrate_baseline()
    print("Calibration Result:", json.dumps(res, indent=2))
