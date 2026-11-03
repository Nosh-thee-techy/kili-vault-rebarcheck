-- Kili-Vault: Development Case Workflow Schema (PostGIS extension)
-- Run after schema.sql when PostgreSQL is available.

CREATE TABLE IF NOT EXISTS development_cases (
    id VARCHAR(64) PRIMARY KEY,
    case_number VARCHAR(32) NOT NULL UNIQUE,
    detection_id VARCHAR(64) REFERENCES detections(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'AI_FLAGGED',
    confidence DOUBLE PRECISION NOT NULL,
    risk JSONB NOT NULL DEFAULT '{}'::jsonb,
    area_m2 DOUBLE PRECISION NOT NULL,
    centroid_lat DOUBLE PRECISION NOT NULL,
    centroid_lon DOUBLE PRECISION NOT NULL,
    geometry GEOMETRY(Geometry, 4326) NOT NULL,
    evidence JSONB DEFAULT '{}'::jsonb,
    parcel_ref VARCHAR(64),
    assigned_developer_id VARCHAR(64),
    mitigation_requirements JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS case_audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id VARCHAR(64) NOT NULL REFERENCES development_cases(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    actor_id VARCHAR(64),
    actor_name VARCHAR(128),
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS case_evidence_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id VARCHAR(64) NOT NULL REFERENCES development_cases(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_by VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE case_evidence_items ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_cases_status ON development_cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_geom ON development_cases USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_audit_case ON case_audit_events(case_id, created_at DESC);
