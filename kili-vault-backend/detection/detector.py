"""
Kili-Vault Earth Observation Detector
Integrates spectral baseline, Prithvi-EO adapter, ensemble layer, false-positive filtering,
confidence scoring, and post-processing into a cohesive detection engine.
"""

from typing import Dict, Any, List, Optional
from config.settings import settings
from models.baseline.spectral_change import SpectralChangeBaseline
from models.prithvi.model import PrithviModelAdapter
from models.prithvi.inference import PrithviInferencePipeline
from models.ensemble.combine import EnsembleChangeClassifier
from detection.classification import classify_change
from detection.confidence import calculate_detection_confidence
from detection.temporal import calculate_temporal_persistence
from detection.postprocess import postprocess_candidates, calculate_polygon_centroid, approximate_polygon_area_m2


class EarthObservationDetector:
    """Production detection engine coordinator."""

    def __init__(
        self,
        baseline_model: Optional[SpectralChangeBaseline] = None,
        prithvi_pipeline: Optional[PrithviInferencePipeline] = None,
        ensemble_model: Optional[EnsembleChangeClassifier] = None,
    ):
        self.baseline = baseline_model or SpectralChangeBaseline(
            delta_ndbi_threshold=settings.delta_ndbi_threshold,
            delta_ndvi_threshold=settings.delta_ndvi_threshold,
        )
        self.prithvi = prithvi_pipeline or PrithviInferencePipeline(
            PrithviModelAdapter(
                weights_path=settings.prithvi_weights_path,
                checkpoint_path=settings.prithvi_checkpoint_path,
                config_path=settings.prithvi_config_path,
            )
        )
        self.ensemble = ensemble_model or EnsembleChangeClassifier(
            weight_baseline=settings.weight_baseline,
            weight_prithvi=settings.weight_prithvi,
            weight_persistence=settings.weight_persistence,
        )
        self.model_version = settings.model_version

    def evaluate_candidate(
        self,
        polygon_coords: List[List[float]],
        ndvi_before: float,
        ndvi_after: float,
        ndbi_before: float,
        ndbi_after: float,
        valid_observations: int = 5,
        observation_history: Optional[List[bool]] = None,
        t1_bands: Optional[Dict[str, float]] = None,
        t2_bands: Optional[Dict[str, float]] = None,
        aspect_ratio: float = 1.2,
    ) -> Dict[str, Any]:
        """Processes a single candidate site through the complete multi-stage model stack."""
        area_m2 = approximate_polygon_area_m2(polygon_coords)

        # 1. Model A: Spectral Change Baseline
        base_prob, base_evidence = self.baseline.predict_development_probability(
            ndvi_before, ndvi_after, ndbi_before, ndbi_after
        )

        # 2. Model B: Prithvi-EO Foundation Model Representation
        prithvi_prob = None
        prithvi_evidence = {
            "available": False,
            "probability": None,
            "predicted_class": "UNKNOWN",
            "reason": "Prithvi inference was not requested because input bands are unavailable.",
        }
        if t1_bands and t2_bands:
            prithvi_res = self.prithvi.predict_chip(t1_bands, t2_bands)
            prithvi_evidence = {
                "available": bool(prithvi_res.get("available")),
                "probability": prithvi_res.get("probability"),
                "predicted_class": prithvi_res.get("predicted_class", "UNKNOWN"),
                "reason": prithvi_res.get("reason"),
            }
            if prithvi_res.get("available"):
                prithvi_prob = prithvi_res.get("probability")

        # 3. Temporal Persistence
        temporal_persistence = calculate_temporal_persistence(
            observation_history or [True, True, True])

        # 4. Ensemble Combination
        combined_prob, ensemble_evidence = self.ensemble.combine_probabilities(
            baseline_prob=base_prob,
            prithvi_prob=prithvi_prob,
            temporal_persistence=temporal_persistence,
            spectral_evidence=base_evidence,
        )

        # 5. Multi-factor Confidence & Evidence
        d_ndbi = ndbi_after - ndbi_before
        d_ndvi = ndvi_after - ndvi_before
        confidence, evidence = calculate_detection_confidence(
            delta_ndbi=d_ndbi,
            delta_ndvi=d_ndvi,
            baseline_prob=base_prob,
            prithvi_prob=prithvi_prob,
            temporal_persistence=temporal_persistence,
            valid_observations=valid_observations,
            area_m2=area_m2,
            aspect_ratio=aspect_ratio,
        )

        # 6. Strict Multi-class Categorization & False-Positive Prevention
        change_type, class_evidence = classify_change(
            delta_ndbi=d_ndbi,
            delta_ndvi=d_ndvi,
            recent_ndbi=ndbi_after,
            recent_ndvi=ndvi_after,
            area_m2=area_m2,
            aspect_ratio=aspect_ratio,
            confidence=confidence,
            temporal_persistence=temporal_persistence,
            min_confidence_threshold=settings.minimum_detection_threshold,
        )

        # Enrich evidence dictionary
        evidence.update(class_evidence)
        evidence["ensemble"] = ensemble_evidence
        evidence["prithvi"] = prithvi_evidence

        return {
            "geometry": {"type": "Polygon", "coordinates": [polygon_coords]},
            "change_type": change_type,
            "confidence": confidence,
            "baseline_probability": round(base_prob, 4),
            "prithvi_probability": round(prithvi_prob, 4) if prithvi_prob is not None else None,
            "ndbi_change": round(d_ndbi, 4),
            "ndvi_change": round(d_ndvi, 4),
            "temporal_persistence": round(temporal_persistence, 4),
            "area_m2": area_m2,
            "model_version": self.model_version,
            "evidence": evidence,
        }

    def detect_batch(self, raw_candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Processes a collection of candidate sites through the complete pipeline."""
        evaluated = []
        for c in raw_candidates:
            poly = c.get("coordinates", [])
            res = self.evaluate_candidate(
                polygon_coords=poly,
                ndvi_before=c.get("ndvi_before", 0.35),
                ndvi_after=c.get("ndvi_after", 0.10),
                ndbi_before=c.get("ndbi_before", -0.15),
                ndbi_after=c.get("ndbi_after", 0.15),
                valid_observations=c.get("valid_observations", 5),
                observation_history=c.get("observation_history"),
                t1_bands=c.get("t1_bands"),
                t2_bands=c.get("t2_bands"),
                aspect_ratio=c.get("aspect_ratio", 1.2),
            )
            evaluated.append(res)

        # Spatial post-processing & deduplication
        sanitized = postprocess_candidates(
            evaluated,
            min_confidence=settings.minimum_detection_threshold,
            min_area_m2=settings.min_candidate_area_m2,
            max_area_m2=settings.max_candidate_area_m2,
        )
        return sanitized
