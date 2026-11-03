/**
 * Kili-Vault: Earth Observation Detection Engine Types
 */

export type ChangeType =
  | 'BUILDING_DEVELOPMENT'
  | 'INFRASTRUCTURE_CHANGE'
  | 'LAND_CLEARING'
  | 'VEGETATION_CHANGE'
  | 'SURFACE_CHANGE'
  | 'UNKNOWN';

export interface DetectionEvidence {
  spectral_change?: boolean;
  ndbi_increase?: boolean;
  ndvi_decrease?: boolean;
  temporal_persistence?: boolean;
  prithvi_support?: boolean | null;
  compact_patch?: boolean;
  linear_infrastructure?: boolean;
  aspect_ratio?: number;
  explanation?: string;
  [key: string]: any;
}

export interface DetectionRecord {
  id: string;
  run_id?: string;
  event_id?: string;
  deduplication_hash?: string;
  change_type: ChangeType;
  confidence: number;
  baseline_probability?: number | null;
  prithvi_probability?: number | null;
  ndbi_change: number;
  ndvi_change: number;
  temporal_persistence: number;
  area_m2: number;
  centroid_lat: number;
  centroid_lon: number;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  evidence: DetectionEvidence;
  model_version: string;
  created_at: string;
}

export interface ProcessingRunRecord {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  aoi_name: string;
  baseline_start_date: string;
  baseline_end_date: string;
  recent_start_date: string;
  recent_end_date: string;
  imagery_count: number;
  detections_count: number;
  model_version: string;
  duration_seconds?: number;
  breakdown?: Record<ChangeType, number>;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

export interface DetectionStats {
  total_detections: number;
  breakdown: Record<string, number>;
  avg_confidence: number;
  total_area_m2: number;
}
