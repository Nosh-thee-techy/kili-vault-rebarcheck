"""
Kili-Vault Detection Engine: Configuration & Settings
Centralized configuration loaded from environment variables.
No hardcoded coordinates, thresholds, or credentials.
"""

import os
import re
import json
from datetime import datetime
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


def parse_date(date_str: str, var_name: str) -> datetime:
    """Validates and parses YYYY-MM-DD date format."""
    if not date_str:
        raise ValueError(f"Missing required date variable: {var_name}")
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
        raise ValueError(
            f"Invalid date format for {var_name} ('{date_str}'). Expected YYYY-MM-DD")
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError as e:
        raise ValueError(
            f"Invalid calendar date for {var_name} ('{date_str}'): {str(e)}")


class Settings:
    """Detection engine settings container."""

    def __init__(self):
        # 1. Earth Engine & Cloud Platform
        self.gee_project_id = os.getenv("GEE_PROJECT_ID", "")
        self.gee_service_account_email = os.getenv(
            "GEE_SERVICE_ACCOUNT_EMAIL", "")
        self.gee_service_account_key_path = os.getenv(
            "GEE_SERVICE_ACCOUNT_KEY_PATH", "")

        # 2. Area of Interest (AOI) - Configurable, not hardcoded
        self.aoi_name = os.getenv("AOI_NAME", "Kilimani Ward, Nairobi")
        self.aoi_geojson_path = os.getenv(
            "AOI_GEOJSON_PATH", "config/kilimani_ward.geojson")
        self.aoi_asset = os.getenv("GEE_AOI_ASSET", "")

        # 3. Multi-temporal Sentinel-2 Observation Windows
        self.baseline_start_str = os.getenv(
            "BASELINE_START_DATE", "2025-01-01")
        self.baseline_end_str = os.getenv("BASELINE_END_DATE", "2025-06-30")
        self.recent_start_str = os.getenv("RECENT_START_DATE", "2026-01-01")
        self.recent_end_str = os.getenv("RECENT_END_DATE", "2026-06-30")

        self.baseline_start = parse_date(
            self.baseline_start_str, "BASELINE_START_DATE")
        self.baseline_end = parse_date(
            self.baseline_end_str, "BASELINE_END_DATE")
        self.recent_start = parse_date(
            self.recent_start_str, "RECENT_START_DATE")
        self.recent_end = parse_date(self.recent_end_str, "RECENT_END_DATE")

        if self.baseline_start >= self.baseline_end:
            raise ValueError(
                f"BASELINE_START_DATE ({self.baseline_start_str}) must precede BASELINE_END_DATE ({self.baseline_end_str})"
            )
        if self.recent_start >= self.recent_end:
            raise ValueError(
                f"RECENT_START_DATE ({self.recent_start_str}) must precede RECENT_END_DATE ({self.recent_end_str})"
            )

        # 4. Sentinel-2 Quality & Filtering
        self.cloud_threshold = float(os.getenv("S2_CLOUD_THRESHOLD", "20.0"))
        if not (0.0 <= self.cloud_threshold <= 100.0):
            raise ValueError(
                f"S2_CLOUD_THRESHOLD must be between 0 and 100, got: {self.cloud_threshold}")

        self.min_valid_observations = int(
            os.getenv("MIN_VALID_OBSERVATIONS", "3"))
        self.spatial_resolution_meters = float(
            os.getenv("SPATIAL_RESOLUTION_METERS", "10.0"))

        # 5. Patch & Minimum Mapping Unit Limits (m^2)
        self.min_candidate_area_m2 = float(
            os.getenv("MIN_CANDIDATE_AREA_M2", "100.0"))
        self.max_candidate_area_m2 = float(
            os.getenv("MAX_CANDIDATE_AREA_M2", "50000.0"))
        if self.min_candidate_area_m2 <= 0 or self.max_candidate_area_m2 <= self.min_candidate_area_m2:
            raise ValueError(
                "Invalid candidate area range: min must be > 0 and max must exceed min")

        # 6. Spectral Change Thresholds (Model A Baseline)
        self.delta_ndbi_threshold = float(
            os.getenv("DELTA_NDBI_THRESHOLD", "0.10"))
        self.delta_ndvi_threshold = float(
            os.getenv("DELTA_NDVI_THRESHOLD", "-0.10"))

        # 7. Confidence & Decision Thresholds
        self.high_confidence_threshold = float(
            os.getenv("HIGH_CONFIDENCE_THRESHOLD", "0.80"))
        self.medium_confidence_threshold = float(
            os.getenv("MEDIUM_CONFIDENCE_THRESHOLD", "0.60"))
        self.minimum_detection_threshold = float(
            os.getenv("MINIMUM_DETECTION_THRESHOLD", "0.40"))

        # 8. Model Weights for Ensemble Combination Layer
        self.weight_baseline = float(
            os.getenv("ENSEMBLE_WEIGHT_BASELINE", "0.50"))
        self.weight_prithvi = float(
            os.getenv("ENSEMBLE_WEIGHT_PRITHVI", "0.30"))
        self.weight_persistence = float(
            os.getenv("ENSEMBLE_WEIGHT_PERSISTENCE", "0.20"))

        # 9. Model & Prithvi-EO Paths
        self.model_version = os.getenv("MODEL_VERSION", "kili-vault-dev-v0.1")
        self.prithvi_weights_path = os.getenv(
            "PRITHVI_WEIGHTS_PATH", "models/prithvi/Prithvi_EO_V2_300M_TL.pt")
        self.prithvi_checkpoint_path = os.getenv(
            "PRITHVI_CHECKPOINT_PATH", "models/checkpoints/prithvi_change_head.json")
        self.prithvi_config_path = os.getenv(
            "PRITHVI_CONFIG_PATH", "models/prithvi/config.yaml")

    def load_aoi_geojson(self) -> Dict[str, Any]:
        """Loads and validates the AOI GeoJSON from configured path."""
        if not os.path.exists(self.aoi_geojson_path):
            raise FileNotFoundError(
                f"AOI GeoJSON file not found at path: {self.aoi_geojson_path}")
        with open(self.aoi_geojson_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if "type" not in data or ("features" not in data and "geometry" not in data and "coordinates" not in data):
            raise ValueError(
                f"Invalid GeoJSON structure in {self.aoi_geojson_path}")
        return data

    def to_dict(self) -> Dict[str, Any]:
        return {
            "aoi_name": self.aoi_name,
            "aoi_geojson_path": self.aoi_geojson_path,
            "baseline_start": self.baseline_start_str,
            "baseline_end": self.baseline_end_str,
            "recent_start": self.recent_start_str,
            "recent_end": self.recent_end_str,
            "cloud_threshold": self.cloud_threshold,
            "min_valid_observations": self.min_valid_observations,
            "spatial_resolution_meters": self.spatial_resolution_meters,
            "min_candidate_area_m2": self.min_candidate_area_m2,
            "max_candidate_area_m2": self.max_candidate_area_m2,
            "delta_ndbi_threshold": self.delta_ndbi_threshold,
            "delta_ndvi_threshold": self.delta_ndvi_threshold,
            "high_confidence_threshold": self.high_confidence_threshold,
            "medium_confidence_threshold": self.medium_confidence_threshold,
            "minimum_detection_threshold": self.minimum_detection_threshold,
            "weight_baseline": self.weight_baseline,
            "weight_prithvi": self.weight_prithvi,
            "weight_persistence": self.weight_persistence,
            "model_version": self.model_version,
            "prithvi_weights_path": self.prithvi_weights_path,
        }


# Singleton instance
settings = Settings()
