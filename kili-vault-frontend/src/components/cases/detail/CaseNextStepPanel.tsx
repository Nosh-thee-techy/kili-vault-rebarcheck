import { useState } from 'react';
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
import { getCaseWorkflowGuide } from '@/lib/caseWorkflowGuide';
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
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

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
    if (!file) return;
    const upload = (metadata: Record<string, string | number | null>) => {
      uploadEvidence.mutate({ id: caseItem.id, file, metadata });
    };
    const fallback = () => upload({ source: 'user-upload', capturedAt: new Date().toISOString(), parcelRef: caseItem.parcelRef ?? null, detectionId: caseItem.detectionId ?? null });
    if (!navigator.geolocation) {
      setLocationStatus('Device location unavailable; uploaded without a geotag.');
      fallback();
      return;
    }
    setLocationStatus('Requesting device location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationStatus(`Geotag captured within ${Math.round(position.coords.accuracy)} m.`);
        upload({ source: 'browser-geolocation', latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: new Date().toISOString(), parcelRef: caseItem.parcelRef ?? null, detectionId: caseItem.detectionId ?? null });
      },
      () => {
        setLocationStatus('Location permission unavailable; uploaded without a geotag.');
        fallback();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  };

  const showPlannerMitigation =
    user.role === 'planner' && caseItem.status === 'UNDER_REVIEW';
  const showDeveloperUpload =
    user.role === 'developer' && caseItem.status === 'MITIGATION_REQUIRED';
  const showAgencyVerify =
    user.role === 'agency' &&
    (caseItem.status === 'AGENCY_PENDING' || caseItem.status === 'EVIDENCE_SUBMITTED');

  return (
    <calcite-block heading="Next step" description={guide.statusLabel} collapsible open>
      <div className="space-y-4 px-4 pb-4 pt-2">
          <p className="text-base leading-relaxed text-charcoal">{guide.summary}</p>
          <calcite-notice open kind="info" scale="s">
            {guide.instruction}
          </calcite-notice>

      {transitions.length > 0 && !showMitigationForm && (
        <div className="mt-4 flex flex-wrap gap-2">
          {transitions.map((status) => (
            <calcite-button
              key={status}
              appearance={status === 'CLOSED' || status === 'REJECTED' ? 'outline' : 'solid'}
              scale="m"
              loading={updateStatus.isPending}
              disabled={updateStatus.isPending}
              onClick={() => handleStatus(status)}
            >
              {status === 'UNDER_REVIEW' && 'Start review'}
              {status === 'MITIGATION_REQUIRED' && 'Skip to mitigation'}
              {status === 'CLOSED' && 'Close case'}
              {status === 'EVIDENCE_SUBMITTED' && 'Mark submitted'}
              {status === 'AGENCY_PENDING' && 'Send to agency'}
              {!['UNDER_REVIEW', 'MITIGATION_REQUIRED', 'CLOSED', 'EVIDENCE_SUBMITTED', 'AGENCY_PENDING'].includes(status) &&
                CASE_STATUS_LABELS[status]}
            </calcite-button>
          ))}
        </div>
      )}

      {showPlannerMitigation && (
        <div className="mt-4 space-y-3 border-t border-sand pt-4">
          {!showMitigationForm ? (
            <calcite-button appearance="solid" scale="m" onClick={() => setShowMitigationForm(true)}>
              Send to developer
            </calcite-button>
          ) : (
            <>
              <calcite-label scale="m" className="block">
                What must the developer do?
                <calcite-input
                  scale="m"
                  value={mitigationText}
                  oncalciteInputInput={(event) =>
                    setMitigationText((event.currentTarget as HTMLElement & { value: string }).value)
                  }
                />
              </calcite-label>
              <calcite-label scale="m" className="block">
                Assign to
                <calcite-select
                  scale="m"
                  value={assignedDeveloperId}
                  oncalciteSelectChange={(event) =>
                    setAssignedDeveloperId((event.target as HTMLElement & { value: string }).value)
                  }
                >
                  {DEMO_DEVELOPERS.map((dev) => (
                    <calcite-option key={dev.id} value={dev.id}>
                      {dev.name}
                    </calcite-option>
                  ))}
                </calcite-select>
              </calcite-label>
              <div className="flex gap-2">
                <calcite-button
                  appearance="solid"
                  scale="m"
                  loading={addMitigation.isPending}
                  disabled={addMitigation.isPending}
                  onClick={handleMitigation}
                >
                  Confirm and send
                </calcite-button>
                <calcite-button appearance="transparent" scale="m" onClick={() => setShowMitigationForm(false)}>
                  Cancel
                </calcite-button>
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
            className="mt-2 block w-full rounded border border-sand bg-[var(--calcite-color-foreground-1)] p-2 text-sm text-charcoal file:mr-3 file:rounded file:border-0 file:bg-[var(--calcite-color-foreground-3)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-charcoal"
          />
          {uploadEvidence.isPending && (
            <p className="mt-2 text-xs text-charcoal-muted">Uploading…</p>
          )}
          {locationStatus && <p className="mt-2 text-xs leading-relaxed text-charcoal-muted">Evidence provenance: {locationStatus} Location is supporting evidence and requires human verification.</p>}
        </div>
      )}

      {showAgencyVerify && (
        <div className="mt-4 space-y-3 border-t border-sand pt-4">
          <calcite-label scale="m" className="block">
            Note (optional)
            <calcite-input
              scale="m"
              value={verifyNote}
              placeholder="Inspector comment"
              oncalciteInputInput={(event) =>
                setVerifyNote((event.currentTarget as HTMLElement & { value: string }).value)
              }
            />
          </calcite-label>
          <div className="flex flex-wrap gap-2">
            <calcite-button
              appearance="solid"
              scale="m"
              loading={verifyCase.isPending}
              disabled={verifyCase.isPending}
              onClick={() =>
                verifyCase.mutate({ id: caseItem.id, decision: 'approved', note: verifyNote })
              }
            >
              Approve
            </calcite-button>
            <calcite-button
              appearance="outline"
              scale="m"
              loading={verifyCase.isPending}
              disabled={verifyCase.isPending}
              onClick={() =>
                verifyCase.mutate({ id: caseItem.id, decision: 'rejected', note: verifyNote })
              }
            >
              Reject
            </calcite-button>
          </div>
        </div>
      )}
      </div>
    </calcite-block>
  );
}
