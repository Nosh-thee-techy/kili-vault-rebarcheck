import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDetections,
  getDetectionStats,
  getDetectionsGeoJSON,
  getUnpromotedDetectionCount,
  promoteDetections,
  type DetectionQuery,
} from "@/lib/api";
import { caseKeys, detectionKeys } from "@/lib/queryClient";

const MAP_DETECTION_FILTERS: DetectionQuery = {
  min_confidence: 0.5,
  limit: 1500,
};

export function useDetectionStatsQuery() {
  return useQuery({
    queryKey: detectionKeys.stats(),
    queryFn: () => getDetectionStats().then((r) => r.data),
  });
}

export function useDetectionsQuery(
  page: number,
  pageSize = 10,
  minConfidence = 0.5,
) {
  return useQuery({
    queryKey: detectionKeys.list({ page, pageSize, minConfidence }),
    queryFn: () =>
      getDetections({
        limit: pageSize,
        offset: page * pageSize,
        min_confidence: minConfidence,
      }),
    placeholderData: (previous) => previous,
  });
}

export function useDetectionsGeoJSONQuery(
  filters: DetectionQuery = MAP_DETECTION_FILTERS,
) {
  return useQuery({
    queryKey: detectionKeys.geojson(filters as Record<string, unknown>),
    queryFn: () => getDetectionsGeoJSON(filters),
  });
}

export function useUnpromotedDetectionsQuery(minConfidence = 0.75) {
  return useQuery({
    queryKey: caseKeys.unpromoted(minConfidence),
    queryFn: () =>
      getUnpromotedDetectionCount(minConfidence).then((r) => r.data),
  });
}

export function usePromoteDetections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (options?: { min_confidence?: number; limit?: number }) =>
      promoteDetections(options),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: caseKeys.lists() });
      qc.invalidateQueries({ queryKey: caseKeys.stats() });
      qc.invalidateQueries({ queryKey: caseKeys.all });
      qc.invalidateQueries({ queryKey: detectionKeys.all });
    },
  });
}
