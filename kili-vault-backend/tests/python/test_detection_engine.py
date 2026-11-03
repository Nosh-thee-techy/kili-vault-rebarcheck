"""
Kili-Vault Earth Observation Detection Engine: Unit Test Suite
Validates:
- Spectral indices (NDVI, NDBI, NDWI)
- Model A: Spectral Change Baseline
- Model B: Prithvi-EO foundation adapter and preprocessing
- Ensemble combination layer
- False-positive prevention and multi-class classification
- Confidence scoring and evidence attribution
- Spatial postprocessing and deduplication
- Evaluation metrics and precision requirements
"""

import unittest
from config.settings import parse_date, Settings
from gee.indices import (
    calculate_ndvi_numeric,
    calculate_ndbi_numeric,
    calculate_ndwi_numeric,
)
from models.baseline.spectral_change import SpectralChangeBaseline
from models.prithvi.model import PrithviModelAdapter, CHANGE_CLASSES, PRITHVI_BANDS
from models.prithvi.preprocessing import prepare_multitemporal_chip, normalize_band_value
from models.prithvi.inference import PrithviInferencePipeline
from models.prithvi.training import PrithviTrainer, DatasetNotFoundError
from models.ensemble.combine import EnsembleChangeClassifier
from detection.detector import EarthObservationDetector
from detection.classification import classify_change
from detection.confidence import calculate_detection_confidence
from detection.temporal import calculate_temporal_persistence
from detection.postprocess import (
    calculate_polygon_centroid,
    approximate_polygon_area_m2,
    generate_deduplication_hash,
    validate_and_close_polygon,
    postprocess_candidates,
)
from eval.evaluate import EvaluationMetrics


class TestDetectionEngine(unittest.TestCase):

    def test_parse_date_valid(self):
        dt = parse_date("2026-06-30", "TEST_DATE")
        self.assertEqual(dt.year, 2026)
        self.assertEqual(dt.month, 6)
        self.assertEqual(dt.day, 30)

    def test_parse_date_invalid(self):
        with self.assertRaises(ValueError):
            parse_date("30-06-2026", "TEST_DATE")
        with self.assertRaises(ValueError):
            parse_date("", "TEST_DATE")

    def test_spectral_indices_numeric(self):
        # Healthy vegetation: high NIR, low Red
        ndvi = calculate_ndvi_numeric(nir=0.45, red=0.08)
        self.assertTrue(0.60 <= ndvi <= 1.0)

        # Built structure: high SWIR1, moderate NIR
        ndbi = calculate_ndbi_numeric(swir1=0.35, nir=0.18)
        self.assertTrue(0.20 <= ndbi <= 1.0)

        # Water: high Green, low NIR
        ndwi = calculate_ndwi_numeric(green=0.25, nir=0.05)
        self.assertTrue(0.50 <= ndwi <= 1.0)

        # Zero denominator safety
        self.assertEqual(calculate_ndvi_numeric(0.0, 0.0), 0.0)

    def test_model_a_spectral_baseline(self):
        baseline = SpectralChangeBaseline()
        # High confidence development scenario: vegetation cleared, built up
        prob, evidence = baseline.predict_development_probability(
            ndvi_before=0.45,
            ndvi_after=0.10,
            ndbi_before=-0.15,
            ndbi_after=0.20,
        )
        self.assertTrue(prob >= 0.70)
        self.assertTrue(evidence["ndbi_increase"])
        self.assertTrue(evidence["ndvi_decrease"])
        self.assertTrue(evidence["recent_built_signature"])

        # Clearing scenario: vegetation dropped but no built NDBI increase
        prob_clearing, ev_clearing = baseline.predict_development_probability(
            ndvi_before=0.45,
            ndvi_after=0.12,
            ndbi_before=-0.20,
            ndbi_after=-0.15,
        )
        self.assertTrue(prob_clearing < 0.30)
        self.assertFalse(ev_clearing["ndbi_increase"])

    def test_model_b_prithvi_adapter_integrity(self):
        adapter = PrithviModelAdapter(weights_path="non_existent_weights.pt")
        status = adapter.get_status()
        self.assertFalse(status["is_loaded"])
        self.assertIn("Prithvi pretrained weights not found",
                      status["error_or_requirement"])
        self.assertEqual(status["required_bands"], PRITHVI_BANDS)

        pipeline = PrithviInferencePipeline(adapter)
        res = pipeline.predict_chip({}, {})
        self.assertFalse(res["available"])
        self.assertIsNone(res["probability"])
        self.assertEqual(res["predicted_class"], "UNKNOWN")

    def test_detector_preserves_unavailable_prithvi_evidence(self):
        detector = EarthObservationDetector(
            prithvi_pipeline=PrithviInferencePipeline(
                PrithviModelAdapter(weights_path="non_existent_weights.pt")
            )
        )
        result = detector.evaluate_candidate(
            polygon_coords=[[36.75, -1.29], [36.751, -1.29],
                            [36.751, -1.291], [36.75, -1.29]],
            ndvi_before=0.35,
            ndvi_after=0.10,
            ndbi_before=-0.15,
            ndbi_after=0.15,
            t1_bands={"B2": 0.12, "B3": 0.14, "B4": 0.15,
                      "B8A": 0.28, "B11": 0.22, "B12": 0.16},
            t2_bands={"B2": 0.13, "B3": 0.15, "B4": 0.18,
                      "B8A": 0.20, "B11": 0.29, "B12": 0.21},
        )
        self.assertFalse(result["evidence"]["prithvi"]["available"])
        self.assertEqual(result["evidence"]["prithvi"]
                         ["predicted_class"], "UNKNOWN")
        self.assertIsNone(result["prithvi_probability"])

    def test_prithvi_preprocessing_and_training_guard(self):
        t1 = {"B2": 0.12, "B3": 0.14, "B4": 0.15,
              "B8A": 0.28, "B11": 0.22, "B12": 0.16}
        t2 = {"B2": 0.13, "B3": 0.15, "B4": 0.18,
              "B8A": 0.20, "B11": 0.29, "B12": 0.21}
        chip = prepare_multitemporal_chip(t1, t2)
        self.assertEqual(len(chip["t1_normalized"]), 6)
        self.assertEqual(len(chip["t2_normalized"]), 6)

        trainer = PrithviTrainer(data_dir="data/non_existent_empty_dir")
        with self.assertRaises(DatasetNotFoundError):
            trainer.train()

    def test_ensemble_combination(self):
        ensemble = EnsembleChangeClassifier(
            weight_baseline=0.50, weight_prithvi=0.30, weight_persistence=0.20)
        # Both models active
        comb_prob, ev = ensemble.combine_probabilities(
            baseline_prob=0.80,
            prithvi_prob=0.70,
            temporal_persistence=0.90,
            spectral_evidence={"ndbi_increase": True},
        )
        self.assertTrue(0.70 <= comb_prob <= 0.85)
        self.assertTrue(ev["prithvi_active"])

        # Prithvi awaiting weights
        comb_offline, ev_offline = ensemble.combine_probabilities(
            baseline_prob=0.80,
            prithvi_prob=None,
            temporal_persistence=0.90,
            spectral_evidence={"ndbi_increase": True},
        )
        self.assertFalse(ev_offline["prithvi_active"])
        self.assertTrue(comb_offline >= 0.75)

    def test_false_positive_prevention_classification(self):
        # 1. Linear Infrastructure: Aspect ratio >= 3.2 must be INFRASTRUCTURE_CHANGE, NOT building
        c_road, ev_road = classify_change(
            delta_ndbi=0.25,
            delta_ndvi=-0.20,
            recent_ndbi=0.20,
            recent_ndvi=0.10,
            area_m2=1200.0,
            aspect_ratio=4.5,
            confidence=0.80,
        )
        self.assertEqual(c_road, "INFRASTRUCTURE_CHANGE")
        self.assertFalse(ev_road["is_building"])

        # 2. Bare Soil / Clearing: Negative recent NDBI must be LAND_CLEARING
        c_clear, ev_clear = classify_change(
            delta_ndbi=0.04,
            delta_ndvi=-0.30,
            recent_ndbi=-0.12,
            recent_ndvi=0.15,
            area_m2=500.0,
            aspect_ratio=1.1,
            confidence=0.65,
        )
        self.assertEqual(c_clear, "LAND_CLEARING")
        self.assertFalse(ev_clear["is_building"])

        # 3. Building Development: Multi-signal conjunction
        c_bld, ev_bld = classify_change(
            delta_ndbi=0.22,
            delta_ndvi=-0.25,
            recent_ndbi=0.18,
            recent_ndvi=0.12,
            area_m2=750.0,
            aspect_ratio=1.2,
            confidence=0.85,
            temporal_persistence=0.90,
        )
        self.assertEqual(c_bld, "BUILDING_DEVELOPMENT")
        self.assertTrue(ev_bld["is_building"])

    def test_spatial_postprocessing_and_deduplication(self):
        poly = [[36.782, -1.291], [36.783, -1.291],
                [36.783, -1.292], [36.782, -1.292]]
        closed = validate_and_close_polygon(poly)
        self.assertEqual(closed[0], closed[-1])

        lon, lat = calculate_polygon_centroid(closed)
        self.assertTrue(36.782 <= lon <= 36.783)
        self.assertTrue(-1.292 <= lat <= -1.291)

        area = approximate_polygon_area_m2(closed)
        self.assertTrue(area > 100.0)

        hash1 = generate_deduplication_hash(36.78201, -1.29101)
        hash2 = generate_deduplication_hash(36.78203, -1.29103)
        # Should snap to the same ~20m grid cell
        self.assertEqual(hash1, hash2)

    def test_evaluation_metrics(self):
        evaluator = EvaluationMetrics()
        y_true = [
            "BUILDING_DEVELOPMENT",
            "BUILDING_DEVELOPMENT",
            "INFRASTRUCTURE_CHANGE",
            "LAND_CLEARING",
            "VEGETATION_CHANGE",
        ]
        y_pred = [
            "BUILDING_DEVELOPMENT",
            "BUILDING_DEVELOPMENT",
            "INFRASTRUCTURE_CHANGE",
            "LAND_CLEARING",
            "VEGETATION_CHANGE",
        ]
        metrics = evaluator.evaluate(y_true, y_pred)
        self.assertEqual(metrics["overall_accuracy"], 1.0)
        self.assertEqual(metrics["building_development_precision"], 1.0)
        self.assertTrue(metrics["meets_precision_requirement"])


if __name__ == "__main__":
    unittest.main()
