import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { allowedStatusTransitions } from '@/auth/permissions';
import { useAuth } from '@/auth/AuthContext';
import {
  useAddMitigation,
  useUpdateCaseStatus,
  useUploadEvidence,
  useVerifyCase,
} from '@/hooks/useCaseQueries';
import { CASE_STATUS_LABELS } from '@/config/theme';
import { DEFAULT_DEVELOPER_ID, DEMO_DEVELOPERS } from '@/config/demoDevelopers';
import type { CaseStatus, DevelopmentCase } from '@/types';

export function CaseWorkflowActions({ caseItem }: { caseItem: DevelopmentCase }) {
  const { user } = useAuth();
  const updateStatus = useUpdateCaseStatus();
  const addMitigation = useAddMitigation();
  const uploadEvidence = useUploadEvidence();
  const verifyCase = useVerifyCase();
  const [mitigationText, setMitigationText] = useState('Infrastructure assessment required');
  const [assignedDeveloperId, setAssignedDeveloperId] = useState(DEFAULT_DEVELOPER_ID);
  const [verifyNote, setVerifyNote] = useState('');

  if (!user) return null;

  const transitions = allowedStatusTransitions(user.role, caseItem.status);

  const handleStatus = (status: CaseStatus) => {
    updateStatus.mutate({ id: caseItem.id, status });
  };

  const handleMitigation = () => {
    addMitigation.mutate({
      id: caseItem.id,
      requirements: mitigationText.split('\n').filter(Boolean),
      assignedDeveloperId,
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadEvidence.mutate({ id: caseItem.id, file });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-forest/15 bg-gradient-to-br from-forest/5 to-off-white p-4">
      <h3 className="font-display text-base font-semibold text-charcoal">Actions</h3>

      {transitions.length > 0 && (
        <div className="flex flex-col gap-2">
          {transitions.map((status) => (
            <Button
              key={status}
              variant={status === 'CLOSED' || status === 'REJECTED' ? 'outline' : 'primary'}
              size="sm"
              className="w-full justify-center"
              isLoading={updateStatus.isPending}
              onClick={() => handleStatus(status)}
            >
              {CASE_STATUS_LABELS[status]}
            </Button>
          ))}
        </div>
      )}

      {user.role === 'planner' && caseItem.status === 'UNDER_REVIEW' && (
        <div className="space-y-2 border-t border-sand pt-4">
          <Input
            label="Mitigation requirement"
            value={mitigationText}
            onChange={(e) => setMitigationText(e.target.value)}
          />
          <label className="block text-sm font-medium text-charcoal">
            Assign developer
            <select
              value={assignedDeveloperId}
              onChange={(e) => setAssignedDeveloperId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sand bg-off-white px-3 py-2 text-sm text-charcoal"
            >
              {DEMO_DEVELOPERS.map((dev) => (
                <option key={dev.id} value={dev.id}>
                  {dev.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="secondary"
            size="sm"
            isLoading={addMitigation.isPending}
            onClick={handleMitigation}
          >
            Require mitigation
          </Button>
        </div>
      )}

      {user.role === 'developer' && caseItem.status === 'MITIGATION_REQUIRED' && (
        <div className="space-y-2 border-t border-sand pt-4">
          <label className="block text-sm font-medium text-charcoal">Upload evidence</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFile}
            className="block w-full text-sm text-charcoal-muted file:mr-3 file:rounded-lg file:border-0 file:bg-forest file:px-4 file:py-2 file:text-sm file:font-semibold file:text-off-white hover:file:bg-forest-light"
          />
          {uploadEvidence.isPending && (
            <p className="text-xs text-charcoal-muted">Uploading…</p>
          )}
        </div>
      )}

      {user.role === 'agency' &&
        (caseItem.status === 'AGENCY_PENDING' || caseItem.status === 'EVIDENCE_SUBMITTED') && (
          <div className="space-y-2 border-t border-sand pt-4">
            <Input
              label="Verification note"
              value={verifyNote}
              onChange={(e) => setVerifyNote(e.target.value)}
              placeholder="Optional inspector note"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                isLoading={verifyCase.isPending}
                onClick={() =>
                  verifyCase.mutate({ id: caseItem.id, decision: 'approved', note: verifyNote })
                }
              >
                Approve verification
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={verifyCase.isPending}
                onClick={() =>
                  verifyCase.mutate({ id: caseItem.id, decision: 'rejected', note: verifyNote })
                }
              >
                Reject
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}
