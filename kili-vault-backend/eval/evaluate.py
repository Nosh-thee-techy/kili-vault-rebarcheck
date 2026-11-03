"""
Model Evaluation & Precision Validation Module
Computes precision, recall, F1 score, confusion matrix, and false-positive rates.
Enforces that the engine prioritizes PRECISION over recall for BUILDING_DEVELOPMENT.
"""

from typing import List, Dict, Any, Tuple
from detection.classification import CHANGE_CLASSES


class EvaluationMetrics:
    """Calculates classification performance metrics with an emphasis on precision."""

    def __init__(self, target_classes: List[str] = None):
        self.classes = target_classes or CHANGE_CLASSES

    def evaluate(
        self,
        y_true: List[str],
        y_pred: List[str],
    ) -> Dict[str, Any]:
        """
        Computes precision, recall, F1, and confusion matrix.
        y_true: Ground truth class labels
        y_pred: Predicted class labels
        """
        if len(y_true) != len(y_pred):
            raise ValueError(f"Length mismatch: y_true ({len(y_true)}) != y_pred ({len(y_pred)})")

        # Initialize confusion matrix: true_class -> pred_class -> count
        cm = {t: {p: 0 for p in self.classes} for t in self.classes}

        for true_label, pred_label in zip(y_true, y_pred):
            t = true_label if true_label in self.classes else "UNKNOWN"
            p = pred_label if pred_label in self.classes else "UNKNOWN"
            cm[t][p] += 1

        per_class = {}
        for c in self.classes:
            tp = cm[c][c]
            fp = sum(cm[other][c] for other in self.classes if other != c)
            fn = sum(cm[c][other] for other in self.classes if other != c)

            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

            per_class[c] = {
                "tp": tp,
                "fp": fp,
                "fn": fn,
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "f1": round(f1, 4),
            }

        # Overall accuracy
        total = len(y_true)
        correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
        overall_accuracy = round(correct / total, 4) if total > 0 else 0.0

        bld_metrics = per_class.get("BUILDING_DEVELOPMENT", {})

        return {
            "total_samples": total,
            "overall_accuracy": overall_accuracy,
            "building_development_precision": bld_metrics.get("precision", 0.0),
            "building_development_recall": bld_metrics.get("recall", 0.0),
            "per_class": per_class,
            "confusion_matrix": cm,
            "meets_precision_requirement": bld_metrics.get("precision", 0.0) >= 0.80,
        }
