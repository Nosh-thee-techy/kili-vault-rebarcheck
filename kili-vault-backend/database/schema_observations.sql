-- Kili-Vault: Community observations (ground-truth reports)
-- Run after schema_cases.sql

CREATE TABLE IF NOT EXISTS community_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_REVIEW'
        CHECK (status IN ('PENDING_REVIEW', 'LINKED_TO_CASE', 'DISMISSED')),
    submitted_by_id VARCHAR(64),
    submitted_by_name VARCHAR(128),
    case_id VARCHAR(64) REFERENCES development_cases(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Upgrade path if an older empty shell existed
ALTER TABLE community_observations ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE community_observations ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION;
ALTER TABLE community_observations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE community_observations ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'PENDING_REVIEW';
ALTER TABLE community_observations ADD COLUMN IF NOT EXISTS submitted_by_id VARCHAR(64);
ALTER TABLE community_observations ADD COLUMN IF NOT EXISTS submitted_by_name VARCHAR(128);
ALTER TABLE community_observations ADD COLUMN IF NOT EXISTS case_id VARCHAR(64);
ALTER TABLE community_observations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_observations_status ON community_observations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_lat_lon ON community_observations(lat, lon);
