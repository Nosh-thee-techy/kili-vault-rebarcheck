import { useQuery } from '@tanstack/react-query';
import { getCommunityObservations, getMyCommunityObservations } from '@/lib/api';
import { caseKeys } from '@/lib/queryClient';

export function useCommunityObservationsQuery() {
  return useQuery({
    queryKey: caseKeys.observations(),
    queryFn: () => getCommunityObservations().then((r) => r.data),
  });
}

export function useMyObservationsQuery() {
  return useQuery({
    queryKey: caseKeys.myObservations(),
    queryFn: () => getMyCommunityObservations().then((r) => r.data),
  });
}
