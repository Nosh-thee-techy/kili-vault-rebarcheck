import { useState } from "react";
import { useDetectionsQuery } from "@/hooks/useDetectionQueries";
import {
  formatArea,
  formatChangeType,
  formatConfidence,
  formatRelativeDate,
} from "@/lib/format";

function number(value: number | null | undefined, digits = 2) {
  return value == null || !Number.isFinite(value)
    ? "Not available"
    : value.toFixed(digits);
}

export function DetectionTriageList({
  onSelectDetection,
}: {
  onSelectDetection?: (detectionId: string) => void;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 8;
  const query = useDetectionsQuery(page, pageSize, 0.5);
  const total = query.data?.pagination.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const detections = query.data?.data ?? [];

  return (
    <div>
      <calcite-notice open scale="s" kind="info">
        {total.toLocaleString()} candidate detections · confidence at least 50%
      </calcite-notice>
      {query.isLoading ? (
        <calcite-loader label="Loading candidate detections" />
      ) : detections.length === 0 ? (
        <calcite-notice open scale="s" kind="info">
          No detections available for this filter.
        </calcite-notice>
      ) : (
        <calcite-list label="Candidate detections">
          {detections.map((detection) => (
            <calcite-list-item
              key={detection.id}
              label={`${formatChangeType(detection.change_type)} · ${formatConfidence(detection.confidence)}`}
              description={`${detection.id} · Area ${formatArea(detection.area_m2 ?? 0)} · NDBI ${number(detection.ndbi_change)} · Persistence ${detection.temporal_persistence == null ? "Not available" : formatConfidence(detection.temporal_persistence)} · ${detection.created_at ? formatRelativeDate(detection.created_at) : "Not available"}`}
              onClick={() => onSelectDetection?.(detection.id)}
            />
          ))}
        </calcite-list>
      )}
      <calcite-label>
        Page {page + 1} of {pageCount}
      </calcite-label>
      <div className="flex justify-between">
        <calcite-button
          appearance="outline"
          scale="s"
          disabled={page === 0 || query.isFetching}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          icon-start="chevron-left"
          label="Previous detection page"
        />
        <calcite-button
          appearance="outline"
          scale="s"
          disabled={page >= pageCount - 1 || query.isFetching}
          onClick={() =>
            setPage((current) => Math.min(pageCount - 1, current + 1))
          }
          icon-start="chevron-right"
          label="Next detection page"
        />
      </div>
      <calcite-notice open scale="s" kind="warning">
        Review geometry and evidence on the map before promotion; this is not a
        legal conclusion.
      </calcite-notice>
    </div>
  );
}
