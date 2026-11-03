import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addMitigation,
  getCase,
  getCases,
  getCaseStats,
  updateCaseStatus,
  uploadEvidence,
  verifyCase,
  type CaseQuery,
} from '@/lib/api';
import { caseKeys } from '@/lib/queryClient';
import type { CaseStatus, DevelopmentCase } from '@/types';

export function useCasesQuery(filters: CaseQuery = {}) {
  return useQuery({
    queryKey: caseKeys.list(filters as Record<string, unknown>),
    queryFn: () => getCases(filters),
  });
}

export function useCaseQuery(id: string | undefined) {
  return useQuery({
    queryKey: caseKeys.detail(id ?? ''),
    queryFn: () => getCase(id!).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCaseStatsQuery() {
  return useQuery({
    queryKey: caseKeys.stats(),
    queryFn: () => getCaseStats().then((r) => r.data),
  });
}

function normalizeStats(raw: Record<string, number | undefined>) {
  return {
    total: raw.total ?? 0,
    aiFlagged: raw.ai_flagged ?? raw.aiFlagged ?? 0,
    underReview: raw.under_review ?? raw.underReview ?? 0,
    mitigationRequired: raw.mitigation_required ?? raw.mitigationRequired ?? 0,
    pendingVerification: raw.pending_verification ?? raw.pendingVerification ?? 0,
    highRisk: raw.high_risk ?? raw.highRisk ?? 0,
    closed: raw.closed ?? 0,
  };
}

export function useNormalizedCaseStats() {
  const q = useCaseStatsQuery();
  return {
    ...q,
    stats: q.data ? normalizeStats(q.data as unknown as Record<string, number>) : undefined,
  };
}

export function useUpdateCaseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: CaseStatus; note?: string }) =>
      updateCaseStatus(id, status, note),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: caseKeys.detail(id) });
      const prev = qc.getQueryData<DevelopmentCase>(caseKeys.detail(id));
      if (prev) {
        qc.setQueryData<DevelopmentCase>(caseKeys.detail(id), { ...prev, status });
      }
      return { prev };
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(caseKeys.detail(id), ctx.prev);
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: caseKeys.detail(id) });
      qc.invalidateQueries({ queryKey: caseKeys.lists() });
      qc.invalidateQueries({ queryKey: caseKeys.stats() });
    },
  });
}

export function useAddMitigation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, requirements }: { id: string; requirements: string[] }) =>
      addMitigation(id, requirements),
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: caseKeys.detail(id) });
      qc.invalidateQueries({ queryKey: caseKeys.lists() });
    },
  });
}

export function useUploadEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadEvidence(id, file),
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: caseKeys.detail(id) });
    },
  });
}

export function useVerifyCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      note,
    }: {
      id: string;
      decision: 'approved' | 'rejected';
      note?: string;
    }) => verifyCase(id, decision, note),
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: caseKeys.detail(id) });
      qc.invalidateQueries({ queryKey: caseKeys.lists() });
      qc.invalidateQueries({ queryKey: caseKeys.stats() });
    },
  });
}
