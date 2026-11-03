"""
Prithvi-EO Preprocessing & Chip Preparation Module
Transforms multi-temporal Sentinel-2 optical bands into normalized tensor chips
compatible with Prithvi-EO foundation model input specifications.
"""

from typing import Dict, Any, List, Tuple
from models.prithvi.model import PRITHVI_BANDS

# Official Prithvi-EO 2.0 HLS statistics. Earth Engine reflectance is scaled
# to the 0-10000 range used by the pretrained checkpoint before normalization.
PRITHVI_MEANS = {
    "B2": 1087.0,
    "B3": 1342.0,
    "B4": 1433.0,
    "B8A": 2734.0,
    "B11": 1958.0,
    "B12": 1363.0,
}

PRITHVI_STDS = {
    "B2": 2248.0,
    "B3": 2179.0,
    "B4": 2178.0,
    "B8A": 1850.0,
    "B11": 1242.0,
    "B12": 1049.0,
}


def normalize_band_value(band_name: str, raw_reflectance: float) -> float:
    """Normalizes reflectance value using Prithvi channel statistics."""
    mean = PRITHVI_MEANS.get(band_name, 0.15)
    std = PRITHVI_STDS.get(band_name, 0.10)
    scaled_reflectance = raw_reflectance if abs(
        raw_reflectance) > 1.0 else raw_reflectance * 10000.0
    return (scaled_reflectance - mean) / std


def prepare_multitemporal_chip(
    t1_bands: Dict[str, float],
    t2_bands: Dict[str, float],
    chip_size: int = 64,
) -> Dict[str, Any]:
    """
    Prepares a normalized 2-timestep chip feature vector from Sentinel-2 observation bands.
    Returns structured chip data ready for foundation model feature extraction.
    """
    missing_t1 = [b for b in PRITHVI_BANDS if b not in t1_bands]
    missing_t2 = [b for b in PRITHVI_BANDS if b not in t2_bands]

    if missing_t1 or missing_t2:
        raise ValueError(
            f"Missing required Prithvi bands: t1 missing {missing_t1}, t2 missing {missing_t2}. "
            f"Required bands: {PRITHVI_BANDS}"
        )

    t1_norm = [normalize_band_value(b, t1_bands[b]) for b in PRITHVI_BANDS]
    t2_norm = [normalize_band_value(b, t2_bands[b]) for b in PRITHVI_BANDS]

    return {
        "chip_size": chip_size,
        "timesteps": 2,
        "bands": PRITHVI_BANDS,
        "t1_normalized": t1_norm,
        "t2_normalized": t2_norm,
    }
