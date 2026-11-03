"""
Dataset Generator & Preprocessing for Earth Observation Change Detection
Generates multi-temporal Sentinel-2 chips and feature vectors based on
Kilimani Ward urban morphology and remote sensing signatures.
"""

import os
import json
import random
import logging
from typing import Dict, Any, List, Tuple

logger = logging.getLogger("kili-vault.data.generator")

CLASSES = [
    "BUILDING_DEVELOPMENT",
    "INFRASTRUCTURE_CHANGE",
    "LAND_CLEARING",
    "VEGETATION_CHANGE",
    "SURFACE_CHANGE",
    "NO_CHANGE",
]

# Standard Sentinel-2 optical bands required by Prithvi
BANDS = ["B2", "B3", "B4", "B8A", "B11", "B12"]


def _generate_synthetic_chip_profile(label: str, seed: int) -> Dict[str, Any]:
    """Generates realistic spectral values and temporal shifts for each class."""
    rng = random.Random(seed)

    if label == "BUILDING_DEVELOPMENT":
        # T1: vegetated or low-density surface -> T2: high NDBI, low NDVI, high SWIR
        t1_ndvi = rng.uniform(0.35, 0.65)
        t2_ndvi = rng.uniform(0.08, 0.22)
        t1_ndbi = rng.uniform(-0.25, -0.05)
        t2_ndbi = rng.uniform(0.12, 0.35)
        aspect_ratio = rng.uniform(1.0, 2.2)  # Compact polygonal building footprint
        temporal_persistence = rng.uniform(0.80, 0.98)
        area_m2 = rng.uniform(250.0, 2500.0)

    elif label == "INFRASTRUCTURE_CHANGE":
        # Linear feature: road resurfacing, trenching, paving
        t1_ndvi = rng.uniform(0.20, 0.45)
        t2_ndvi = rng.uniform(0.05, 0.20)
        t1_ndbi = rng.uniform(-0.15, 0.05)
        t2_ndbi = rng.uniform(0.10, 0.30)
        aspect_ratio = rng.uniform(3.4, 7.5)  # Elongated linear corridor
        temporal_persistence = rng.uniform(0.70, 0.95)
        area_m2 = rng.uniform(600.0, 5000.0)

    elif label == "LAND_CLEARING":
        # Canopy removal exposing bare dry soil without building construction (NDBI remains <= 0)
        t1_ndvi = rng.uniform(0.40, 0.70)
        t2_ndvi = rng.uniform(0.10, 0.25)
        t1_ndbi = rng.uniform(-0.30, -0.15)
        t2_ndbi = rng.uniform(-0.10, -0.01)  # Bare soil: negative/neutral NDBI
        aspect_ratio = rng.uniform(1.1, 2.5)
        temporal_persistence = rng.uniform(0.50, 0.85)
        area_m2 = rng.uniform(400.0, 3500.0)

    elif label == "VEGETATION_CHANGE":
        # Seasonal greening or canopy growth
        t1_ndvi = rng.uniform(0.20, 0.38)
        t2_ndvi = rng.uniform(0.42, 0.72)
        t1_ndbi = rng.uniform(-0.10, 0.05)
        t2_ndbi = rng.uniform(-0.28, -0.12)
        aspect_ratio = rng.uniform(1.0, 2.5)
        temporal_persistence = rng.uniform(0.40, 0.80)
        area_m2 = rng.uniform(300.0, 2000.0)

    elif label == "SURFACE_CHANGE":
        # Minor transient modification (parking, temporary materials)
        t1_ndvi = rng.uniform(0.15, 0.30)
        t2_ndvi = rng.uniform(0.12, 0.28)
        t1_ndbi = rng.uniform(0.02, 0.15)
        t2_ndbi = rng.uniform(0.05, 0.18)
        aspect_ratio = rng.uniform(1.0, 2.8)
        temporal_persistence = rng.uniform(0.10, 0.32)  # Low persistence
        area_m2 = rng.uniform(150.0, 800.0)

    else:  # NO_CHANGE
        # Stable baseline (existing structures or unchanged surfaces)
        base_ndvi = rng.uniform(0.15, 0.55)
        base_ndbi = rng.uniform(-0.20, 0.20)
        t1_ndvi = base_ndvi
        t2_ndvi = base_ndvi + rng.uniform(-0.03, 0.03)
        t1_ndbi = base_ndbi
        t2_ndbi = base_ndbi + rng.uniform(-0.03, 0.03)
        aspect_ratio = rng.uniform(1.0, 2.5)
        temporal_persistence = rng.uniform(0.90, 1.0)
        area_m2 = rng.uniform(200.0, 1500.0)

    # Derive synthetic reflectance bands roughly corresponding to indices
    # B2 (Blue), B3 (Green), B4 (Red), B8A (NIR), B11 (SWIR1), B12 (SWIR2)
    b4_t1 = rng.uniform(0.04, 0.10)
    b8a_t1 = (b4_t1 * (1 + t1_ndvi)) / max(0.01, (1 - t1_ndvi))
    b11_t1 = (b8a_t1 * (1 + t1_ndbi)) / max(0.01, (1 - t1_ndbi))

    b4_t2 = rng.uniform(0.05, 0.12)
    b8a_t2 = (b4_t2 * (1 + t2_ndvi)) / max(0.01, (1 - t2_ndvi))
    b11_t2 = (b8a_t2 * (1 + t2_ndbi)) / max(0.01, (1 - t2_ndbi))

    t1_bands = {
        "B2": round(rng.uniform(0.02, 0.06), 4),
        "B3": round(rng.uniform(0.03, 0.08), 4),
        "B4": round(b4_t1, 4),
        "B8A": round(b8a_t1, 4),
        "B11": round(b11_t1, 4),
        "B12": round(b11_t1 * rng.uniform(0.7, 0.95), 4),
    }

    t2_bands = {
        "B2": round(rng.uniform(0.02, 0.07), 4),
        "B3": round(rng.uniform(0.03, 0.09), 4),
        "B4": round(b4_t2, 4),
        "B8A": round(b8a_t2, 4),
        "B11": round(b11_t2, 4),
        "B12": round(b11_t2 * rng.uniform(0.7, 0.95), 4),
    }

    # Center coordinates around Kilimani Ward (lat -1.29 to -1.30, lon 36.76 to 36.80)
    lat = round(-1.295 + rng.uniform(-0.015, 0.015), 6)
    lon = round(36.785 + rng.uniform(-0.015, 0.015), 6)

    return {
        "label": label,
        "spectral": {
            "ndvi_before": round(t1_ndvi, 4),
            "ndvi_after": round(t2_ndvi, 4),
            "delta_ndvi": round(t2_ndvi - t1_ndvi, 4),
            "ndbi_before": round(t1_ndbi, 4),
            "ndbi_after": round(t2_ndbi, 4),
            "delta_ndbi": round(t2_ndbi - t1_ndbi, 4),
            "ndwi_before": round(rng.uniform(-0.3, -0.1), 4),
            "ndwi_after": round(rng.uniform(-0.3, -0.1), 4),
        },
        "spatial": {
            "aspect_ratio": round(aspect_ratio, 2),
            "area_m2": round(area_m2, 1),
            "centroid": {"lat": lat, "lon": lon},
        },
        "temporal_persistence": round(temporal_persistence, 4),
        "bands_t1": t1_bands,
        "bands_t2": t2_bands,
    }


def generate_dataset(
    output_dir: str = "data",
    n_train: int = 120,
    n_val: int = 40,
    n_test: int = 40,
) -> Dict[str, int]:
    """
    Generates a balanced dataset of labelled multi-temporal chips.
    Returns counts per split.
    """
    splits = {
        "train": (n_train, os.path.join(output_dir, "train")),
        "validation": (n_val, os.path.join(output_dir, "validation")),
        "test": (n_test, os.path.join(output_dir, "test")),
    }

    counts = {}
    seed_counter = 42

    for split_name, (count, directory) in splits.items():
        os.makedirs(directory, exist_ok=True)
        # Clear existing json chips in split
        for f in os.listdir(directory):
            if f.endswith(".json"):
                os.remove(os.path.join(directory, f))

        per_class = max(1, count // len(CLASSES))
        written = 0

        for cls in CLASSES:
            for i in range(per_class):
                seed_counter += 1
                chip = _generate_synthetic_chip_profile(cls, seed_counter)
                chip["chip_id"] = f"{split_name}_{cls.lower()}_{i:03d}"
                chip_path = os.path.join(directory, f"{chip['chip_id']}.json")
                with open(chip_path, "w") as f:
                    json.dump(chip, f, indent=2)
                written += 1

        counts[split_name] = written
        logger.info("Generated %d chips for '%s' in %s", written, split_name, directory)

    return counts


def ensure_dataset(data_dir: str = "data") -> Dict[str, int]:
    """Verifies dataset exists; generates automatically if empty."""
    train_dir = os.path.join(data_dir, "train")
    chips = [f for f in os.listdir(train_dir) if f.endswith(".json")] if os.path.exists(train_dir) else []
    if not chips:
        logger.info("Training dataset not found or empty. Automatically generating training chips...")
        return generate_dataset(data_dir)
    return {
        "train": len(chips),
        "validation": len([f for f in os.listdir(os.path.join(data_dir, "validation")) if f.endswith(".json")]),
        "test": len([f for f in os.listdir(os.path.join(data_dir, "test")) if f.endswith(".json")]),
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = generate_dataset()
    print("Dataset generation completed:", res)
