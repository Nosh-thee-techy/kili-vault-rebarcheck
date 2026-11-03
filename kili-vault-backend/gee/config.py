"""
Kili-Vault Earth Engine: Configuration & Validation Module
Loads and strictly validates all remote sensing parameters from environment variables.
"""

import os
import re
from datetime import datetime
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()


def parse_date(date_str: str, var_name: str) -> datetime:
    """Validates YYYY-MM-DD date format."""
    if not date_str:
        raise ValueError(f"Missing required environment variable: {var_name}")
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
        raise ValueError(
            f"Invalid date format for {var_name} ('{date_str}'). Expected YYYY-MM-DD")
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError as e:
        raise ValueError(
            f"Invalid calendar date for {var_name} ('{date_str}'): {str(e)}")


class GEEConfig:
    def __init__(self):
        # Authentication
        self.project_id = os.getenv("GEE_PROJECT_ID", "")
        self.service_account_email = os.getenv("GEE_SERVICE_ACCOUNT_EMAIL", "")
        self.service_account_key_path = os.getenv(
            "GEE_SERVICE_ACCOUNT_KEY_PATH", "")

        # Area of Interest (AOI)
        self.aoi_asset = os.getenv("GEE_AOI_ASSET", "")
        self.aoi_geojson_path = os.getenv(
            "AOI_GEOJSON_PATH", "config/kilimani_ward.geojson")

        # Sentinel-2 Temporal Windows
        self.baseline_start_str = os.getenv(
            "BASELINE_START_DATE", "2025-01-01")
        self.baseline_end_str = os.getenv("BASELINE_END_DATE", "2025-06-30")
        self.recent_start_str = os.getenv("RECENT_START_DATE", "2026-01-01")
        self.recent_end_str = os.getenv("RECENT_END_DATE", "2026-06-30")

        # Validate dates chronologically
        self.baseline_start = parse_date(
            self.baseline_start_str, "BASELINE_START_DATE")
        self.baseline_end = parse_date(
            self.baseline_end_str, "BASELINE_END_DATE")
        self.recent_start = parse_date(
            self.recent_start_str, "RECENT_START_DATE")
        self.recent_end = parse_date(self.recent_end_str, "RECENT_END_DATE")

        if self.baseline_start >= self.baseline_end:
            raise ValueError(
                f"BASELINE_START_DATE ({self.baseline_start_str}) must be before BASELINE_END_DATE ({self.baseline_end_str})"
            )
        if self.recent_start >= self.recent_end:
            raise ValueError(
                f"RECENT_START_DATE ({self.recent_start_str}) must be before RECENT_END_DATE ({self.recent_end_str})"
            )

        # Cloud & Quality Thresholds
        self.cloud_threshold = float(os.getenv("S2_CLOUD_THRESHOLD", "20.0"))
        if not (0 <= self.cloud_threshold <= 100):
            raise ValueError(
                f"S2_CLOUD_THRESHOLD must be between 0 and 100, got: {self.cloud_threshold}")

        self.min_valid_observations = int(
            os.getenv("MIN_VALID_OBSERVATIONS", "3"))
        if self.min_valid_observations < 1:
            raise ValueError("MIN_VALID_OBSERVATIONS must be at least 1")

        self.spatial_resolution = float(
            os.getenv("SPATIAL_RESOLUTION_METERS", "10.0"))

        # Candidate Area Filters (in square meters)
        self.min_candidate_area = float(
            os.getenv("MIN_CANDIDATE_AREA_M2", "100.0"))
        self.max_candidate_area = float(
            os.getenv("MAX_CANDIDATE_AREA_M2", "50000.0"))
        if self.min_candidate_area <= 0 or self.max_candidate_area <= self.min_candidate_area:
            raise ValueError(
                "Invalid candidate area range: min must be > 0 and max must exceed min")

        # Spectral Change Thresholds
        self.delta_ndbi_threshold = float(
            os.getenv("DELTA_NDBI_THRESHOLD", "0.10"))
        self.delta_ndvi_threshold = float(
            os.getenv("DELTA_NDVI_THRESHOLD", "-0.10"))
        self.min_confidence = float(os.getenv("MIN_CONFIDENCE", "0.50"))

        # Versioning
        self.processing_version = os.getenv("PROCESSING_VERSION", "v1.0.0")
        self.algorithm_version = os.getenv(
            "ALGORITHM_VERSION", "s2_diff_spectral_v1")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "baseline_start": self.baseline_start_str,
            "baseline_end": self.baseline_end_str,
            "recent_start": self.recent_start_str,
            "recent_end": self.recent_end_str,
            "cloud_threshold": self.cloud_threshold,
            "min_valid_observations": self.min_valid_observations,
            "spatial_resolution": self.spatial_resolution,
            "min_candidate_area": self.min_candidate_area,
            "max_candidate_area": self.max_candidate_area,
            "delta_ndbi_threshold": self.delta_ndbi_threshold,
            "delta_ndvi_threshold": self.delta_ndvi_threshold,
            "min_confidence": self.min_confidence,
            "processing_version": self.processing_version,
            "algorithm_version": self.algorithm_version,
        }


config = GEEConfig()
