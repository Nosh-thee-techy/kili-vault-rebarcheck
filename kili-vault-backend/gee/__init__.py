"""
Kili-Vault Earth Engine Module
Exporting client, imagery discovery, preprocessing, and indices computation.
"""

from gee.client import initialize_earth_engine, is_gee_available
from gee.indices import (
    calculate_ndvi_numeric,
    calculate_ndbi_numeric,
    calculate_ndwi_numeric,
    add_indices_ee,
)
from gee.preprocessing import mask_s2_clouds_scl, mask_s2_clouds_qa60, preprocess_s2_image
from gee.imagery import get_s2_collection, create_temporal_composite

__all__ = [
    "initialize_earth_engine",
    "is_gee_available",
    "calculate_ndvi_numeric",
    "calculate_ndbi_numeric",
    "calculate_ndwi_numeric",
    "add_indices_ee",
    "mask_s2_clouds_scl",
    "mask_s2_clouds_qa60",
    "preprocess_s2_image",
    "get_s2_collection",
    "create_temporal_composite",
]
