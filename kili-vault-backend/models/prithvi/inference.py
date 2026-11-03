"""
Prithvi-EO Inference Module
Performs multi-temporal inference using the Prithvi foundation model adapter and
task-specific development change detection head.
"""

from typing import Dict, Any, Optional
from models.prithvi.model import PrithviModelAdapter, CHANGE_CLASSES
from models.prithvi.preprocessing import prepare_multitemporal_chip


class PrithviInferencePipeline:
    """Inference wrapper for Prithvi-EO change detection."""

    def __init__(self, adapter: Optional[PrithviModelAdapter] = None):
        self.adapter = adapter or PrithviModelAdapter()

    def predict_chip(
        self,
        t1_bands: Dict[str, float],
        t2_bands: Dict[str, float],
    ) -> Dict[str, Any]:
        """
        Runs multi-temporal change inference on a Sentinel-2 chip.
        If weights are not present, explicitly fails or returns unavailable status.
        Never fabricates predictions.
        """
        status = self.adapter.get_status()
        if not status["is_loaded"]:
            return {
                "available": False,
                "reason": status["error_or_requirement"],
                "probability": None,
                "predicted_class": "UNKNOWN",
                "class_probabilities": None,
            }

        chip = prepare_multitemporal_chip(t1_bands, t2_bands)
        features = self.adapter.extract_features(
            chip["t1_normalized"], chip["t2_normalized"]
        )
        midpoint = max(1, len(features) // 2)
        features_t1 = features[:midpoint]
        features_t2 = features[midpoint:] or features_t1
        probs = self.adapter.head.forward_logits(features_t1, features_t2)
        top_class = max(probs, key=probs.get)

        return {
            "available": True,
            "probability": probs.get("BUILDING_DEVELOPMENT", 0.0),
            "predicted_class": top_class,
            "class_probabilities": probs,
        }
