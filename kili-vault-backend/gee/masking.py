"""
Kili-Vault Earth Engine: Cloud & Shadow Masking Module
Applies pixel-level quality masking using the Scene Classification Layer (SCL) and QA60 band,
and computes valid observation counts per pixel across the temporal compositing window.
"""

from typing import Any


def mask_s2_clouds_and_shadows(image: Any) -> Any:
    """
    Masks clouds, cirrus, and cloud shadows in Sentinel-2 Surface Reflectance using SCL and QA60.
    """
    import ee

    # Scene Classification Layer (SCL)
    scl = image.select("SCL")

    # Keep only clear pixels:
    # 4 = Vegetation, 5 = Bare soil/built-up, 6 = Water, 7 = Unclassified
    # Exclude: 3 = Cloud shadows, 8 = Cloud med prob, 9 = Cloud high prob, 10 = Cirrus, 1 = Defective
    clear_scl = (
        scl.neq(1)   # Defective
        .And(scl.neq(3))  # Cloud shadow
        .And(scl.neq(8))  # Cloud medium probability
        .And(scl.neq(9))  # Cloud high probability
        .And(scl.neq(10)) # Thin cirrus
    )

    # QA60 Bitmask check as secondary backup
    qa = image.select("QA60")
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    clear_qa = qa.bitwiseAnd(cloud_bit_mask).eq(0).And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))

    mask = clear_scl.And(clear_qa)

    # Scale surface reflectance bands (0-10000 -> 0.0-1.0)
    optical_bands = image.select(["B2", "B3", "B4", "B8", "B11", "B12"]).divide(10000.0)

    # Add single binary valid observation band for count calculation
    valid_band = ee.Image(1).rename("valid_observation").updateMask(mask)

    return image.addBands(optical_bands, None, True).addBands(valid_band).updateMask(mask)


def compute_valid_observation_count(collection: Any, aoi: Any) -> Any:
    """
    Sums the number of valid (unmasked) cloud-free observations per pixel in the collection.
    """
    masked_col = collection.map(mask_s2_clouds_and_shadows)
    obs_count = masked_col.select("valid_observation").sum().clip(aoi)
    return obs_count
