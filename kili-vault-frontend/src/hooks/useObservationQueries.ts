import { useQuery } from '@tanstack/react-query';
import { getCommunityObservations } from '@/lib/api';
import { caseKeys } from '@/lib/queryClient';

export function useCommunityObservationsQuery() {
  return useQuery({
    queryKey: caseKeys.observations(),
    queryFn: () => getCommunityObservations().then((r) => r.data),
  });
}
