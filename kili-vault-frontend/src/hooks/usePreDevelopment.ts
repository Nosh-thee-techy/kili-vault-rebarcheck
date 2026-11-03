import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { previewPreDevelopment, submitPreDevelopment, type PreDevelopmentInput } from '@/lib/api';
import { caseKeys } from '@/lib/queryClient';

export function usePreDevelopmentPreview() {
  return useMutation({
    mutationFn: (input: PreDevelopmentInput) => previewPreDevelopment(input).then((r) => r.data),
  });
}

export function usePreDevelopmentSubmit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PreDevelopmentInput) => submitPreDevelopment(input).then((r) => r.data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: caseKeys.lists() });
      qc.invalidateQueries({ queryKey: caseKeys.stats() });
    },
  });
}
