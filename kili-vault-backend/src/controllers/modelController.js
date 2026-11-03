/**
/**
 * Kili-Vault: Model Management & Automation Controller
 * Exposes model status, automated training, verification, and pipeline runs.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const logger = require("../utils/logger");

const ROOT_DIR = path.resolve(__dirname, "../../");

/**
 * GET /api/v1/models/status
 * Returns operational status of Model A, Model B (Prithvi), and Ensemble.
 */
exports.getStatus = async (req, res, next) => {
  try {
    const checkpointsDir = path.join(ROOT_DIR, "models/checkpoints");
    const trainingReportPath = path.join(
      ROOT_DIR,
      "output/training_report.json",
    );
    const pipelineSummaryPath = path.join(
      ROOT_DIR,
      "output/pipeline_execution_summary.json",
    );

    let baselineConfig = null;
    let ensembleConfig = null;
    let prithviHeadConfig = null;
    let lastTrainingReport = null;
    let lastPipelineSummary = null;
    const prithviCheckpointPath = path.join(
      ROOT_DIR,
      "models/prithvi/Prithvi_EO_V2_300M_TL.pt",
    );
    const prithviArchitecturePath = path.join(
      ROOT_DIR,
      "models/prithvi/official_prithvi_mae.py",
    );
    const prithviConfigPath = path.join(ROOT_DIR, "models/prithvi/config.json");

    if (fs.existsSync(path.join(checkpointsDir, "baseline_calibrated.json"))) {
      baselineConfig = JSON.parse(
        fs.readFileSync(
          path.join(checkpointsDir, "baseline_calibrated.json"),
          "utf8",
        ),
      );
    }
    if (fs.existsSync(path.join(checkpointsDir, "ensemble_config.json"))) {
      ensembleConfig = JSON.parse(
        fs.readFileSync(
          path.join(checkpointsDir, "ensemble_config.json"),
          "utf8",
        ),
      );
    }
    if (fs.existsSync(path.join(checkpointsDir, "prithvi_change_head.json"))) {
      const headRaw = JSON.parse(
        fs.readFileSync(
          path.join(checkpointsDir, "prithvi_change_head.json"),
          "utf8",
        ),
      );
      prithviHeadConfig = {
        model_architecture: headRaw.model_architecture,
        feature_dim: headRaw.feature_dim,
        classes: headRaw.classes,
        best_validation_f1: headRaw.best_validation_f1,
      };
    }
    const prithviReady =
      fs.existsSync(prithviCheckpointPath) &&
      fs.statSync(prithviCheckpointPath).size > 0 &&
      fs.existsSync(prithviArchitecturePath) &&
      fs.existsSync(prithviConfigPath) &&
      prithviHeadConfig !== null &&
      prithviHeadConfig.feature_dim === 3072;
    if (fs.existsSync(trainingReportPath)) {
      lastTrainingReport = JSON.parse(
        fs.readFileSync(trainingReportPath, "utf8"),
      );
    }
    if (fs.existsSync(pipelineSummaryPath)) {
      lastPipelineSummary = JSON.parse(
        fs.readFileSync(pipelineSummaryPath, "utf8"),
      );
    }

    res.json({
      status: "operational",
      models: {
        model_a_spectral_baseline: {
          name: "Spectral Change Baseline",
          calibrated: baselineConfig !== null,
          parameters: baselineConfig
            ? baselineConfig.calibrated_parameters
            : { delta_ndbi_threshold: 0.1, delta_ndvi_threshold: -0.1 },
          precision_met: baselineConfig
            ? baselineConfig.precision_requirement_met
            : false,
        },
        model_b_prithvi_eo: {
          name: "IBM/NASA Prithvi-EO 2.0 300M-TL",
          model_source:
            "https://huggingface.co/ibm-nasa-geospatial/Prithvi-EO-2.0-300M-TL",
          is_loaded: prithviReady,
          availability: prithviReady ? "READY" : "UNAVAILABLE",
          availability_reason: prithviReady
            ? null
            : "Official Prithvi checkpoint, architecture, and compatible task head are required.",
          change_head: prithviHeadConfig,
          required_bands: ["B2", "B3", "B4", "B8A", "B11", "B12"],
        },
        ensemble_classifier: {
          name: "Ensemble Change Classifier",
          weights: ensembleConfig
            ? ensembleConfig.weights
            : { baseline: 0.5, prithvi: 0.3, persistence: 0.2 },
          validation_metrics: ensembleConfig
            ? ensembleConfig.validation_metrics
            : {},
        },
      },
      last_training: lastTrainingReport
        ? {
            timestamp: lastTrainingReport.timestamp,
            duration_seconds: lastTrainingReport.training_duration_seconds,
            precision_met: lastTrainingReport.precision_requirement_met,
            macro_f1: lastTrainingReport.test_evaluation
              ? lastTrainingReport.test_evaluation.macro_f1
              : null,
          }
        : null,
      last_pipeline_run: lastPipelineSummary
        ? {
            pipeline_id: lastPipelineSummary.pipeline_id,
            timestamp: lastPipelineSummary.timestamp,
            duration_seconds: lastPipelineSummary.total_duration_seconds,
            status: lastPipelineSummary.status,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/models/train
 * Triggers automated model training & calibration.
 */
exports.trainModels = async (req, res, next) => {
  try {
    const epochs = req.body.epochs || 15;
    const lr = req.body.lr || 0.02;

    logger.info(`[API] Triggering model training: epochs=${epochs}, lr=${lr}`);

    exec(
      `python3 scripts/train_models.py --epochs ${epochs} --lr ${lr}`,
      { cwd: ROOT_DIR },
      (error, stdout, stderr) => {
        if (error) {
          logger.error("[API] Model training failed", {
            error: error.message,
            stderr,
          });
          return;
        }
        logger.info("[API] Model training completed successfully");
      },
    );

    res.status(202).json({
      status: "ACCEPTED",
      message: "Automated model training initiated.",
      parameters: { epochs, lr },
      check_status_url: "/api/v1/models/status",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/models/verify
 * Runs the automated model verification suite.
 */
exports.verifyModels = async (req, res, next) => {
  try {
    logger.info("[API] Running model verification suite...");

    exec(
      "python3 scripts/verify_models.py",
      { cwd: ROOT_DIR },
      (error, stdout, stderr) => {
        if (error) {
          return res.status(500).json({
            status: "FAILED",
            message: "Model verification checks failed.",
            error: error.message,
            output: stdout.split("\n").filter(Boolean),
          });
        }

        res.json({
          status: "PASSED",
          message: "All 5 model verification suites passed successfully.",
          output: stdout.split("\n").filter(Boolean),
        });
      },
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/models/pipeline/auto
 * Triggers end-to-end automated pipeline execution.
 */
exports.runPipeline = async (req, res, next) => {
  try {
    const forceRetrain = req.body.retrain ? "--retrain" : "";
    logger.info(
      `[API] Triggering automated pipeline execution ${forceRetrain}`,
    );

    exec(
      `python3 scripts/run_automated_pipeline.py ${forceRetrain}`,
      { cwd: ROOT_DIR },
      (error, stdout, stderr) => {
        if (error) {
          logger.error("[API] Automated pipeline failed", {
            error: error.message,
            stderr,
          });
          return;
        }
        logger.info("[API] Automated pipeline completed successfully");
      },
    );

    res.status(202).json({
      status: "ACCEPTED",
      message: "Automated end-to-end pipeline execution initiated.",
      check_status_url: "/api/v1/models/status",
    });
  } catch (err) {
    next(err);
  }
};
