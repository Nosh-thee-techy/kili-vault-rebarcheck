# Kili-Vault Step 1: Earth Observation Detection Engine

**Target Jurisdiction:** Kilimani Ward, Dagoretti North Sub-County, Nairobi County, Kenya  
**Technologies:** Copernicus Sentinel-2 L2A, Google Earth Engine, Prithvi-EO Foundation Model Adapter, Ensemble Layer, PostGIS / PostgreSQL, Express, React / Vite.

---

## 1. Project Scope & Boundary

This repository implements **Step 1: The Earth Observation Detection and Model Engine** for Kili-Vault.

Per architectural boundaries:

- **Included**: Sentinel-2 discovery, cloud/shadow masking (SCL), bi-temporal composites, Spectral Change Baseline (Model A), Prithvi-EO foundation model adapter (Model B), ensemble combiner, false-positive prevention, multi-factor confidence scoring, polygon post-processing, and standard GeoJSON outputs.
- **Excluded**: Auth, user roles, case management, developer profiles, mitigation workflows, notifications, payments/tokens/blockchain.

---

## 2. Model Architecture

```
Copernicus Sentinel-2 L2A (10m)
            │
            ▼
Scene Classification Layer (SCL) Cloud & Shadow Masking
            │
            ▼
Bi-Temporal Composites (Baseline: 2025-01 / 2025-06 ➔ Recent: 2026-01 / 2026-06)
            │
      ┌─────┴───────────────────────┐
      ▼                             ▼
Model A: Spectral Baseline    Model B: Prithvi-EO Adapter (100M)
(ΔNDBI, ΔNDVI, ΔNDWI)         (Multi-temporal 6-band chips)
      │                             │
      └─────────────┬───────────────┘
                    ▼
          Ensemble Combiner
    (Configurable weighted blending)
                    │
                    ▼
     False-Positive Suppression Filter
  (High precision: Roads vs Bare Soil vs Buildings)
                    │
                    ▼
        Temporal Persistence Check
  (Confirmation across consecutive passes)
                    │
                    ▼
   Standard GeoJSON & Run Summaries
```

---

## 3. Standardized Change Classes

1. `BUILDING_DEVELOPMENT`: New physical structure emergence (compact geometry, $\Delta\text{NDBI} > 0.10$, $\Delta\text{NDVI} < -0.10$, positive recent NDBI, temporal persistence).
2. `INFRASTRUCTURE_CHANGE`: Roads, corridors, resurfacing (elongated geometry, aspect ratio $\ge 3.2$).
3. `LAND_CLEARING`: Vegetation clearing or bare soil without built impervious spectral signature.
4. `VEGETATION_CHANGE`: Tree canopy growth, seasonal greening, or natural shifts.
5. `SURFACE_CHANGE`: Paving, gravel, or temporary surface modifications.
6. `UNKNOWN`: Unclassified spectral or spatial anomalies.

---

## 4. Minimal API Surface

The API surface is strictly limited to detection engine capabilities:

- `GET /health`: Liveness & readiness probes
- `GET /api/v1/detections`: Paginated list of detections with spatial & attribute filters
- `GET /api/v1/detections/geojson`: Standard GeoJSON `FeatureCollection` output
- `GET /api/v1/detections/:id`: Single detection details and multi-factor evidence
- `GET /api/v1/detections/stats`: Aggregate detection metrics across the 6 change classes
- `GET /api/v1/processing/runs`: List of Earth Observation processing runs
- `GET /api/v1/processing/runs/:id`: Processing run execution details and provenance

---

## 5. System Language Rules

The system outputs only physical sensor observations:

- **Allowed**: `"POTENTIAL DEVELOPMENT CHANGE DETECTED"`, `"Evidence indicates physical land modification"`, `"Confidence score: X%"`, `"Baseline vs recent spectral difference: Y"`.
- **Forbidden**: Non-technical legal assertions (e.g. "Building is illegal", "Unauthorized development", "Case opened").

---

## 6. Directory Structure

```
├── config/
│   ├── settings.py                   # Centralized Python configuration
│   └── kilimani_ward.geojson         # AOI boundary for Kilimani Ward
├── database/
│   └── schema.sql                    # Clean schema for detection_runs & detections
├── gee/
│   ├── client.py                     # Earth Engine initialization & credentials
│   ├── imagery.py                    # Sentinel-2 collection search & compositing
│   ├── indices.py                    # NDVI, NDBI, NDWI computation
│   └── preprocessing.py              # SCL cloud masking
├── models/
│   ├── baseline/
│   │   └── spectral_change.py        # Model A: Spectral difference detector
│   ├── prithvi/
│   │   ├── model.py                  # Model B: Prithvi-EO architecture & adapter
│   │   ├── preprocessing.py          # Band normalization & chip preparation
│   │   ├── inference.py              # Chip inference orchestrator
│   │   └── training.py               # Fine-tuning harness
│   └── ensemble/
│       └── combine.py                # Ensemble combiner with false-positive guard
├── detection/
│   ├── classification.py             # 6-class categorization (precision prioritized)
│   ├── confidence.py                 # Multi-factor confidence & evidence attribution
│   ├── detector.py                   # Candidate generator
│   ├── temporal.py                   # Multi-pass persistence verification
│   └── postprocess.py                # Polygon cleanup & spatial deduplication
├── processing/
│   ├── pipeline.py                   # Master processing pipeline
│   └── runs.py                       # Run tracking & persistence
├── outputs/
│   ├── geojson.py                    # GeoJSON FeatureCollection serializer
│   └── summaries.py                  # Execution summary generator
├── eval/
│   └── evaluate.py                   # Precision / Recall / F1 validation
└── src/                              # Express REST API (7 endpoints) & React Console
```
