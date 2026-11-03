"""
Sentinel-2 Imagery Discovery & Compositing Module
Manages multi-temporal Earth Engine ImageCollections:
- AOI spatial filtering
- Date window filtering
- Cloud coverage metadata filtering
- Cloud-masked median compositing
"""

import logging
from typing import Dict, Any, Tuple
from gee.preprocessing import preprocess_s2_image
from gee.indices import add_indices_ee

logger = logging.getLogger("kili-vault.gee.imagery")


def get_s2_collection(aoi_geometry, start_date: str, end_date: str, cloud_threshold: float = 20.0):
    """
    Loads, filters, and cloud-masks the Sentinel-2 Surface Reflectance collection.
    Collection: COPERNICUS/S2_SR_HARMONIZED
    """
    import ee  # Lazy import to allow offline testing

    col = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(aoi_geometry)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud_threshold))
        .map(preprocess_s2_image)
        .map(add_indices_ee)
    )
    return col


def create_temporal_composite(collection, aoi_geometry) -> Tuple[Any, Any]:
    """
    Generates a cloud-free median composite and observation count mask from an ImageCollection.
    Returns: (composite_image, valid_observations_count_image)
    """
    import ee

    composite = collection.median().clip(aoi_geometry)
    # Count valid (unmasked) observations per pixel using B4 (Red)
    obs_count = collection.select("B4").count().clip(aoi_geometry).rename("VALID_OBS")
    return composite, obs_count
