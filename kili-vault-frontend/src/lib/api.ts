import type {
  AuthUser,
  CaseStats,
  CommunityObservation,
  Detection,
  DetectionStats,
  DevelopmentCase,
  PaginatedResponse,
  PreDevelopmentAssessment,
  PreDevelopmentInput,
  CommunityReportCategory,
  PropertyDevelopmentRecord,
} from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

let authUser: AuthUser | null = null;

export function setApiAuthUser(user: AuthUser | null) {
  authUser = user;
}

function authHeaders(): HeadersInit {
  if (!authUser) return {};
  return {
    "X-User-Role": authUser.role,
    "X-User-Id": authUser.id,
    "X-User-Name": authUser.name,
  };
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...authHeaders(),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export interface CaseQuery {
  limit?: number;
  offset?: number;
  status?: string;
  change_type?: string;
  search?: string;
}

export async function getCases(
  query: CaseQuery = {},
): Promise<PaginatedResponse<DevelopmentCase>> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v != null && v !== "") params.set(k, String(v));
  });
  const qs = params.toString();
  return fetchJson(`/api/v1/cases${qs ? `?${qs}` : ""}`);
}

export async function getCase(
  id: string,
): Promise<{ success: boolean; data: DevelopmentCase }> {
  return fetchJson(`/api/v1/cases/${encodeURIComponent(id)}`);
}

export async function getPropertyRecord(
  id: string,
): Promise<{ success: boolean; data: PropertyDevelopmentRecord }> {
  return fetchJson(`/api/v1/cases/${encodeURIComponent(id)}/property-record`);
}

export async function getCasesGeoJSON(
  query: CaseQuery = {},
): Promise<GeoJSON.FeatureCollection> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v != null && v !== "") params.set(k, String(v));
  });
  const qs = params.toString();
  return fetchJson(`/api/v1/cases/geojson${qs ? `?${qs}` : ""}`);
}

export async function getCaseStats(): Promise<{
  success: boolean;
  data: CaseStats;
}> {
  return fetchJson("/api/v1/cases/stats");
}

export async function updateCaseStatus(
  id: string,
  status: string,
  note?: string,
): Promise<{ success: boolean; data: DevelopmentCase }> {
  return fetchJson(`/api/v1/cases/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, note }),
  });
}

export async function addMitigation(
  id: string,
  requirements: string[],
  assignedDeveloperId?: string,
): Promise<{ success: boolean; data: DevelopmentCase }> {
  return fetchJson(`/api/v1/cases/${encodeURIComponent(id)}/mitigation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requirements, assignedDeveloperId }),
  });
}

export async function getCommunityObservations(): Promise<{
  success: boolean;
  data: { observations: CommunityObservation[]; pendingCount: number };
}> {
  return fetchJson("/api/v1/cases/observations");
}

export async function verifyCase(
  id: string,
  decision: "approved" | "rejected",
  note?: string,
): Promise<{ success: boolean; data: DevelopmentCase }> {
  return fetchJson(`/api/v1/cases/${encodeURIComponent(id)}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, note }),
  });
}

export async function uploadEvidence(
  id: string,
  file: File,
): Promise<{ success: boolean; data: DevelopmentCase }> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(
    `${API_BASE}/api/v1/cases/${encodeURIComponent(id)}/evidence`,
    {
      method: "POST",
      headers: authHeaders(),
      body: form,
    },
  );
  if (!response.ok) {
    const body = (await response.json()) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? "Upload failed");
  }
  return response.json();
}

export async function getMyCommunityObservations(): Promise<{
  success: boolean;
  data: {
    observations: import("@/types").CommunityObservation[];
    total: number;
    pendingCount: number;
    linkedCount: number;
  };
}> {
  return fetchJson("/api/v1/cases/observations/mine");
}

export async function submitObservation(data: {
  lat: number;
  lon: number;
  description: string;
  category?: CommunityReportCategory;
}): Promise<{
  success: boolean;
  data: import("@/types").CommunityObservation;
}> {
  return fetchJson("/api/v1/cases/observations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export interface DetectionQuery {
  limit?: number;
  offset?: number;
  change_type?: string;
  min_confidence?: number;
}

export async function getDetections(
  query: DetectionQuery = {},
): Promise<PaginatedResponse<Detection>> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v != null && v !== "") params.set(k, String(v));
  });
  const qs = params.toString();
  return fetchJson(`/api/v1/detections${qs ? `?${qs}` : ""}`);
}

export async function getDetectionsGeoJSON(
  query: DetectionQuery = {},
): Promise<GeoJSON.FeatureCollection> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v != null && v !== "") params.set(k, String(v));
  });
  const qs = params.toString();
  return fetchJson(`/api/v1/detections/geojson${qs ? `?${qs}` : ""}`);
}

export async function getDetectionStats(): Promise<{ data: DetectionStats }> {
  return fetchJson("/api/v1/detections/stats");
}

export async function getUnpromotedDetectionCount(
  minConfidence = 0.75,
): Promise<{
  success: boolean;
  data: { unpromoted: number; min_confidence: number };
}> {
  return fetchJson(
    `/api/v1/cases/unpromoted-detections?min_confidence=${minConfidence}`,
  );
}

export async function promoteDetections(options?: {
  min_confidence?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data: {
    promoted_count: number;
    candidates: number;
    promoted: { detectionId: string; caseId: string; caseNumber: string }[];
  };
}> {
  return fetchJson("/api/v1/cases/promote-detections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options ?? {}),
  });
}

function preDevelopmentBody(input: PreDevelopmentInput) {
  return {
    lat: input.lat,
    lon: input.lon,
    changeType: input.changeType,
    proposedFloors: input.proposedFloors,
    coveragePercent: input.coveragePercent,
    setbackMeters: input.setbackMeters,
    description: input.description,
  };
}

export async function previewPreDevelopment(
  input: PreDevelopmentInput,
): Promise<{ success: boolean; data: PreDevelopmentAssessment }> {
  return fetchJson("/api/v1/cases/pre-development/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preDevelopmentBody(input)),
  });
}

export async function submitPreDevelopment(
  input: PreDevelopmentInput,
): Promise<{ success: boolean; data: DevelopmentCase }> {
  return fetchJson("/api/v1/cases/pre-development/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preDevelopmentBody(input)),
  });
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export type { PreDevelopmentInput };
