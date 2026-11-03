-- Kili-Vault community observations
-- Safe to run repeatedly in Supabase/PostgreSQL with PostGIS enabled.

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