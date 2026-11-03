# Kili-Vault Earth Observation Training & Evaluation Data

This directory stores satellite imagery, chips, and ground-truth validation labels for the Kilimani Ward Earth Observation Detection Engine.

## Directory Structure

```
data/
├── raw/            # Raw Sentinel-2 L2A Granules / GeoTIFFs (B2, B3, B4, B8, B8A, B11, B12, SCL)
├── chips/          # Extracted 64x64 pixel image chips paired across T1 (baseline) and T2 (recent)
├── labels/         # Ground-truth GIS polygons / GeoJSON validated by physical site verification
├── train/          # Labelled training chips for Prithvi-EO change classifier fine-tuning
├── validation/     # Validation set for hyperparameter tuning and model checkpointing
└── test/           # Independent evaluation set for precision benchmarking
```

## Chip Specification for Prithvi-EO Adaptation

- **Dimensions**: 64 x 64 pixels (10m spatial resolution = 640m x 640m ground footprint)
- **Timesteps**: 2 (T1: Baseline period composite; T2: Recent period composite)
- **Channels**: 6 optical bands:
  1. `B2` (Blue, 490 nm)
  2. `B3` (Green, 560 nm)
  3. `B4` (Red, 665 nm)
  4. `B8A` (Narrow NIR, 865 nm)
  5. `B11` (SWIR-1, 1610 nm)
  6. `B12` (SWIR-2, 2190 nm)
- **Normalization**: Standard HLS / Sentinel-2 mean and standard deviation per channel (see `models/prithvi/preprocessing.py`).

## Target Class Vocabulary

Each labelled chip pair maps to one of the 6 standardized classes:
1. `BUILDING_DEVELOPMENT`: New physical structure, excavation, foundation, or roof construction.
2. `INFRASTRUCTURE_CHANGE`: Linear road resurfacing, trenching, paving, utility corridors.
3. `LAND_CLEARING`: Vegetation removal exposing bare ground/soil without building construction.
4. `VEGETATION_CHANGE`: Seasonal greening, canopy regrowth, or natural foliage thinning.
5. `SURFACE_CHANGE`: Minor surface modifications, parking lot resurfacing, temporary materials.
6. `UNKNOWN`: Unresolved spectral variations or low-confidence ambiguous change.
