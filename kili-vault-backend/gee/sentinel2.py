"""
Kili-Vault Earth Engine: Sentinel-2 Data Access & Temporal Filtering
Queries Copernicus Sentinel-2 Harmonized Surface Reflectance (COPERNICUS/S2_SR_HARMONIZED).
"""

from typing import Any


def get_sentinel2_collection(aoi: Any, start_date: str, end_date: str, cloud_threshold: float) -> Any:
    """
    Retrieves and filters Sentinel-2 Surface Reflectance collection by AOI, date range,
    and metadata cloud percentage.
    """
    import ee

    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(aoi)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud_threshold))
    )

    return collection
