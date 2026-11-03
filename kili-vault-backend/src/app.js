/**
 * Kili-Vault: Express Application Setup
 * Earth Observation Detection Engine API
 */
"use strict";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const requestIdMiddleware = require("./middleware/requestId");
const requestLoggerMiddleware = require("./middleware/logger");
const {
  errorHandlerMiddleware,
  AppError,
} = require("./middleware/errorHandler");
const healthController = require("./health/healthController");
const v1Router = require("./routes");

const app = express();

// 1. Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// 2. CORS Configuration
app.use(
  cors({
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-User-Role',
      'X-User-Id',
      'X-User-Name',
    ],
    credentials: true,
  }),
);

// 3. Rate Limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
      details: {},
    },
  },
});
app.use(limiter);

// 4. Request parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 5. Request Correlation ID & Logging
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// 6. Health & Liveness / Readiness Probes (Root level)
app.get("/health", healthController.getHealth);
app.get("/health/live", healthController.getLive);
app.get("/health/ready", healthController.getReady);

// 7. Detection & Model Engine API Index (/ and /api)
const getEngineInfo = (req, res) => {
  res.json({
    service: "kili-vault-detection-engine",
    description:
      "Sentinel-2 Multi-Temporal Earth Observation Detection & Automated Model Training Engine for Kilimani Ward, Nairobi.",
    status: "operational",
    model_version: "kili-vault-dev-v0.1",
    aoi: {
      ward: "Kilimani",
      sub_county: "Dagoretti North",
      county: "Nairobi",
      country: "Kenya",
    },
    pipeline:
      "SENTINEL-2 -> TEMPORAL COMPOSITE -> SPECTRAL DIFFERENCING -> PRITHVI-EO ADAPTER -> ENSEMBLE -> FALSE-POSITIVE FILTER -> GEOJSON",
    endpoints: {
      health: "/health",
      models: {
        status: "/api/v1/models/status",
        train: "POST /api/v1/models/train",
        verify: "POST /api/v1/models/verify",
        pipeline_auto: "POST /api/v1/models/pipeline/auto",
      },
      detections: {
        list: "/api/v1/detections",
        geojson: "/api/v1/detections/geojson",
        stats: "/api/v1/detections/stats",
        get: "/api/v1/detections/:id",
      },
      cases: {
        list: '/api/v1/cases',
        geojson: '/api/v1/cases/geojson',
        stats: '/api/v1/cases/stats',
        get: '/api/v1/cases/:id',
        update_status: 'PATCH /api/v1/cases/:id/status',
        mitigation: 'POST /api/v1/cases/:id/mitigation',
        evidence: 'POST /api/v1/cases/:id/evidence',
        verify: 'POST /api/v1/cases/:id/verify',
        observations: 'GET/POST /api/v1/cases/observations',
        promote_detections: 'POST /api/v1/cases/promote-detections',
        unpromoted_detections: 'GET /api/v1/cases/unpromoted-detections',
        pre_development_preview: 'POST /api/v1/cases/pre-development/preview',
        pre_development_submit: 'POST /api/v1/cases/pre-development/submit',
      },
      processing: {
        runs: "/api/v1/processing/runs",
        get_run: "/api/v1/processing/runs/:id",
      },
    },
  });
};

app.get("/", getEngineInfo);
app.get("/api", getEngineInfo);

// 8. Mount Versioned REST API under /api/v1
app.use("/api/v1", v1Router);

// 9. Catch-All 404 Handler for API routes only
app.use("/api", (req, res, next) => {
  next(
    new AppError("NOT_FOUND", `Cannot ${req.method} ${req.originalUrl}`, 404),
  );
});

// 10. Centralized Global Error Handler
app.use(errorHandlerMiddleware);

module.exports = app;
