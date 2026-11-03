"""
Sentinel-2 Preprocessing & Masking Module
Implements cloud, shadow, and cirrus masking using Scene Classification (SCL)
and QA60 bitmask flags for COPERNICUS/S2_SR_HARMONIZED.
"""


def mask_s2_clouds_scl(image):
    """
    Masks clouds and shadows using the Sentinel-2 Scene Classification Layer (SCL).
    SCL Class Values:
      0 = NO_DATA
      1 = SATURATED_OR_DEFECTIVE
      2 = DARK_AREA_PIXELS
      3 = CLOUD_SHADOWS (Masked)
      4 = VEGETATION
      5 = NOT_VEGETATED
      6 = WATER
      7 = UNCLASSIFIED
      8 = CLOUD_MEDIUM_PROBABILITY (Masked)
      9 = CLOUD_HIGH_PROBABILITY (Masked)
      10 = THIN_CIRRUS (Masked)
      11 = SNOW (Masked)
    """
    scl = image.select("SCL")
    # Mask out shadows (3), medium clouds (8), high clouds (9), cirrus (10), snow (11)
    mask = (
        scl.neq(3)
        .And(scl.neq(8))
        .And(scl.neq(9))
        .And(scl.neq(10))
        .And(scl.neq(11))
        .And(scl.neq(1))
    )
    return image.updateMask(mask)


def mask_s2_clouds_qa60(image):
    """
    Fallback cloud mask using QA60 quality band for Sentinel-2 Level-2A.
    Bits 10 (Opaque clouds) and 11 (Cirrus clouds).
    """
    qa = image.select("QA60")
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    mask = qa.bitwiseAnd(cloud_bit_mask).eq(0).And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
    return image.updateMask(mask)


def preprocess_s2_image(image):
    """
    Complete single-image preprocessing pipeline:
    1. Apply SCL mask
    2. Rescale reflectance bands from integer (0-10000) to float (0.0-1.0)
    """
    masked = mask_s2_clouds_scl(image)
    optical_bands = ["B2", "B3", "B4", "B8", "B8A", "B11", "B12"]
    scaled = masked.select(optical_bands).divide(10000.0)
    return masked.addBands(scaled, optical_bands, True)
