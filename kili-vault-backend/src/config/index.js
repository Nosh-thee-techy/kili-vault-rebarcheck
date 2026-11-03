/**
 * Kili-Vault Backend: Centralized Configuration Module
 * Validates and exposes environment variables with strict schema checking.
 */
"use strict";

const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

// Load environment variables from .env if present
dotenv.config();

// Define configuration validation schema
const configSchema = z.object({
  // Runtime
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  API_VERSION: z.string().default("v1"),
  CORS_ORIGIN: z.string().default("*"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(500),

  // Database
  DATABASE_URL: z.string().optional(),
  SUPABASE_DB_URL: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DB_POOL_MIN: z.coerce.number().default(2),
  DB_POOL_MAX: z.coerce.number().default(10),
  DB_TIMEOUT_MS: z.coerce.number().default(10000),

  // Auth / Security
  HACKATHON_DEV_AUTH_BYPASS: z.coerce.boolean().default(true),
  JWT_SECRET: z
    .string()
    .default("kilivault_dev_secret_key_minimum_32_characters_long_123"),

  // Earth Engine & AOI Configuration
  GEE_PROJECT_ID: z.string().optional(),
  GEE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GEE_SERVICE_ACCOUNT_KEY_PATH: z.string().optional(),
  GEE_AOI_ASSET: z.string().optional(),
  AOI_GEOJSON_PATH: z
    .string()
    .default(path.resolve(__dirname, "../../config/kilimani_ward.geojson")),
  AOI_NAME: z.string().default("Kilimani Ward, Nairobi"),

  // Remote Sensing Parameters
  BASELINE_START_DATE: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .default("2025-01-01"),
  BASELINE_END_DATE: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .default("2025-06-30"),
  RECENT_START_DATE: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .default("2026-01-01"),
  RECENT_END_DATE: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .default("2026-06-30"),

  S2_CLOUD_THRESHOLD: z.coerce.number().min(0).max(100).default(20.0),
  MIN_VALID_OBSERVATIONS: z.coerce.number().min(1).default(3),
  SPATIAL_RESOLUTION_METERS: z.coerce.number().default(10.0),

  MIN_CANDIDATE_AREA_M2: z.coerce.number().positive().default(100.0),
  MAX_CANDIDATE_AREA_M2: z.coerce.number().positive().default(50000.0),
  MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.5),

  DELTA_NDBI_THRESHOLD: z.coerce.number().default(0.1),
  DELTA_NDVI_THRESHOLD: z.coerce.number().default(-0.1),

  PROCESSING_VERSION: z.string().default("v1.0.0"),
  ALGORITHM_VERSION: z.string().default("s2_diff_spectral_v1"),
  MODEL_VERSION: z.string().default("kili-vault-dev-v0.1"),

  // Optional Infrastructure Geospatial Layers
  INFRASTRUCTURE_ROADS_LAYER_PATH: z.string().optional(),
  INFRASTRUCTURE_RIPARIAN_LAYER_PATH: z.string().optional(),
  INFRASTRUCTURE_DRAINAGE_LAYER_PATH: z.string().optional(),
});

// Parse and validate configuration
let parsedConfig;
try {
  parsedConfig = configSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const errorDetails = error.errors
      .map((err) => ` - ${err.path.join(".")}: ${err.message}`)
      .join("\n");
    console.error("\n========================================================");
    console.error(
      "CRITICAL CONFIGURATION ERROR: Invalid environment variables",
    );
    console.error(errorDetails);
    console.error("========================================================\n");
    throw new Error(`Configuration validation failed:\n${errorDetails}`);
  }
  throw error;
}

// Temporal validation: dates must be chronologically ordered
const bStart = new Date(parsedConfig.BASELINE_START_DATE);
const bEnd = new Date(parsedConfig.BASELINE_END_DATE);
const rStart = new Date(parsedConfig.RECENT_START_DATE);
const rEnd = new Date(parsedConfig.RECENT_END_DATE);

if (bStart >= bEnd) {
  throw new Error(
    `Invalid baseline date range: BASELINE_START_DATE (${parsedConfig.BASELINE_START_DATE}) must be before BASELINE_END_DATE (${parsedConfig.BASELINE_END_DATE})`,
  );
}
if (rStart >= rEnd) {
  throw new Error(
    `Invalid recent date range: RECENT_START_DATE (${parsedConfig.RECENT_START_DATE}) must be before RECENT_END_DATE (${parsedConfig.RECENT_END_DATE})`,
  );
}
if (bEnd > rStart) {
  console.warn(
    `[Config Warning] Baseline end date (${parsedConfig.BASELINE_END_DATE}) overlaps or is after recent start date (${parsedConfig.RECENT_START_DATE})`,
  );
}

module.exports = Object.freeze(parsedConfig);
