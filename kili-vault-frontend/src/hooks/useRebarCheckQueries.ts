import { useQuery } from "@tanstack/react-query";
import { getRebarChecksGeoJSON } from "@/lib/api";
import { rebarCheckKeys } from "@/lib/queryClient";

export function useRebarChecksGeoJSONQuery() {
  return useQuery({
    queryKey: rebarCheckKeys.geojson(),
    queryFn: getRebarChecksGeoJSON,
    staleTime: 30_000,
    retry: 0,
  });
}
