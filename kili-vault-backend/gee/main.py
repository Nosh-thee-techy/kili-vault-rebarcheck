#!/usr/bin/env python3
"""
Kili-Vault Earth Engine CLI Entry Point
Executes the Kilimani Ward remote sensing detection pipeline and writes output files.
Usage:
    python -m gee.main [--output output/detections.geojson] [--summary output/processing_summary.json] [--dry-run]
"""

import argparse
import json
import os
import sys

from gee.pipeline import KiliVaultPipeline
from gee.geojson import save_geojson


def main():
    parser = argparse.ArgumentParser(description="Kili-Vault Sentinel-2 Remote Sensing Pipeline")
    parser.add_argument(
        "--output",
        "-o",
        default="output/detections.geojson",
        help="Path for output GeoJSON FeatureCollection (default: output/detections.geojson)",
    )
    parser.add_argument(
        "--summary",
        "-s",
        default="output/processing_summary.json",
        help="Path for output processing summary JSON (default: output/processing_summary.json)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate run without invoking Earth Engine servers",
    )

    args = parser.parse_args()

    # Ensure output directory exists
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(args.summary)), exist_ok=True)

    pipeline = KiliVaultPipeline()
    result = pipeline.run(dry_run=args.dry_run)

    # Write GeoJSON
    save_geojson(result["geojson"], args.output)
    print(f"[OUTPUT] Saved detections GeoJSON to: {args.output}")

    # Write Summary
    with open(args.summary, "w", encoding="utf-8") as f:
        json.dump(result["summary"], f, indent=2)
    print(f"[OUTPUT] Saved processing summary to: {args.summary}")

    if result["summary"]["status"] == "FAILED":
        sys.exit(1)


if __name__ == "__main__":
    main()
