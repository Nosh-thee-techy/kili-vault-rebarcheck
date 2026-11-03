export type ChangeType =
  | "BUILDING_DEVELOPMENT"
  | "INFRASTRUCTURE_CHANGE"
  | "LAND_CLEARING"
  | "VEGETATION_CHANGE"
  | "SURFACE_CHANGE"
  | "UNKNOWN";

export type CaseStatus =
  | "AI_FLAGGED"
  | "UNDER_REVIEW"
  | "MITIGATION_REQUIRED"
  | "EVIDENCE_SUBMITTED"
  | "AGENCY_PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "CLOSED";

export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

export type UserRole = "planner" | "developer" | "community" | "agency";

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  title: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  actorRole: string;
  actorId: string;
  actorName: string;
  timestamp: string;
  details: string;
}

export interface EvidenceItem {
  id: string;
  type: string;
  fileName: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  status: string;
}

export interface PreDevFlag {
  severity: "info" | "warning";
  text: string;
}

export interface DetectionEvidence {
  spectral_change?: boolean;
  ndbi_increase?: boolean;
  ndvi_decrease?: boolean;
  recent_built_signature?: boolean;
  explanation?: string;
  preDevelopment?: boolean;
  proposedFloors?: number;
  coveragePercent?: number;
  setbackMeters?: number;
  description?: string;
  flags?: PreDevFlag[];
  disclaimer?: string;
  assessedAt?: string;
  /** Nested GEE / pipeline evidence payload */
  baseline?: {
    delta_ndbi?: number;
    delta_ndvi?: number;
    ndbi_increase?: boolean;
    ndvi_decrease?: boolean;
    spectral_change?: boolean;
    recent_built_signature?: boolean;
    explanation?: string;
  };
  prithvi?: {
    available?: boolean;
    predicted_class?: string;
    class_probabilities?: Partial<Record<ChangeType | "UNKNOWN", number>>;
  };
  raw_signals?: {
    area_m2?: number;
    delta_ndbi?: number;
    delta_ndvi?: number;
    recent_observations?: number;
    baseline_observations?: number;
  };
  temporal_persistence?: number | { value?: number; method?: string };
  persistence?: number;
  area_plausibility?: number;
  observation_quality?: number;
}

export interface PreDevelopmentInput {
  lat: number;
  lon: number;
  changeType: ChangeType;
  proposedFloors: number;
  coveragePercent: number;
  setbackMeters: number;
  description: string;
}

export interface PreDevelopmentAssessment {
  risk: RiskBreakdown;
  flags: PreDevFlag[];
  confidence: number;
  areaM2: number;
  disclaimer: string;
  title: string;
  input: PreDevelopmentInput;
}

export interface Detection {
  id: string;
  run_id: string;
  event_id?: string;
  change_type: ChangeType;
  confidence: number;
  baseline_probability?: number | null;
  prithvi_probability?: number | null;
  ndbi_change?: number;
  ndvi_change?: number;
  temporal_persistence?: number;
  area_m2?: number;
  centroid_lat?: number;
  centroid_lon?: number;
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  evidence?: DetectionEvidence;
  model_version?: string;
  created_at?: string;
}

/** Detection snapshot joined when loading a case by detection_id */
export interface LinkedDetection {
  id: string;
  runId?: string;
  changeType: ChangeType;
  confidence: number;
  baselineProbability?: number | null;
  prithviProbability?: number | null;
  ndbiChange?: number | null;
  ndviChange?: number | null;
  temporalPersistence?: number | null;
  areaM2?: number;
  modelVersion?: string;
  evidence?: DetectionEvidence;
  createdAt?: string;
}

export type CommunityReportCategory =
  | "CONSTRUCTION"
  | "LAND_CLEARING"
  | "DUMPING"
  | "DRAINAGE"
  | "NOISE"
  | "OTHER";

export type CommunityObservationStatus =
  | "PENDING_REVIEW"
  | "LINKED_TO_CASE"
  | "DISMISSED";

export interface CommunityObservation {
  id: string;
  lat: number;
  lon: number;
  description: string;
  category?: CommunityReportCategory | null;
  status: CommunityObservationStatus | string;
  submittedById?: string;
  submittedByName?: string;
  caseId?: string | null;
  createdAt: string;
}

export interface RiskBreakdown {
  planning: number;
  infrastructure: number;
  environmental: number;
  community: number;
  overall: RiskLevel;
}

export interface DevelopmentCase {
  id: string;
  caseNumber: string;
  detectionId?: string | null;
  title: string;
  changeType: ChangeType;
  status: CaseStatus;
  confidence: number;
  risk: RiskBreakdown;
  areaM2: number;
  centroidLat: number;
  centroidLon: number;
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  evidence?: DetectionEvidence;
  parcelRef?: string;
  assignedDeveloperId?: string;
  mitigationRequirements?: string[];
  auditEvents?: AuditEvent[];
  evidenceItems?: EvidenceItem[];
  linkedDetection?: LinkedDetection;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyDevelopmentRecord {
  recordId: string;
  caseId: string;
  caseNumber: string;
  status: "CLOSED";
  closedAt: string | null;
  property: {
    parcelId: string | null;
    ward: string | null;
    constituency: string | null;
    location: { latitude: number; longitude: number } | null;
    landUse: string | null;
    geometryReference: string | null;
    developmentType: string | null;
  };
  lifecycle: {
    stage: string;
    timestamp: string | null;
    actor: string | null;
    details: string | null;
  }[];
  development: {
    existing: Record<string, unknown> | null;
    proposed: Record<string, unknown> | null;
    mitigated: Record<string, unknown> | null;
    observed: Record<string, unknown> | null;
  };
  comparison: Record<string, unknown> | null;
  spatialContext: Record<string, unknown>;
  verification: {
    status: string;
    verifiedAt: string | null;
    reviewer: string | null;
    notes: string | null;
    closureReason: string | null;
  };
  evidence: {
    id: string;
    type: string;
    name: string;
    reference: string;
    uploadedAt: string;
    status: string;
  }[];
  provenance: Record<string, string>;
  limitations: string[];
}

export interface CaseStats {
  total: number;
  ai_flagged?: number;
  aiFlagged?: number;
  under_review?: number;
  underReview?: number;
  mitigation_required?: number;
  mitigationRequired?: number;
  pending_verification?: number;
  pendingVerification?: number;
  high_risk?: number;
  highRisk?: number;
  closed?: number;
}

export interface DetectionStats {
  total_detections: number;
  avg_confidence: number;
  total_area_m2: number;
  breakdown?: Partial<Record<ChangeType, number>>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
}
