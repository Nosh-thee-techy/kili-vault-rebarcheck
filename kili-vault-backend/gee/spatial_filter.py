"""
Kili-Vault Earth Engine: Spatial Filtering & Morphological Noise Cleanup
Removes salt-and-pepper noise, filters by minimum connected component area,
and enforces realistic candidate scale boundaries.
"""

from typing import Any


def apply_spatial_filtering(
    candidate_mask: Any,
    spatial_resolution_meters: float,
    min_area_m2: float,
    max_area_m2: float
) -> Any:
    """
    Cleans candidate raster mask using connected pixel count and area bounds.
    Sentinel-2 pixel area at 10m is 100 m2 (10m x 10m).
    """
    import ee

    pixel_area_m2 = spatial_resolution_meters * spatial_resolution_meters
    min_pixels = int(max(round(min_area_m2 / pixel_area_m2), 1))
    max_pixels = int(round(max_area_m2 / pixel_area_m2))

    # Calculate 8-connected component size
    connected = candidate_mask.connectedPixelCount(maxSize=max_pixels + 50, eightConnected=True)

    # Filter out noisy isolated single pixels or excessively large regional artifacts
    valid_size = connected.gte(min_pixels).And(connected.lte(max_pixels))

    cleaned_mask = candidate_mask.updateMask(valid_size)
    return cleaned_mask
