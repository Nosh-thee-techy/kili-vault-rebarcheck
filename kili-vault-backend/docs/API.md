# Kili-Vault REST API Specification (v1.0.0)

**Base URL:** `/api/v1`  
**Protocol:** HTTPS / JSON & GeoJSON  
**Authentication:** Bearer token (`Authorization: Bearer <token>`) or Development Auth Bypass headers (`X-User-ID`, `X-User-Role`).

---

## 1. Health & Liveness Probes

### `GET /health`

Returns high-level system service health and version information.

**Response `200 OK`:**

```json
{
  "status": "ok",
  "service": "kili-vault-backend",
  "version": "v1.0.0",
  "timestamp": "2026-09-09T20:00:00.000Z",
  "uptime_seconds": 1240
}
```

### `GET /health/live`

Container orchestrator liveness probe. Confirms the Node.js event loop is operational.

**Response `200 OK`:**

```json
{ "status": "live", "timestamp": "2026-09-09T20:00:00.000Z" }
```

### `GET /health/ready`

Readiness probe verifying PostgreSQL/PostGIS connectivity and environment variables.

**Response `200 OK` / `503 Service Unavailable`:**

```json
{
  "status": "ready",
  "checks": {
    "configuration": "ok",
    "database": {
      "connected": true,
      "postgis_version": "3.3 USE_GEOS=1 USE_PROJ=1",
      "latency_ms": 3
    }
  },
  "timestamp": "2026-09-09T20:00:00.000Z"
}
```

---

## 2. Detection Endpoints

### `GET /api/v1/detections`

Returns a paginated list of candidate remote sensing detections.

**Query Parameters:**

- `limit` (integer, default: `20`, max: `100`): Maximum records to return.
- `offset` (integer, default: `0`): Pagination offset.
- `change_type` (string, optional): Filter by change type (`BUILDING_DEVELOPMENT`, `INFRASTRUCTURE_CHANGE`, `LAND_CLEARING`, `VEGETATION_CHANGE`, `SURFACE_CHANGE`, `UNKNOWN`).
- `min_confidence` (number, optional): Minimum confidence score threshold (`0.0` - `1.0`).
- `run_id` (string, optional): Processing run ID.
- `bbox` (string, optional): Bounding box in `minLon,minLat,maxLon,maxLat` format (e.g. `36.75,-1.31,36.82,-1.27`).

**Response `200 OK`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "det_kilimani_001",
      "run_id": "r1000000-0000-0000-0000-000000000001",
      "event_id": "evt_a89f31c2",
      "change_type": "BUILDING_DEVELOPMENT",
      "confidence": 0.84,
      "baseline_probability": 0.82,
      "prithvi_probability": null,
      "ndbi_change": 0.24,
      "ndvi_change": -0.28,
      "temporal_persistence": 0.92,
      "area_m2": 745.2,
      "centroid_lat": -1.29185,
      "centroid_lon": 36.78245,
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      },
      "evidence": {
        "spectral_change": true,
        "ndbi_increase": true,
        "ndvi_decrease": true,
        "recent_built_signature": true,
        "explanation": "Conjunction of high NDBI increase (+0.24) and canopy clearance (-0.28) indicates new building foundation."
      },
      "model_version": "kili-vault-dev-v0.1",
      "created_at": "2026-08-15T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 3,
    "limit": 20,
    "offset": 0
  }
}
```

---

### `GET /api/v1/detections/geojson`

Returns candidate detections formatted as a standard GeoJSON `FeatureCollection` for direct ingestion by map rendering engines (MapLibre GL, Leaflet, ArcGIS Maps SDK).

**Query Parameters:**

- Same filters as `/api/v1/detections` (`change_type`, `min_confidence`, `run_id`, `bbox`).

**Response `200 OK`:**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "det_kilimani_001",
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      },
      "properties": {
        "id": "det_kilimani_001",
        "run_id": "r1000000-0000-0000-0000-000000000001",
        "change_type": "BUILDING_DEVELOPMENT",
        "confidence": 0.84,
        "baseline_probability": 0.82,
        "prithvi_probability": null,
        "ndbi_change": 0.24,
        "ndvi_change": -0.28,
        "temporal_persistence": 0.92,
        "area_m2": 745.2,
        "centroid_lat": -1.29185,
        "centroid_lon": 36.78245,
        "evidence": { ... },
        "model_version": "kili-vault-dev-v0.1"
      }
    }
  ]
}
```

---

### `GET /api/v1/detections/stats`

Returns aggregated summary statistics and metric distributions across all detections.

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "total_detections": 42,
    "building_development": 24,
    "infrastructure_change": 8,
    "land_clearing": 6,
    "vegetation_change": 3,
    "surface_change": 1,
    "high_confidence_count": 18,
    "avg_confidence": 0.78,
    "total_area_m2": 32540.5
  }
}
```

---

### `GET /api/v1/detections/:id`

Retrieves a single candidate detection by its unique identifier.

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "id": "det_kilimani_001",
    "change_type": "BUILDING_DEVELOPMENT",
    "confidence": 0.84,
    "geometry": { ... },
    "evidence": { ... }
  }
}
```

**Response `404 Not Found`:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Detection not found: det_nonexistent"
  }
}
```

---

## 3. Processing Run Endpoints

### `GET /api/v1/processing/runs`

Lists all remote sensing execution runs.

**Query Parameters:**

- `limit` (integer, default: `20`): Maximum records to return.
- `offset` (integer, default: `0`): Pagination offset.

**Response `200 OK`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "r1000000-0000-0000-0000-000000000001",
      "aoi_name": "Kilimani Ward, Nairobi",
      "baseline_start_date": "2025-01-01",
      "baseline_end_date": "2025-06-30",
      "recent_start_date": "2026-01-01",
      "recent_end_date": "2026-06-30",
      "status": "COMPLETED",
      "detections_count": 3,
      "model_version": "kili-vault-dev-v0.1",
      "created_at": "2026-09-09T18:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

---

### `POST /api/v1/processing/trigger`

Triggers an automated processing run.

**Request Body (Optional):**

```json
{
  "baseline_start_date": "2025-01-01",
  "baseline_end_date": "2025-06-30",
  "recent_start_date": "2026-01-01",
  "recent_end_date": "2026-06-30"
}
```

**Response `202 Accepted`:**

```json
{
  "success": true,
  "message": "Processing run initiated successfully",
  "data": {
    "run_id": "r-7f9a12c4-...",
    "status": "QUEUED"
  }
}
```

---

## 4. Model Management & Automation Endpoints

### `GET /api/v1/models/status`

Returns current operational status of Model A, Model B (Prithvi change head), and Ensemble weights, as well as the latest training and pipeline execution metrics.

**Response `200 OK`:**

```json
{
  "status": "operational",
  "models": {
    "model_a_spectral_baseline": {
      "name": "Spectral Change Baseline",
      "calibrated": true,
      "parameters": {
        "delta_ndbi_threshold": 0.14,
        "delta_ndvi_threshold": -0.14
      },
      "precision_met": true
    },
    "model_b_prithvi_eo": {
      "name": "NASA/IBM Prithvi-100M Foundation Model Adapter",
      "is_loaded": false,
      "availability": "UNAVAILABLE",
      "availability_reason": "Pretrained Prithvi backbone weights and a compatible executable backend are required.",
      "change_head": {
        "model_architecture": "Prithvi-EO Change Classification Head",
        "feature_dim": 23,
        "classes": [
          "BUILDING_DEVELOPMENT",
          "INFRASTRUCTURE_CHANGE",
          "LAND_CLEARING",
          "VEGETATION_CHANGE",
          "SURFACE_CHANGE",
          "NO_CHANGE"
        ],
        "best_validation_f1": 0.85
      },
      "required_bands": ["B2", "B3", "B4", "B8A", "B11", "B12"]
    },
    "ensemble_classifier": {
      "name": "Ensemble Change Classifier",
      "weights": { "baseline": 0.4, "prithvi": 0.4, "persistence": 0.2 },
      "validation_metrics": { "precision": 0.857, "recall": 1.0, "f1": 0.923 }
    }
  },
  "last_training": {
    "timestamp": "2026-09-10T17:34:26.058Z",
    "duration_seconds": 0.24,
    "precision_met": true,
    "macro_f1": 1.0
  },
  "last_pipeline_run": {
    "pipeline_id": "pipe_run_1789061776",
    "timestamp": "2026-09-10T17:36:16.910Z",
    "duration_seconds": 0.39,
    "status": "success"
  }
}
```

### `POST /api/v1/models/train`

Triggers the automated model training and threshold calibration orchestrator.
Optional body parameters: `epochs` (default 15), `lr` (default 0.02).

**Response `202 Accepted`:**

```json
{
  "status": "ACCEPTED",
  "message": "Automated model training initiated.",
  "parameters": { "epochs": 15, "lr": 0.02 },
  "check_status_url": "/api/v1/models/status"
}
```

### `POST /api/v1/models/verify`

Runs the 5-step model configuration and precision verification suite.

**Response `200 OK`:**

```json
{
  "status": "PASSED",
  "message": "All 5 model verification suites passed successfully."
}
```

### `POST /api/v1/models/pipeline/auto`

Triggers the end-to-end automated pipeline (Training/Checkpoints -> GEE Detection -> Ingestion -> Verification).

**Response `202 Accepted`:**

```json
{
  "status": "ACCEPTED",
  "message": "Automated end-to-end pipeline execution initiated.",
  "check_status_url": "/api/v1/models/status"
}
```
