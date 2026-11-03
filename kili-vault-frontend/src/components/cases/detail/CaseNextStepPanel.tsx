import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { allowedStatusTransitions } from '@/auth/permissions';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  useAddMitigation,
  useUpdateCaseStatus,
  useUploadEvidence,
  useVerifyCase,
} from '@/hooks/useCaseQueries';
import { CASE_STATUS_LABELS } from '@/config/theme';
import { DEFAULT_DEVELOPER_ID, DEMO_DEVELOPERS } from '@/config/demoDevelopers';
import { getCaseWorkflowGuide } from '@/lib/caseWorkflowGuide';
import { cn } from '@/lib/cn';
import type { CaseStatus, DevelopmentCase } from '@/types';

export function CaseNextStepPanel({ caseItem }: { caseItem: DevelopmentCase }) {
  const { user } = useAuth();
  const updateStatus = useUpdateCaseStatus();
  const addMitigation = useAddMitigation();
  const uploadEvidence = useUploadEvidence();
  const verifyCase = useVerifyCase();
  const [mitigationText, setMitigationText] = useState('Infrastructure assessment required');
  const [assignedDeveloperId, setAssignedDeveloperId] = useState(DEFAULT_DEVELOPER_ID);
  const [verifyNote, setVerifyNote] = useState('');
  const [showMitigationForm, setShowMitigationForm] = useState(false);
  const [minimized, setMinimized] = useState(false);

  if (!user) return null;

  const guide = getCaseWorkflowGuide(caseItem, user.role);
  const transitions = allowedStatusTransitions(user.role, caseItem.status).filter(
    (status) =>
      !(user.role === 'planner' && caseItem.status === 'UNDER_REVIEW' && status === 'MITIGATION_REQUIRED'),
  );

  const handleStatus = (status: CaseStatus) => {
    updateStatus.mutate({ id: caseItem.id, status });
  };

  const handleMitigation = () => {
    addMitigation.mutate(
      {
        id: caseItem.id,
        requirements: mitigationText.split('\n').filter(Boolean),
        assignedDeveloperId,
      },
      { onSuccess: () => setShowMitigationForm(false) },
    );
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadEvidence.mutate({ id: caseItem.id, file });
  };

  const showPlannerMitigation =
    user.role === 'planner' && caseItem.status === 'UNDER_REVIEW';
  const showDeveloperUpload =
    user.role === 'developer' && caseItem.status === 'MITIGATION_REQUIRED';
  const showAgencyVerify =
    user.role === 'agency' &&
    (caseItem.status === 'AGENCY_PENDING' || caseItem.status === 'EVIDENCE_SUBMITTED');

  return (
    <div className="rounded-2xl border border-sand bg-off-white shadow-soft">
      <div className={cn('flex items-start justify-between gap-3 p-5', !minimized && 'pb-0')}>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
            Now · {guide.statusLabel}
          </p>
          {minimized && (
            <p className="mt-1 truncate text-sm text-charcoal-muted">{guide.instruction}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMinimized((value) => !value)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-charcoal-muted transition-colors hover:bg-mist/50 hover:text-charcoal"
          aria-expanded={!minimized}
          aria-label={minimized ? 'Expand guidance' : 'Minimize guidance'}
        >
          {minimized ? (
            <>
              Expand
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Minimize
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {!minimized && (
        <div className="space-y-4 p-5 pt-3">
          <p className="text-base leading-relaxed text-charcoal">{guide.summary}</p>
          <p className="rounded-xl bg-mist/50 px-4 py-3 text-sm font-medium text-charcoal">
            {guide.instruction}
          </p>

      {transitions.length > 0 && !showMitigationForm && (
        <div className="mt-4 flex flex-wrap gap-2">
          {transitions.map((status) => (
            <Button
              key={status}
              variant={status === 'CLOSED' || status === 'REJECTED' ? 'outline' : 'secondary'}
              size="md"
              isLoading={updateStatus.isPending}
              onClick={() => handleStatus(status)}
            >
              {status === 'UNDER_REVIEW' && 'Start review'}
              {status === 'MITIGATION_REQUIRED' && 'Skip to mitigation'}
              {status === 'CLOSED' && 'Close case'}
              {status === 'EVIDENCE_SUBMITTED' && 'Mark submitted'}
              {status === 'AGENCY_PENDING' && 'Send to agency'}
              {!['UNDER_REVIEW', 'MITIGATION_REQUIRED', 'CLOSED', 'EVIDENCE_SUBMITTED', 'AGENCY_PENDING'].includes(status) &&
                CASE_STATUS_LABELS[status]}
            </Button>
          ))}
        </div>
      )}

      {showPlannerMitigation && (
        <div className="mt-4 space-y-3 border-t border-sand pt-4">
          {!showMitigationForm ? (
            <Button variant="primary" size="md" onClick={() => setShowMitigationForm(true)}>
              Send to developer →
            </Button>
          ) : (
            <>
              <Input
                label="What must the developer do?"
                value={mitigationText}
                onChange={(e) => setMitigationText(e.target.value)}
              />
              <label className="block text-sm font-medium text-charcoal">
                Assign to
                <select
                  value={assignedDeveloperId}
                  onChange={(e) => setAssignedDeveloperId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-sand bg-off-white px-3 py-2.5 text-sm"
                >
                  {DEMO_DEVELOPERS.map((dev) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="md"
                  isLoading={addMitigation.isPending}
                  onClick={handleMitigation}
                >
                  Confirm & send
                </Button>
                <Button variant="ghost" size="md" onClick={() => setShowMitigationForm(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {showDeveloperUpload && (
        <div className="mt-4 border-t border-sand pt-4">
          {(caseItem.mitigationRequirements?.length ?? 0) > 0 && (
            <ul className="mb-3 space-y-1 text-sm text-charcoal-muted">
              {caseItem.mitigationRequirements!.map((req) => (
                <li key={req}>• {req}</li>
              ))}
            </ul>
          )}
          <label className="block text-sm font-medium text-charcoal">Upload proof</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFile}
            className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-clay file:px-4 file:py-2 file:text-sm file:font-semibold file:text-off-white"
          />
          {uploadEvidence.isPending && (
            <p className="mt-2 text-xs text-charcoal-muted">Uploading…</p>
          )}
        </div>
      )}

      {showAgencyVerify && (
        <div className="mt-4 space-y-3 border-t border-sand pt-4">
          <Input
            label="Note (optional)"
            value={verifyNote}
            onChange={(e) => setVerifyNote(e.target.value)}
            placeholder="Inspector comment"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="md"
              isLoading={verifyCase.isPending}
              onClick={() =>
                verifyCase.mutate({ id: caseItem.id, decision: 'approved', note: verifyNote })
              }
            >
              Approve
            </Button>
            <Button
              variant="outline"
              size="md"
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
      )}
    </div>
  );
}
