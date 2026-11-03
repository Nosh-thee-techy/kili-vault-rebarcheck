"""
Earth Observation Processing Pipeline
Orchestrates the complete Sentinel-2 change detection pipeline:
1. AOI ingestion
2. Sentinel-2 discovery & compositing
3. Multi-temporal spectral differencing
4. Baseline & Prithvi model inference
5. Ensemble combination & false-positive classification
6. Spatial postprocessing & deduplication
7. GeoJSON & Summary output generation
"""

import os
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from config.settings import settings
from gee.client import initialize_earth_engine, is_gee_available
from detection.detector import EarthObservationDetector
from outputs.geojson import to_geojson_feature_collection, save_geojson
from outputs.summaries import generate_run_summary

logger = logging.getLogger("kili-vault.processing.pipeline")


class ProcessingPipeline:
    """Master Earth Observation Processing Pipeline."""

    def __init__(self, detector: Optional[EarthObservationDetector] = None):
        self.detector = detector or EarthObservationDetector()
        self.settings = settings

    def execute_run(
        self,
        aoi_geojson: Optional[Dict[str, Any]] = None,
        baseline_start: Optional[str] = None,
        baseline_end: Optional[str] = None,
        recent_start: Optional[str] = None,
        recent_end: Optional[str] = None,
        output_dir: str = "outputs",
    ) -> Dict[str, Any]:
        """
        Executes a complete detection run.
        """
        start_time = datetime.utcnow()
        run_id = f"run_{start_time.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        logger.info("Starting processing run %s...", run_id)

        # 1. Resolve AOI and time windows
        aoi_data = aoi_geojson or self.settings.load_aoi_geojson()
        b_start = baseline_start or self.settings.baseline_start_str
        b_end = baseline_end or self.settings.baseline_end_str
        r_start = recent_start or self.settings.recent_start_str
        r_end = recent_end or self.settings.recent_end_str

        baseline_period = {"start": b_start, "end": b_end}
        recent_period = {"start": r_start, "end": r_end}

        # 2. Initialize Earth Engine if possible
        gee_active = initialize_earth_engine(
            project_id=self.settings.gee_project_id,
            service_account=self.settings.gee_service_account_email,
            key_path=self.settings.gee_service_account_key_path,
        )

        imagery_count = 0
        detections = []
        error_msg = None

        try:
            if not gee_active:
                raise RuntimeError(
                    "Earth Engine is unavailable. Authenticate once with 'earthengine authenticate' "
                    "or configure GEE_SERVICE_ACCOUNT_KEY_PATH and GEE_PROJECT_ID."
                )
            raise NotImplementedError(
                "Use gee.pipeline.KiliVaultPipeline for live Sentinel-2 extraction; "
                "sample candidate generation has been removed."
            )

        except Exception as e:
            logger.error("Processing run %s failed: %s",
                         run_id, str(e), exc_info=True)
            status = "FAILED"
            error_msg = str(e)

        end_time = datetime.utcnow()

        # 4. Generate outputs
        os.makedirs(output_dir, exist_ok=True)
        summary = generate_run_summary(
            run_id=run_id,
            status=status,
            model_version=self.settings.model_version,
            start_time=start_time,
            end_time=end_time,
            aoi_name=self.settings.aoi_name,
            baseline_period=baseline_period,
            recent_period=recent_period,
            imagery_count=imagery_count,
            detections=detections,
            error_message=error_msg,
        )

        geojson_data = to_geojson_feature_collection(
            detections, metadata=summary)

        # Save artifacts to outputs directory
        geojson_file = os.path.join(output_dir, f"detections_{run_id}.geojson")
        save_geojson(geojson_data, geojson_file)

        return {
            "summary": summary,
            "geojson": geojson_data,
            "detections": detections,
            "artifacts": {
                "geojson_path": geojson_file,
            },
        }
