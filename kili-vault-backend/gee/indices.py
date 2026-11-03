"""
Sentinel-2 Normalized Spectral Indices Module
Implements standard remote sensing indices for Earth Engine images and offline numeric arrays.
- NDVI: Normalized Difference Vegetation Index (B8 NIR, B4 Red)
- NDBI: Normalized Difference Built-Up Index (B11 SWIR-1, B8 NIR)
- NDWI: Normalized Difference Water Index (B3 Green, B8 NIR)
"""

from typing import Dict, Any


def calculate_ndvi_numeric(nir: float, red: float, epsilon: float = 1e-6) -> float:
    """Calculates NDVI: (NIR - Red) / (NIR + Red). Output bounded [-1.0, 1.0]."""
    denom = nir + red
    if abs(denom) < epsilon:
        return 0.0
    val = (nir - red) / denom
    return max(-1.0, min(1.0, float(val)))


def calculate_ndbi_numeric(swir1: float, nir: float, epsilon: float = 1e-6) -> float:
    """Calculates NDBI: (SWIR1 - NIR) / (SWIR1 + NIR). Output bounded [-1.0, 1.0]."""
    denom = swir1 + nir
    if abs(denom) < epsilon:
        return 0.0
    val = (swir1 - nir) / denom
    return max(-1.0, min(1.0, float(val)))


def calculate_ndwi_numeric(green: float, nir: float, epsilon: float = 1e-6) -> float:
    """Calculates NDWI: (Green - NIR) / (Green + NIR). Output bounded [-1.0, 1.0]."""
    denom = green + nir
    if abs(denom) < epsilon:
        return 0.0
    val = (green - nir) / denom
    return max(-1.0, min(1.0, float(val)))


def add_indices_ee(image):
    """
    Computes and attaches NDVI, NDBI, and NDWI bands to a Sentinel-2 Earth Engine Image.
    Band mappings:
      B3 = Green
      B4 = Red
      B8 = NIR (10m)
      B11 = SWIR-1 (20m)
    """
    ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI")
    ndbi = image.normalizedDifference(["B11", "B8"]).rename("NDBI")
    ndwi = image.normalizedDifference(["B3", "B8"]).rename("NDWI")
    return image.addBands([ndvi, ndbi, ndwi])


def create_temporal_composite(collection: Any, aoi: Any) -> Any:
    """
    Generates a cloud-masked temporal median composite over the AOI and attaches
    spectral indices (NDVI, NDBI, NDWI) and valid observation count band.
    """
    from gee.masking import mask_s2_clouds_and_shadows, compute_valid_observation_count

    masked_col = collection.map(mask_s2_clouds_and_shadows)
    obs_count = compute_valid_observation_count(collection, aoi).rename("observation_count")

    composite = masked_col.median().clip(aoi)
    composite_with_indices = add_indices_ee(composite)

    return composite_with_indices.addBands(obs_count)
