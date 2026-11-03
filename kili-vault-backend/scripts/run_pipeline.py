#!/usr/bin/env python3
"""Run the live Earth Engine, GeoJSON, and PostGIS pipeline as one command."""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))
LOCK_PATH = ROOT_DIR / "output" / ".production_pipeline.lock"


def acquire_pipeline_lock():
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    try:
        handle = LOCK_PATH.open("x", encoding="ascii")
        handle.write(str(os.getpid()))
        handle.close()
    except FileExistsError:
        raise SystemExit(
            f"PIPELINE_STATUS=BLOCKED\nAnother production pipeline is already running; lock: {LOCK_PATH}"
        )


def release_pipeline_lock():
    LOCK_PATH.unlink(missing_ok=True)


def run_step(label, command):
    print(f"\n=== {label} ===", flush=True)
    result = subprocess.run(command, cwd=ROOT_DIR, check=False)
    if result.returncode != 0:
        raise SystemExit(f"{label} failed with exit code {result.returncode}")


def check_prithvi(required):
    from models.prithvi.model import PrithviModelAdapter

    adapter = PrithviModelAdapter()
    status = adapter.get_status()
    if required and not status["is_loaded"]:
        raise SystemExit(
            "PRITHVI_STATUS=BLOCKED\n"
            f"{status['error_or_requirement']}\n"
            "Provide the official Prithvi checkpoint and a compatible trained change head, "
            "then rerun this command."
        )
    print(
        "PRITHVI_STATUS="
        + ("READY" if status["is_loaded"] else "BLOCKED_BASELINE_ONLY")
    )


def clear_previous_production_data():
    """Remove prior detections/runs before a deliberately fresh production run."""
    command = [
        "node", "-e",
        "const db=require('./src/repositories/db');"
        "db.query('DELETE FROM detections').then(()=>db.query('DELETE FROM detection_runs'))"
        ".then(()=>{console.log('PRODUCTION_DATA_RESET=COMPLETED');process.exit(0)})"
        ".catch(e=>{console.error(e.message);process.exit(1)})",
    ]
    run_step("Reset previous production data", command)


def start_api_server():
    process = subprocess.Popen(
        ["node", "src/server.js"],
        cwd=ROOT_DIR,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0),
    )
    print(f"API_STATUS=STARTED (PID {process.pid})")
    print("API_BASE=http://localhost:3000")


def validate_output(path):
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if data.get("type") != "FeatureCollection":
        raise SystemExit("Generated output is not a GeoJSON FeatureCollection")
    if not isinstance(data.get("features"), list):
        raise SystemExit("Generated GeoJSON features are not a list")
    print(f"Validated {len(data['features'])} GeoJSON features")


def main():
    parser = argparse.ArgumentParser(
        description="Run the complete live Kili-Vault detection pipeline")
    parser.add_argument(
        "--allow-baseline-only",
        action="store_true",
        help="Run with spectral detection when Prithvi is unavailable; never labels it as Prithvi-backed.",
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Delete existing detections and runs before the production run.",
    )
    parser.add_argument(
        "--start-api",
        action="store_true",
        help="Start the HTTP API after the pipeline and ingestion complete.",
    )
    args = parser.parse_args()
    acquire_pipeline_lock()
    try:
        run_pipeline(args)
    finally:
        release_pipeline_lock()


def run_pipeline(args):

    check_prithvi(required=not args.allow_baseline_only)
    if args.fresh:
        clear_previous_production_data()
    output_path = ROOT_DIR / "output" / "detections.geojson"
    summary_path = ROOT_DIR / "output" / "processing_summary.json"

    run_step(
        "Live Earth Engine detection",
        [sys.executable, "-u", "-m", "gee.main", "--output",
            str(output_path), "--summary", str(summary_path)],
    )
    print("[PIPELINE HANDOFF] Detection output completed; validating before ingestion.", flush=True)
    validate_output(output_path)
    print("[PIPELINE HANDOFF] Validation passed; starting PostGIS batch ingestion.", flush=True)
    run_step(
        "PostGIS batch ingestion",
        ["node", "scripts/ingest_detections.js",
            str(output_path), str(summary_path)],
    )
    if args.start_api:
        start_api_server()
    print("\nPIPELINE_STATUS=COMPLETED")
    print("API endpoints can now consume the persisted run and detections.")


if __name__ == "__main__":
    main()
