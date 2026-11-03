"""
Kili-Vault Earth Engine: Area of Interest (AOI) Loader
Loads the operational boundary for Kilimani Ward from a configured GEE Asset or local GeoJSON file.
Coordinates are NEVER hardcoded into source code.
"""

import json
import os
import sys
from typing import Any


def load_aoi() -> Any:
    """
    Loads AOI as an Earth Engine Geometry or FeatureCollection.
    Prioritizes GEE_AOI_ASSET if set, otherwise reads from AOI_GEOJSON_PATH.
    Fails clearly if neither is available.
    """
    import ee
    from gee.config import config

    # Approach 1: Load from configured Earth Engine Asset
    if config.aoi_asset and config.aoi_asset.strip():
        asset_path = config.aoi_asset.strip()
        print(f"[AOI] Loading AOI boundary from Earth Engine Asset: {asset_path}")
        try:
            fc = ee.FeatureCollection(asset_path)
            return fc.geometry()
        except Exception as e:
            print(f"[AOI ERROR] Failed to load Earth Engine asset '{asset_path}': {str(e)}", file=sys.stderr)
            raise

    # Approach 2: Load from configured GeoJSON file
    geojson_path = config.aoi_geojson_path
    if not os.path.exists(geojson_path):
        # Check relative to repo root
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        alt_path = os.path.join(repo_root, geojson_path)
        if os.path.exists(alt_path):
            geojson_path = alt_path
        else:
            raise FileNotFoundError(
                f"[AOI ERROR] Configured AOI GeoJSON file not found at '{geojson_path}' or '{alt_path}'. "
                "Ensure AOI_GEOJSON_PATH points to a valid file."
            )

    print(f"[AOI] Loading AOI boundary from local GeoJSON: {geojson_path}")
    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Extract polygon coordinates from GeoJSON
    if data.get("type") == "FeatureCollection" and len(data.get("features", [])) > 0:
        geom_data = data["features"][0]["geometry"]
    elif data.get("type") == "Feature":
        geom_data = data["geometry"]
    elif "coordinates" in data:
        geom_data = data
    else:
        raise ValueError(f"[AOI ERROR] Unrecognized GeoJSON structure in '{geojson_path}'")

    if geom_data.get("type") != "Polygon":
        raise ValueError(f"[AOI ERROR] Expected Polygon geometry for AOI, got: {geom_data.get('type')}")

    coordinates = geom_data["coordinates"]
    # Return as Earth Engine Geometry in EPSG:4326 (WGS84)
    return ee.Geometry.Polygon(coords=coordinates, proj="EPSG:4326", geodesic=True)
