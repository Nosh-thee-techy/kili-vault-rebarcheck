-- ============================================================================
-- Kili-Vault: Earth Observation Detection Engine Database Schema
-- Target AOI: Kilimani Ward, Nairobi, Kenya
-- PostgreSQL 14+ with PostGIS 3+
-- Authoritative Schema File: database/schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- This file is authoritative for the detection engine and is safe to rerun.
-- It creates or upgrades engine objects without deleting persisted detections.

-- ----------------------------------------------------------------------------
-- 1. DETECTION RUNS TABLE
-- Tracks Earth Observation processing runs and Sentinel-2 differencing jobs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detection_runs (
    id VARCHAR(64) PRIMARY KEY,
    run_type VARCHAR(50) NOT NULL DEFAULT 'SENTINEL2_DIFFERENCING',
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    aoi_name VARCHAR(100) NOT NULL DEFAULT 'Kilimani Ward, Nairobi',
    baseline_start_date DATE NOT NULL,
    baseline_end_date DATE NOT NULL,
    recent_start_date DATE NOT NULL,
    recent_end_date DATE NOT NULL,
    imagery_count INTEGER DEFAULT 0,
    detections_count INTEGER DEFAULT 0,
    model_version VARCHAR(50) NOT NULL DEFAULT 'kili-vault-dev-v0.1',
    execution_duration_ms INTEGER DEFAULT 0,
    breakdown JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_detection_runs_status ON detection_runs(status);
CREATE INDEX IF NOT EXISTS idx_detection_runs_created ON detection_runs(created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. DETECTIONS TABLE
-- Stores multi-temporal Sentinel-2 candidate change detections
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detections (
    id VARCHAR(64) PRIMARY KEY,
    run_id VARCHAR(64) REFERENCES detection_runs(id) ON DELETE SET NULL,
    event_id VARCHAR(100),
    deduplication_hash VARCHAR(64),
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN (
        'BUILDING_DEVELOPMENT',
        'INFRASTRUCTURE_CHANGE',
        'LAND_CLEARING',
        'VEGETATION_CHANGE',
        'SURFACE_CHANGE',
        'UNKNOWN'
    )),
    confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    baseline_probability DOUBLE PRECISION,
    prithvi_probability DOUBLE PRECISION,
    ndbi_change DOUBLE PRECISION,
    ndvi_change DOUBLE PRECISION,
    temporal_persistence DOUBLE PRECISION DEFAULT 0.0 CHECK (temporal_persistence >= 0.0 AND temporal_persistence <= 1.0),
    area_m2 DOUBLE PRECISION NOT NULL CHECK (area_m2 > 0),
    centroid_lat DOUBLE PRECISION NOT NULL,
    centroid_lon DOUBLE PRECISION NOT NULL,
    geometry GEOMETRY(Geometry, 4326) NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    model_version VARCHAR(50) NOT NULL DEFAULT 'kili-vault-dev-v0.1',
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Spatial and attribute indexes
CREATE INDEX IF NOT EXISTS idx_detections_geom ON detections USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_detections_change_type ON detections(change_type);
CREATE INDEX IF NOT EXISTS idx_detections_confidence ON detections(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_detections_event_id ON detections(event_id);
CREATE INDEX IF NOT EXISTS idx_detections_run_id ON detections(run_id);
CREATE INDEX IF NOT EXISTS idx_detections_created ON detections(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_detections_deduplication_hash
    ON detections(deduplication_hash)
    WHERE deduplication_hash IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. COMMUNITY OBSERVATIONS
-- Human-submitted ground reports kept separate from AI detections
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    geometry GEOMETRY(Point, 4326) NOT NULL,
    description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 1 AND 5000),
    observation_type VARCHAR(50),
    submitted_by VARCHAR(100),
    submitter_name VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED'
        CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED')),
    photo_url TEXT,
    review_notes TEXT,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,
    linked_detection_id VARCHAR(64) REFERENCES detections(id) ON DELETE SET NULL,
    linked_case_id VARCHAR(64) REFERENCES development_cases(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_community_observations_geometry
    ON community_observations USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_community_observations_status
    ON community_observations(status);
CREATE INDEX IF NOT EXISTS idx_community_observations_created
    ON community_observations(created_at DESC);

CREATE OR REPLACE FUNCTION update_community_observations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS community_observations_updated_at ON community_observations;
CREATE TRIGGER community_observations_updated_at
    BEFORE UPDATE ON community_observations
    FOR EACH ROW EXECUTE FUNCTION update_community_observations_updated_at();
