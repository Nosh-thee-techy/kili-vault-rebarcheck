# Kili-Vault System Architecture

**Area of Interest (AOI):** Kilimani Ward, Dagoretti North Sub-County, Nairobi County, Kenya  
**Domain:** Geospatial Remote Sensing & Physical Development Detection  
**Core Purpose:** High-precision automated detection of candidate physical developments from multi-temporal Copernicus Sentinel-2 satellite imagery using an interpretable spectral baseline combined with foundation model adapters.

---

## 1. High-Level Architectural Diagram

```
+-----------------------------------------------------------------------------------+
|                           Copernicus Sentinel-2 Constellation                     |
|                   (Harmonized Surface Reflectance - 10m / 20m)                     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        Google Earth Engine Processing (Python)                    |
|  - Cloud/Shadow SCL & QA60 Masking       - Temporal Median Compositing            |
|  - Spectral Differencing (NDVI/NDBI/NDWI)- Candidate Mask Extraction              |
|  - Spatial Connected-Component Cleanup   - Vector Polygon Extraction              |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                             Dual Model Detection Engine                           |
|                                                                                   |
|  [Model A: Spectral Change Baseline]     [Model B: NASA/IBM Prithvi-EO Adapter]   |
|  - ΔNDBI >= +0.10, ΔNDVI <= -0.10        - 6 Bands: B2, B3, B4, B8A, B11, B12     |
|  - Post-change NDBI confirmation         - Multi-temporal chip normalization      |
|  - Transparent spectral reasoning        - Prithvi-EO 2.0 300M-TL + 6-Class Head|
|                                         \        /                                |
|                                          v      v                                 |
|                         [Ensemble Change Classifier]                              |
|                         - Baseline (50%) + Prithvi (30%) + Persistence (20%)      |
|                         - Dynamic rebalance (71.4% / 28.6%) when unweighted       |
|                         - False-positive suppression if NDBI not increasing       |
|                         - Aspect ratio filter: >= 3.2 -> INFRASTRUCTURE_CHANGE     |
|                         - Bare soil check: ΔNDVI < -0.10, NDBI < 0 -> LAND_CLEAR  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v (Validated GeoJSON + Run Summary)
+-----------------------------------------------------------------------------------+
|                             Idempotent Ingestion Service                          |
|  - Coordinate Boundary & Area Checks     - Spatial Deduplication (11m hash)       |
|  - PostGIS Foreign Key Association       - Processing Run Linking                 |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        PostgreSQL 15+ with PostGIS Spatial Engine                 |
|  - aoi_boundaries (Kilimani Ward)        - processing_runs (Run tracking)         |
|  - detections (Polygons, EPSG:4326)      - spatial & attribute indices            |
+-----------------------------------------+-----------------------------------------+
                                          ^
                                          |
+-----------------------------------------------------------------------------------+
|                             Express REST API (Node.js)                            |
|  - API Security (Helmet, CORS, RateLimit) - Correlation ID & Structured Logging   |
|  - Zod Input Validation & Error Handling - In-Memory Fallback Store               |
|  - Standard REST & GeoJSON Endpoints     - Pagination & Spatial Bounding Box      |
+-----------------------------------------+-----------------------------------------+
                                          ^
                                          |
+-----------------------------------------------------------------------------------+
|                    Client Layer: Web Dashboard & Spatial Clients                  |
|  - Single-Page Application (React + Vite)- Direct GeoJSON FeatureCollection Feed  |
|  - Operational KPIs & Detection Feed     - Model Verification & Status Telemetry  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Multi-Model Detection Framework

### A. Model A: Interpretable Spectral Change Baseline

- **NDVI (Normalized Difference Vegetation Index)**:
  $$\text{NDVI} = \frac{\text{B8 (NIR)} - \text{B4 (Red)}}{\text{B8 (NIR)} + \text{B4 (Red)}}$$
  Negative shift ($\Delta\text{NDVI} \le -0.10$) indicates vegetation canopy clearance or ground disturbance.
- **NDBI (Normalized Difference Built-up Index)**:
  $$\text{NDBI} = \frac{\text{B11 (SWIR1)} - \text{B8 (NIR)}}{\text{B11 (SWIR1)} + \text{B8 (NIR)}}$$
  Positive shift ($\Delta\text{NDBI} \ge +0.10$) indicates newly exposed impervious or built materials.
- **Post-Change Built Confirmation**:
  Requires recent period $\text{NDBI} \ge 0.05$ to differentiate built surfaces from bare dry soil.

### B. Model B: NASA/IBM Prithvi-EO Foundation Adapter

- **Architecture**: Multispectral Transformer for Earth Observation.
- **Input Channels (6 bands)**: Blue (B2), Green (B3), Red (B4), Narrow NIR (B8A), SWIR-1 (B11), SWIR-2 (B12).
- **Classification Head Classes**:
  1. `NO_CHANGE`
  2. `BUILDING_DEVELOPMENT`
  3. `INFRASTRUCTURE_CHANGE`
  4. `LAND_CLEARING`
  5. `VEGETATION_CHANGE`
  6. `SURFACE_CHANGE`
- **Graceful Unweighted Fallback**: If pretrained weights (`PRITHVI_WEIGHTS_PATH`) are not loaded, the adapter marks `is_loaded: false` and the ensemble dynamically re-weights without raising runtime exceptions or producing hallucinated probabilities.

### C. Ensemble Combiner & False Positive Mitigation

1. **Weighted Probability Fusion**:
   - Baseline Model: 50%
   - Prithvi Foundation Model: 30%
   - Temporal Persistence: 20%
2. **Dynamic Fallback Rebalancing**:
   When Prithvi weights are uninitialized, weights automatically re-normalize:
   - Baseline Model: $0.50 / 0.70 \approx 71.4\%$
   - Temporal Persistence: $0.20 / 0.70 \approx 28.6\%$
3. **Linear Feature Discrimination (Aspect Ratio)**:
   Linear features with bounding box aspect ratio $\ge 3.2$ are classified as `INFRASTRUCTURE_CHANGE` (roads, drainage channels, trenches) rather than `BUILDING_DEVELOPMENT`.
4. **Bare Soil vs. Building Discrimination**:
   Canopy loss without positive built signatures ($\Delta\text{NDVI} \le -0.10, \text{recent NDBI} < 0.0$) is tagged as `LAND_CLEARING`.
5. **Temporal Persistence Filtering**:
   Transient disturbances with temporal persistence $< 0.35$ are classified as `SURFACE_CHANGE`.
6. **Precision Benchmark**:
   Enforces a strict precision floor of $\ge 80\%$ on `BUILDING_DEVELOPMENT` candidates.

---

## 3. Database Schema (PostgreSQL + PostGIS)

- **`aoi_boundaries`**: Official polygonal boundary of Kilimani Ward with spatial indexing (`ST_GeomFromGeoJSON`).
- **`processing_runs`**: Tracks execution runs with AOI parameters, date windows, cloud thresholds, detection counts, and model versions.
- **`detections`**: Stores individual spatial candidate features:
  - `geometry`: MultiPolygon / Polygon in WGS 84 (`SRID=4326`)
  - `change_type`: `BUILDING_DEVELOPMENT`, `INFRASTRUCTURE_CHANGE`, `LAND_CLEARING`, `VEGETATION_CHANGE`, `SURFACE_CHANGE`, `UNKNOWN`
  - `confidence`, `baseline_probability`, `prithvi_probability`, `temporal_persistence`
  - `ndbi_change`, `ndvi_change`, `area_m2`, `centroid_lat`, `centroid_lon`
  - `evidence`: JSONB payload containing model explanation and factor breakdown
  - `deduplication_hash`: Spatial hash to prevent duplicate insertions across overlapping runs.

---

## 4. API Endpoints

- `GET /health`, `/health/live`, `/health/ready`: Microservice lifecycle and database readiness probes.
- `GET /api/v1/detections`: Paginated candidate detections with filtering (`change_type`, `min_confidence`, `run_id`, `bbox`).
- `GET /api/v1/detections/geojson`: Direct GeoJSON `FeatureCollection` for mapping clients.
- `GET /api/v1/detections/stats`: Aggregate KPIs, total area, and breakdown by change type.
- `GET /api/v1/detections/:id`: Single detection record with complete evidence and geometry.
- `GET /api/v1/processing/runs`: Processing run history and execution metadata.
- `POST /api/v1/processing/trigger`: Initiate on-demand remote sensing processing run.
