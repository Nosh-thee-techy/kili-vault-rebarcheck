"""
Kili-Vault Earth Engine: End-to-End Processing Pipeline
Orchestrates data acquisition, temporal compositing, index differencing, spatial filtering,
vector polygon reduction, and confidence/risk scoring.
"""

import uuid
import math
import os
from datetime import datetime
from typing import Dict, Any, List

from gee.config import config
from gee.auth import initialize_earth_engine
from gee.aoi import load_aoi
from gee.sentinel2 import get_sentinel2_collection
from gee.indices import create_temporal_composite
from gee.change_detection import (
    compute_spectral_change,
    generate_candidate_mask,
    classify_change_type_heuristics,
)
from gee.spatial_filter import apply_spatial_filtering
from gee.confidence import calculate_confidence
from gee.risk import calculate_spatial_risk
from gee.geojson import format_detection_feature, to_feature_collection
from models.baseline.spectral_change import SpectralChangeBaseline
from models.prithvi.inference import PrithviInferencePipeline
from models.prithvi.model import PrithviModelAdapter, PRITHVI_BANDS


def calculate_two_composite_persistence(
    delta_ndbi: float, delta_ndvi: float, baseline_observations: int,
    recent_observations: int,
) -> float:
    """Score support from the two available composites without inventing dates."""
    observation_quality = min(max(
        min(baseline_observations, recent_observations) / 8.0, 0.2), 1.0)
    signal_strength = min(max(
        (abs(delta_ndbi) / 0.25 + abs(delta_ndvi) / 0.30) / 2.0, 0.0), 1.0)
    return round(min(1.0, 0.35 +
                     0.65 * observation_quality * (0.5 + 0.5 * signal_strength)), 2)


class KiliVaultPipeline:
    def __init__(self):
        self.config = config

    def run(self, dry_run: bool = False) -> Dict[str, Any]:
        """
        Executes the remote sensing detection pipeline for Kilimani Ward.
        Returns:
            Tuple containing the GeoJSON FeatureCollection and the processing run summary.
        """
        run_id = str(uuid.uuid4())
        started_at = datetime.utcnow().isoformat() + "Z"
        warnings: List[str] = []
        errors: List[str] = []
        detection_features: List[Dict[str, Any]] = []
        baseline_model = SpectralChangeBaseline(
            delta_ndbi_threshold=self.config.delta_ndbi_threshold,
            delta_ndvi_threshold=self.config.delta_ndvi_threshold,
        )
        prithvi_pipeline = PrithviInferencePipeline(PrithviModelAdapter())
        if not prithvi_pipeline.adapter.is_loaded:
            errors.append(
                prithvi_pipeline.adapter.load_error or "Prithvi model is not ready")
            return {
                "geojson": to_feature_collection([]),
                "summary": {
                    "run_id": run_id,
                    "status": "FAILED",
                    "started_at": started_at,
                    "completed_at": datetime.utcnow().isoformat() + "Z",
                    "detections_count": 0,
                    "warnings": warnings,
                    "errors": errors,
                },
            }

        print(f"\n[PIPELINE START] Run ID: {run_id}")
        print(
            f"[PIPELINE CONFIG] AOI: Kilimani Ward | Resolution: {self.config.spatial_resolution}m")
        print(
            f"[PIPELINE DATES] Baseline: {self.config.baseline_start_str} to {self.config.baseline_end_str}")
        print(
            f"[PIPELINE DATES] Recent:   {self.config.recent_start_str} to {self.config.recent_end_str}")

        if dry_run:
            print(
                "[PIPELINE DRY RUN] Simulating pipeline execution without live GEE server calls.")
            summary = {
                "run_id": run_id,
                "status": "COMPLETED",
                "dry_run": True,
                "started_at": started_at,
                "completed_at": datetime.utcnow().isoformat() + "Z",
                "detections_count": 0,
                "warnings": ["Dry run executed. No live Earth Engine queries sent."],
                "errors": [],
                "parameters": self.config.to_dict(),
            }
            return {
                "geojson": to_feature_collection([]),
                "summary": summary,
            }

        # 1. Initialize Earth Engine Authentication
        auth_success = initialize_earth_engine(self.config.project_id)
        if not auth_success:
            err_msg = "Earth Engine authentication failed. Ensure service account or ADC credentials are set."
            errors.append(err_msg)
            return {
                "geojson": to_feature_collection([]),
                "summary": {
                    "run_id": run_id,
                    "status": "FAILED",
                    "started_at": started_at,
                    "completed_at": datetime.utcnow().isoformat() + "Z",
                    "detections_count": 0,
                    "warnings": warnings,
                    "errors": errors,
                },
            }

        import ee

        try:
            # 2. Load AOI Boundary (Kilimani Ward)
            aoi_geom = load_aoi()

            # 3. Access Sentinel-2 Collections for Baseline & Recent Windows
            base_col = get_sentinel2_collection(
                aoi_geom,
                self.config.baseline_start_str,
                self.config.baseline_end_str,
                self.config.cloud_threshold,
            )
            rec_col = get_sentinel2_collection(
                aoi_geom,
                self.config.recent_start_str,
                self.config.recent_end_str,
                self.config.cloud_threshold,
            )

            # Check collection sizes
            base_count = base_col.size().getInfo()
            rec_count = rec_col.size().getInfo()
            print(
                f"[PIPELINE DATA] Baseline Sentinel-2 scenes: {base_count} | Recent scenes: {rec_count}")

            if base_count < self.config.min_valid_observations:
                warnings.append(
                    f"Baseline period has only {base_count} scenes (threshold: {self.config.min_valid_observations}). "
                    "Results may be sensitive to persistent cloud/shadow artifacts."
                )
            if rec_count < self.config.min_valid_observations:
                warnings.append(
                    f"Recent period has only {rec_count} scenes (threshold: {self.config.min_valid_observations}). "
                    "Results may be sensitive to persistent cloud/shadow artifacts."
                )

            # 4. Generate Cloud-Masked Temporal Composites with Indices
            base_composite = create_temporal_composite(base_col, aoi_geom)
            rec_composite = create_temporal_composite(rec_col, aoi_geom)

            # 5. Compute Differential Spectral Change (delta_NDVI, delta_NDBI)
            change_image = compute_spectral_change(
                base_composite, rec_composite)

            # 6. Generate Candidate Change Mask
            candidate_mask = generate_candidate_mask(
                change_image,
                self.config.delta_ndbi_threshold,
                self.config.delta_ndvi_threshold,
                self.config.min_valid_observations,
            )

            # 7. Apply Spatial Filtering & Noise Reduction
            filtered_mask = apply_spatial_filtering(
                candidate_mask,
                self.config.spatial_resolution,
                self.config.min_candidate_area,
                self.config.max_candidate_area,
            )

            # 8. Vectorize Candidate Pixels to Polygons Server-Side in Earth Engine
            # Use reduceToVectors to avoid downloading large raster matrices
            vectors = filtered_mask.selfMask().reduceToVectors(
                geometry=aoi_geom,
                scale=self.config.spatial_resolution,
                geometryType="polygon",
                eightConnected=True,
                labelProperty="candidate_id",
                maxPixels=1e8,
                bestEffort=True,
            )

            # Server-side spatial aggregation of statistics per polygon
            def extract_stats(feat):
                stats = change_image.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=feat.geometry(),
                    scale=self.config.spatial_resolution,
                    maxPixels=1e6,
                )
                area_m2 = feat.geometry().area(maxError=1)
                centroid = feat.geometry().centroid(maxError=1)
                bbox = feat.geometry().bounds(maxError=1)
                base_bands = base_composite.select(PRITHVI_BANDS).reduceRegion(
                    reducer=ee.Reducer.mean(), geometry=feat.geometry(),
                    scale=self.config.spatial_resolution, maxPixels=1e6)
                recent_bands = rec_composite.select(PRITHVI_BANDS).reduceRegion(
                    reducer=ee.Reducer.mean(), geometry=feat.geometry(),
                    scale=self.config.spatial_resolution, maxPixels=1e6)
                return feat.set({
                    "delta_NDBI_mean": stats.get("delta_NDBI"),
                    "delta_NDVI_mean": stats.get("delta_NDVI"),
                    "rec_NDBI_mean": stats.get("rec_NDBI"),
                    "rec_NDVI_mean": stats.get("rec_NDVI"),
                    "base_obs_mean": stats.get("base_obs"),
                    "rec_obs_mean": stats.get("rec_obs"),
                    "area_m2": area_m2,
                    "centroid_coords": centroid.coordinates(),
                    "bounds_coords": bbox.coordinates(),
                    "prithvi_bands_t1": base_bands,
                    "prithvi_bands_t2": recent_bands,
                })

            features_with_stats = vectors.map(extract_stats)
            print(
                "[PIPELINE PROGRESS] Materializing candidate vectors and statistics from Earth Engine...",
                flush=True,
            )
            raw_geojson = features_with_stats.getInfo()
            candidate_count = len(raw_geojson.get("features", []))
            print(
                f"[PIPELINE PROGRESS] Earth Engine returned {candidate_count} candidate(s).",
                flush=True,
            )
            max_prithvi_candidates = int(
                os.getenv("PRITHVI_MAX_CANDIDATES", "0"))
            if max_prithvi_candidates > 0:
                raw_geojson["features"] = raw_geojson.get(
                    "features", [])[:max_prithvi_candidates]
                warnings.append(
                    f"Controlled Prithvi run limited to {max_prithvi_candidates} candidate(s)."
                )
            aoi_geojson = aoi_geom.getInfo()

            # 9. Process Features into Kili-Vault GeoJSON
            detection_date = self.config.recent_end_str
            baseline_period = {
                "start": self.config.baseline_start_str, "end": self.config.baseline_end_str}
            recent_period = {"start": self.config.recent_start_str,
                             "end": self.config.recent_end_str}

            candidate_features = raw_geojson.get("features", [])
            total_candidates = len(candidate_features)
            for candidate_index, item in enumerate(candidate_features, start=1):
                props = item.get("properties", {})
                geom = item.get("geometry", {})
                print(
                    f"[PRITHVI] Inference candidate {candidate_index}/{total_candidates}...",
                    flush=True,
                )
                required_stats = [
                    "delta_NDBI_mean", "delta_NDVI_mean", "rec_NDBI_mean",
                    "rec_NDVI_mean", "base_obs_mean", "rec_obs_mean",
                    "area_m2", "centroid_coords", "bounds_coords",
                    "prithvi_bands_t1", "prithvi_bands_t2",
                ]
                missing_stats = [
                    name for name in required_stats if props.get(name) is None]
                if missing_stats:
                    warnings.append(
                        f"Skipped feature with missing Earth Engine measurements: {missing_stats}"
                    )
                    continue

                d_ndbi = float(props["delta_NDBI_mean"])
                d_ndvi = float(props["delta_NDVI_mean"])
                r_ndbi = float(props["rec_NDBI_mean"])
                r_ndvi = float(props["rec_NDVI_mean"])
                b_obs = int(props["base_obs_mean"])
                r_obs = int(props["rec_obs_mean"])
                area_m2 = float(props["area_m2"])
                bands_t1 = {band: props["prithvi_bands_t1"].get(band)
                            for band in PRITHVI_BANDS}
                bands_t2 = {band: props["prithvi_bands_t2"].get(band)
                            for band in PRITHVI_BANDS}
                if any(value is None for value in (*bands_t1.values(), *bands_t2.values())):
                    warnings.append(
                        "Skipped feature with incomplete Prithvi band measurements")
                    continue
                prithvi_result = prithvi_pipeline.predict_chip(
                    bands_t1, bands_t2)
                if not prithvi_result["available"]:
                    raise RuntimeError(prithvi_result["reason"])
                print(
                    f"[PRITHVI] Candidate {candidate_index}/{total_candidates} complete.",
                    flush=True,
                )

                centroid_coords = props["centroid_coords"]
                bounds_coords = props["bounds_coords"][0]
                min_lon = min(
                    pt[0] for pt in bounds_coords) if bounds_coords else centroid_coords[0]
                max_lon = max(
                    pt[0] for pt in bounds_coords) if bounds_coords else centroid_coords[0]
                min_lat = min(
                    pt[1] for pt in bounds_coords) if bounds_coords else centroid_coords[1]
                max_lat = max(
                    pt[1] for pt in bounds_coords) if bounds_coords else centroid_coords[1]
                bbox = [round(min_lon, 5), round(min_lat, 5),
                        round(max_lon, 5), round(max_lat, 5)]

                # Aspect ratio for false positive control on linear roads/resurfacing
                dx = max(max_lon - min_lon, 0.00001)
                dy = max(max_lat - min_lat, 0.00001)
                aspect_ratio = max(dx / dy, dy / dx)

                # Heuristic classification
                change_type = classify_change_type_heuristics(
                    delta_ndbi=d_ndbi,
                    delta_ndvi=d_ndvi,
                    recent_ndbi=r_ndbi,
                    recent_ndvi=r_ndvi,
                    area_m2=area_m2,
                    aspect_ratio=aspect_ratio,
                )

                baseline_probability, baseline_evidence = baseline_model.predict_development_probability(
                    ndvi_before=r_ndvi - d_ndvi,
                    ndvi_after=r_ndvi,
                    ndbi_before=r_ndbi - d_ndbi,
                    ndbi_after=r_ndbi,
                )

                temporal_persistence = calculate_two_composite_persistence(
                    d_ndbi, d_ndvi, b_obs, r_obs)

                # Transparent confidence scoring
                confidence_score, conf_factors = calculate_confidence(
                    delta_ndbi=d_ndbi,
                    delta_ndvi=d_ndvi,
                    base_obs=b_obs,
                    rec_obs=r_obs,
                    area_m2=area_m2,
                    persistence_observed=temporal_persistence >= 0.8,
                )

                if confidence_score < self.config.min_confidence:
                    continue

                # Spatial risk scoring
                risk_score, risk_level, risk_factors = calculate_spatial_risk(
                    confidence_score=confidence_score,
                    area_m2=area_m2,
                )

                det_id = str(uuid.uuid4())
                feature = format_detection_feature(
                    feature_id=det_id,
                    geometry=geom,
                    centroid={"type": "Point", "coordinates": [
                        round(centroid_coords[0], 5), round(centroid_coords[1], 5)]},
                    area_m2=area_m2,
                    bbox=bbox,
                    detection_date=detection_date,
                    baseline_period=baseline_period,
                    recent_period=recent_period,
                    change_type=change_type,
                    confidence_score=confidence_score,
                    risk_score=risk_score,
                    risk_level=risk_level,
                    risk_factors=risk_factors,
                    baseline_probability=baseline_probability,
                    prithvi_probability=prithvi_result["probability"],
                    ndbi_change=d_ndbi,
                    ndvi_change=d_ndvi,
                    temporal_persistence=temporal_persistence,
                    confidence_factors={**conf_factors, "baseline": baseline_evidence,
                                        "temporal_persistence": {
                                            "value": temporal_persistence,
                                            "method": "two_composite_observation_quality_proxy",
                                        },
                                        "prithvi": {
                                            "available": True,
                                            "predicted_class": prithvi_result["predicted_class"],
                                            "class_probabilities": prithvi_result["class_probabilities"],
                                        }},
                    aoi_geometry=aoi_geojson,
                    processing_version=self.config.processing_version,
                    model_version="Prithvi-EO-2.0-300M-TL+spectral-v1",
                )
                detection_features.append(feature)

            print(
                f"[PIPELINE COMPLETE] Extracted {len(detection_features)} candidate spatial changes.")

            status = "WARNING" if warnings else "COMPLETED"

        except Exception as e:
            print(f"[PIPELINE ERROR] Execution failed: {str(e)}")
            errors.append(str(e))
            status = "FAILED"

        completed_at = datetime.utcnow().isoformat() + "Z"

        summary = {
            "run_id": run_id,
            "status": status,
            "started_at": started_at,
            "completed_at": completed_at,
            "detections_count": len(detection_features),
            "warnings": warnings,
            "errors": errors,
            "parameters": self.config.to_dict(),
        }

        return {
            "geojson": to_feature_collection(detection_features),
            "summary": summary,
        }
