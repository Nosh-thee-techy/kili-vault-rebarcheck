import { buildRiskBreakdown } from '@/lib/format';
import type { CaseStatus, ChangeType, DevelopmentCase, Detection } from '@/types';

const STATUSES: CaseStatus[] = [
  'AI_FLAGGED',
  'UNDER_REVIEW',
  'MITIGATION_REQUIRED',
  'EVIDENCE_SUBMITTED',
  'AGENCY_PENDING',
  'VERIFIED',
  'CLOSED',
];

const KILIMANI_CENTROID = { lat: -1.2921, lon: 36.782 };

function offsetCoord(index: number): { lat: number; lon: number } {
  const row = Math.floor(index / 4);
  const col = index % 4;
  return {
    lat: KILIMANI_CENTROID.lat - row * 0.002 + (col - 1.5) * 0.0015,
    lon: KILIMANI_CENTROID.lon + col * 0.002 - row * 0.001,
  };
}

function makePolygon(lat: number, lon: number, size = 0.0004): GeoJSON.Polygon {
  const d = size / 2;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lon - d, lat - d],
        [lon + d, lat - d],
        [lon + d, lat + d],
        [lon - d, lat + d],
        [lon - d, lat - d],
      ],
    ],
  };
}

export function detectionToCase(detection: Detection, index: number): DevelopmentCase {
  const { lat, lon } =
    detection.centroid_lat != null && detection.centroid_lon != null
      ? { lat: detection.centroid_lat, lon: detection.centroid_lon }
      : offsetCoord(index);

  const confidence = detection.confidence ?? 0.75;
  const changeType = detection.change_type;
  const status = STATUSES[index % STATUSES.length] ?? 'AI_FLAGGED';

  return {
    id: `case_${detection.id}`,
    caseNumber: `KV-${String(100 + index).padStart(5, '0')}`,
    detectionId: detection.id,
    title: `Potential ${changeType.replace(/_/g, ' ').toLowerCase()} — ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    changeType,
    status,
    confidence,
    risk: buildRiskBreakdown(confidence, changeType),
    areaM2: detection.area_m2 ?? 420 + index * 85,
    centroidLat: lat,
    centroidLon: lon,
    geometry: detection.geometry ?? makePolygon(lat, lon),
    evidence: detection.evidence,
    parcelRef: `KL-${1200 + index}`,
    createdAt: detection.created_at ?? new Date(Date.now() - index * 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - index * 3600000).toISOString(),
  };
}

export const MOCK_CASES: DevelopmentCase[] = (
  [
    'BUILDING_DEVELOPMENT',
    'INFRASTRUCTURE_CHANGE',
    'LAND_CLEARING',
    'BUILDING_DEVELOPMENT',
    'VEGETATION_CHANGE',
    'SURFACE_CHANGE',
    'BUILDING_DEVELOPMENT',
    'INFRASTRUCTURE_CHANGE',
  ] as ChangeType[]
).map((changeType, index) => {
  const { lat, lon } = offsetCoord(index);
  const confidence = 0.62 + (index % 5) * 0.07;
  return detectionToCase(
    {
      id: `det_mock_${index}`,
      run_id: 'mock-run-001',
      change_type: changeType,
      confidence,
      area_m2: 380 + index * 120,
      centroid_lat: lat,
      centroid_lon: lon,
      geometry: makePolygon(lat, lon),
      evidence: {
        explanation:
          'Spectral differencing indicates physical surface change between baseline and recent composites.',
        spectral_change: true,
        ndbi_increase: changeType === 'BUILDING_DEVELOPMENT',
        ndvi_decrease: true,
      },
      created_at: new Date(Date.now() - index * 86400000 * 2).toISOString(),
    },
    index,
  );
});

export function getMockCaseById(id: string): DevelopmentCase | undefined {
  return MOCK_CASES.find((c) => c.id === id || c.detectionId === id || c.caseNumber === id);
}
