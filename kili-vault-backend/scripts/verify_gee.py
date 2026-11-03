#!/usr/bin/env python3
"""Verify Google Earth Engine authentication and Kilimani AOI access."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

from gee.auth import initialize_earth_engine, is_gee_available


def main() -> int:
    project = os.getenv("GEE_PROJECT_ID", "")
    aoi_path = os.getenv("AOI_GEOJSON_PATH", "config/kilimani_ward.geojson")
    resolved = ROOT / aoi_path

    print("\n=== Kili-Vault GEE Verification ===\n")

    if not project:
        print("✗ GEE_PROJECT_ID is not set in .env")
        return 1
    print(f"✓ GEE_PROJECT_ID = {project}")

    if resolved.exists():
        with open(resolved, encoding="utf-8") as f:
            aoi = json.load(f)
        print(f"✓ AOI loaded: {resolved.name} ({aoi.get('type', 'unknown')})")
    else:
        print(f"! AOI file not found: {resolved}")

    print("\nAuthenticating with Earth Engine...")
    if not initialize_earth_engine(project):
        print("\n✗ Earth Engine authentication failed.")
        print("  Fix: set GEE_SERVICE_ACCOUNT_KEY_PATH + GEE_SERVICE_ACCOUNT_EMAIL")
        print("   or run: earthengine authenticate\n")
        return 1

    print("✓ Earth Engine initialized")

    if is_gee_available():
        import ee

        try:
            info = ee.data.getAssetRoots()
            print(f"✓ Asset roots accessible ({len(info)} root(s))")
        except Exception as exc:  # noqa: BLE001
            print(f"! Asset list check: {exc}")

        try:
            coll = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(ee.Geometry.Point([36.782, -1.292]))
                .filterDate("2025-01-01", "2025-06-30")
                .limit(1)
            )
            count = coll.size().getInfo()
            print(f"✓ Sentinel-2 query OK (sample count in window: {count})")
        except Exception as exc:  # noqa: BLE001
            print(f"✗ Sentinel-2 query failed: {exc}")
            return 1

    print("\n✓ GEE is ready. Run pipeline with:")
    print("  python -m gee.main --output output/detections.geojson")
    print("  node scripts/ingest_detections.js\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
