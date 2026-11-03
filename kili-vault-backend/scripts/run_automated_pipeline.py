#!/usr/bin/env python3
"""
Kili-Vault Automated End-to-End Pipeline Orchestrator
Automates the full Earth Observation and Model Lifecycle:
1. Model training and parameter calibration (Model A spectral baseline + Model B Prithvi head + Ensemble weights)
2. Multi-temporal Earth Engine detection processing (Sentinel-2 L2A across Kilimani Ward)
3. Detection validation, spatial deduplication, and database ingestion
4. Automated verification asserting >= 80% precision and false-positive suppression

Usage:
    python3 scripts/run_automated_pipeline.py [--retrain] [--dry-run]
"""

import os
import sys
import json
import logging
import argparse
import subprocess
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("kili-vault.pipeline")

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run_step(step_name: str, command: list, cwd: str = ROOT_DIR, allow_failure: bool = False) -> dict:
    """Execute a subprocess while relaying output as it is produced."""
    logger.info(
        "------------------------------------------------------------------")
    logger.info(">>> STEP: %s", step_name)
    logger.info("    Command: %s", " ".join(command))
    logger.info(
        "------------------------------------------------------------------")
    start = datetime.utcnow()

    proc = subprocess.Popen(
        command,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
    )
    output_lines = []
    assert proc.stdout is not None
    for line in proc.stdout:
        line = line.rstrip("\r\n")
        output_lines.append(line)
        logger.info("[%s] %s", step_name, line)
    proc.wait()
    duration = (datetime.utcnow() - start).total_seconds()

    success = proc.returncode == 0
    if success:
        logger.info("✓ %s completed successfully in %.2fs",
                    step_name, duration)
    else:
        logger.warning("! %s exited with code %d in %.2fs",
                       step_name, proc.returncode, duration)
        if not allow_failure:
            logger.error("Command output:\n%s", "\n".join(output_lines))
            raise RuntimeError(
                f"Pipeline step '{step_name}' failed with exit code {proc.returncode}")

    return {
        "step": step_name,
        "command": command,
        "exit_code": proc.returncode,
        "duration_seconds": round(duration, 2),
        "success": success,
        "output_preview": output_lines[-10:],
    }


def execute_pipeline(force_retrain: bool = False, dry_run: bool = True) -> dict:
    """Executes the full automated Earth Observation pipeline."""
    pipeline_start = datetime.utcnow()
    logger.info(
        "==================================================================")
    logger.info(" KILI-VAULT: END-TO-END AUTOMATED EARTH OBSERVATION PIPELINE")
    logger.info(" Target AOI: Kilimani Ward, Nairobi, Kenya")
    logger.info(" Timestamp: %s", pipeline_start.isoformat() + "Z")
    logger.info(
        "==================================================================")

    step_results = []

    # Step 1: Automated Model Training & Calibration
    checkpoints_exist = (
        os.path.exists(os.path.join(
            ROOT_DIR, "models/checkpoints/prithvi_change_head.json"))
        and os.path.exists(os.path.join(ROOT_DIR, "models/checkpoints/baseline_calibrated.json"))
        and os.path.exists(os.path.join(ROOT_DIR, "models/checkpoints/ensemble_config.json"))
    )

    if force_retrain or not checkpoints_exist:
        logger.info("Training or re-calibrating models...")
        res_train = run_step("Model Training & Calibration", [
            sys.executable, "-u", "scripts/train_models.py"])
        step_results.append(res_train)
    else:
        logger.info(
            "Existing model checkpoints verified. Verifying current model state...")
        step_results.append({
            "step": "Model Checkpoints",
            "success": True,
            "status": "Checkpoints present in models/checkpoints/",
        })

    # Step 2: Earth Engine Detection Generation
    gee_args = [sys.executable, "-u", "-m", "gee.main"]
    if dry_run:
        gee_args.append("--dry-run")
    res_gee = run_step("Earth Engine Detection Generation", gee_args)
    step_results.append(res_gee)

    # Step 3: Ingest Detections into Database
    detections_file = os.path.join(ROOT_DIR, "output/detections.geojson")
    summary_file = os.path.join(ROOT_DIR, "output/processing_summary.json")

    res_ingest = run_step(
        "Database Ingestion & Deduplication",
        ["node", "scripts/ingest_detections.js", detections_file, summary_file],
    )
    step_results.append(res_ingest)

    # Step 4: Run Verification Suite
    res_verify = run_step("Model Integrity & Precision Verification", [
                          sys.executable, "-u", "scripts/verify_models.py"])
    step_results.append(res_verify)

    pipeline_end = datetime.utcnow()
    total_duration = (pipeline_end - pipeline_start).total_seconds()

    summary = {
        "status": "success",
        "pipeline_id": f"pipe_run_{int(pipeline_start.timestamp())}",
        "timestamp": pipeline_end.isoformat() + "Z",
        "total_duration_seconds": round(total_duration, 2),
        "steps": step_results,
        "output_artifacts": {
            "training_report": "output/training_report.json",
            "detections_geojson": "output/detections.geojson",
            "processing_summary": "output/processing_summary.json",
            "checkpoints": [
                "models/checkpoints/baseline_calibrated.json",
                "models/checkpoints/prithvi_change_head.json",
                "models/checkpoints/ensemble_config.json",
            ],
        },
    }

    os.makedirs(os.path.join(ROOT_DIR, "output"), exist_ok=True)
    summary_path = os.path.join(
        ROOT_DIR, "output/pipeline_execution_summary.json")
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)

    logger.info(
        "==================================================================")
    logger.info("✓ FULL AUTOMATED PIPELINE EXECUTION COMPLETED SUCCESSFULLY")
    logger.info("  Total Duration: %.2fs", total_duration)
    logger.info("  Summary saved to: %s", summary_path)
    logger.info(
        "==================================================================")

    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Automated EO Pipeline Orchestrator")
    parser.add_argument("--retrain", action="store_true",
                        help="Force retrain models")
    parser.add_argument("--no-dry-run", dest="dry_run",
                        action="store_false", help="Run live GEE if configured")
    parser.set_defaults(dry_run=False)
    args = parser.parse_args()

    execute_pipeline(force_retrain=args.retrain, dry_run=args.dry_run)
