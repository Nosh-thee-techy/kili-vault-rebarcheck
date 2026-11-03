import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const caseKeys = {
  all: ['cases'] as const,
  lists: () => [...caseKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...caseKeys.lists(), filters] as const,
  details: () => [...caseKeys.all, 'detail'] as const,
  detail: (id: string) => [...caseKeys.details(), id] as const,
  stats: () => [...caseKeys.all, 'stats'] as const,
  geojson: () => [...caseKeys.all, 'geojson'] as const,
  unpromoted: (min: number) => [...caseKeys.all, 'unpromoted', min] as const,
  observations: () => [...caseKeys.all, 'observations'] as const,
  myObservations: () => [...caseKeys.all, 'my-observations'] as const,
};

export const detectionKeys = {
  all: ['detections'] as const,
  lists: () => [...detectionKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...detectionKeys.lists(), filters] as const,
  stats: () => [...detectionKeys.all, 'stats'] as const,
  geojson: (filters: Record<string, unknown>) => [...detectionKeys.all, 'geojson', filters] as const,
};
