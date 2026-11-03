# Kili-Vault Setup & Deployment Guide

## 1. Prerequisites

- **Node.js**: v18.x or v20.x LTS
- **Python**: v3.9+ with `pip`
- **PostgreSQL**: v14+ or v15+ with **PostGIS 3.x** extension enabled
- **Google Cloud Platform / Earth Engine**: GCP project with Earth Engine API enabled or a Google Earth Engine Service Account.

---

## 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your environment variables:

```env
# Application Host & Port
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database Connection (PostgreSQL + PostGIS)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/kilivault
DB_SSL=false

# Google Earth Engine Configuration
GEE_PROJECT_ID=kili-vault-project
GEE_SERVICE_ACCOUNT_EMAIL=kili-vault-sa@kili-vault-project.iam.gserviceaccount.com
GEE_SERVICE_ACCOUNT_KEY_PATH=/path/to/sa-private-key.json
AOI_GEOJSON_PATH=config/kilimani_ward.geojson

# Detection Window Parameters
BASELINE_START_DATE=2025-01-01
BASELINE_END_DATE=2025-06-30
RECENT_START_DATE=2026-01-01
RECENT_END_DATE=2026-06-30
S2_CLOUD_THRESHOLD=20.0
MIN_VALID_OBSERVATIONS=3
```

---

## 3. Database Initialization

1. Connect to PostgreSQL and create the database:

```sql
CREATE DATABASE kilivault;
```

2. Apply the comprehensive PostGIS schema:

```bash
psql -d kilivault -f database/schema.sql
```

---

## 4. Automated Model Training & Calibration

Kili-Vault features a fully automated model training and calibration suite:

```bash
# 1. Run automated training across Model A, Model B, and Ensemble:
npm run train
# or directly:
python3 -u scripts/train_models.py --epochs 15 --lr 0.02

# 2. Run model verification and precision enforcement suite:
npm run verify
# or directly:
python3 -u scripts/verify_models.py

# 3. Run complete end-to-end automated pipeline:
npm run pipeline:auto
# or directly:
python3 -u scripts/run_automated_pipeline.py --retrain
```

### What `npm run train` does:

1. Prepares balanced multi-temporal Sentinel-2 training chips across all 6 classes (vegetation, bare soil, infrastructure, buildings, surface disturbance, no change).
2. Performs grid search calibration on Model A (Spectral Baseline) parameters ($\Delta\text{NDBI}$ and $\Delta\text{NDVI}$) enforcing $\ge 80\%$ precision.
3. Fine-tunes Model B (Prithvi-EO Task-Specific Change Head) using mini-batch gradient descent with momentum on multi-temporal Sentinel-2 optical bands.
4. Auto-tunes Ensemble Classifier weighting ($\text{Baseline} / \text{Prithvi} / \text{Persistence}$) to maximize overall macro F1.
5. Evaluates the trained pipeline against held-out test chips and saves `output/training_report.json`.

---

## 5. Google Earth Engine Pipeline Execution

1. Install Python remote sensing dependencies:

```bash
pip install -r requirements.txt
```

2. Run model configuration & precision checks:

```bash
python3 -u scripts/verify_models.py
```

This automated suite tests:

- Model A: Spectral index formulations (NDBI, NDVI, NDWI) and edge cases
- Model B: NASA/IBM Prithvi-EO Foundation Adapter configuration, 6-band order (`B2, B3, B4, B8A, B11, B12`), and unweighted fallback behavior
- Ensemble Layer: Weight rebalancing ($0.714 / 0.286$) and false-positive suppression
- False Positive Guards: Linear road filter (aspect ratio $\ge 3.2$), bare soil filter, and persistence threshold
- Precision Benchmark: $\ge 80\%$ precision enforcement for building development

3. Configure the official NASA/IBM Prithvi-EO 2.0 300M-TL checkpoint:

```bash
.venv\\Scripts\\python.exe scripts/download_prithvi_weights.py
.venv\\Scripts\\python.exe scripts/check_prithvi.py
```

The checkpoint source is the official IBM/NASA Hugging Face repository:
`ibm-nasa-geospatial/Prithvi-EO-2.0-300M-TL`.

## Prithvi Model Setup

The production inference pipeline requires the official pretrained Prithvi
checkpoint and its matching architecture bundle. Run:

```powershell
.venv\Scripts\python.exe scripts/download_prithvi_weights.py
.venv\Scripts\python.exe scripts/train_prithvi_head.py
```

Then verify the checkpoint, architecture, state-dict compatibility, device
placement, and minimal forward pass without Earth Engine:

```powershell
.venv\Scripts\python.exe scripts/check_prithvi.py
```

Production inference must not run unless the model readiness check passes.
Baseline-only mode remains explicit and does not claim Prithvi outputs.

For a controlled Earth Engine acceptance run, set
`PRITHVI_MAX_CANDIDATES=1`; omit it for the full AOI run.

The readiness command is CPU-only and does not access Earth Engine. Production
Prithvi mode must not run unless it reports `PRITHVI MODEL STATUS: READY`.
Use `python scripts/run_pipeline.py --allow-baseline-only` only when explicitly
choosing the separate spectral baseline mode.

4. Run unit tests for algorithms:

```bash
python3 -u -m unittest discover -s tests/python -p "test_*.py"
```

5. Run Earth Engine detection pipeline:

```bash
# Offline simulation / dry-run:
python3 -u -m gee.main --dry-run

# Live Copernicus Sentinel-2 processing:
python3 -u -m gee.main --output output/detections.geojson --summary output/processing_summary.json
```

6. Ingest validated detections into PostgreSQL/PostGIS:

```bash
node scripts/ingest_detections.js output/detections.geojson output/processing_summary.json
```

---

## 5. Running the Backend Server

Install Node dependencies and start the full-stack server:

```bash
npm install
npm run dev
```

The application binds to `http://0.0.0.0:3000`:

- **Web Interface:** `http://localhost:3000/`
- **Health Check:** `http://localhost:3000/health`
- **Candidate Detections:** `http://localhost:3000/api/v1/detections`
- **GeoJSON FeatureCollection:** `http://localhost:3000/api/v1/detections/geojson`
- **Detection Stats:** `http://localhost:3000/api/v1/detections/stats`
- **Processing Runs:** `http://localhost:3000/api/v1/processing/runs`

---

## 6. Running Automated Tests & Code Quality

```bash
# Node integration & unit test suite
npm test

# Python remote sensing algorithm tests
python3 -m unittest discover -s tests/python -p "test_*.py"

# Model verification & precision suite
python3 -u scripts/verify_models.py

# TypeScript & code quality checks
npm run lint
```
