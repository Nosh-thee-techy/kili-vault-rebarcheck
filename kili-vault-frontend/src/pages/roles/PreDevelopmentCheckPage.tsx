import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Download, MapPin, Send } from 'lucide-react';
import { PageHero } from '@/components/dashboard/PageHero';
import { PreDevMap } from '@/components/predev/PreDevMap';
import { ProjectedRiskPanel } from '@/components/predev/ProjectedRiskPanel';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { usePreDevelopmentPreview, usePreDevelopmentSubmit } from '@/hooks/usePreDevelopment';
import { CHANGE_TYPE_LABELS } from '@/config/theme';
import type { ChangeType, PreDevelopmentAssessment, PreDevelopmentInput } from '@/types';

const PRE_DEV_CHANGE_TYPES: ChangeType[] = [
  'BUILDING_DEVELOPMENT',
  'INFRASTRUCTURE_CHANGE',
  'LAND_CLEARING',
];

const DEFAULT_LAT = -1.2921;
const DEFAULT_LON = 36.782;

function downloadAssessment(assessment: PreDevelopmentAssessment) {
  const blob = new Blob([JSON.stringify(assessment, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `kili-vault-pre-check-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PreDevelopmentCheckPage() {
  const navigate = useNavigate();
  const previewMutation = usePreDevelopmentPreview();
  const submitMutation = usePreDevelopmentSubmit();

  const [lat, setLat] = useState<number | null>(DEFAULT_LAT);
  const [lon, setLon] = useState<number | null>(DEFAULT_LON);
  const [changeType, setChangeType] = useState<ChangeType>('BUILDING_DEVELOPMENT');
  const [proposedFloors, setProposedFloors] = useState('2');
  const [coveragePercent, setCoveragePercent] = useState('45');
  const [setbackMeters, setSetbackMeters] = useState('3');
  const [description, setDescription] = useState('');
  const [assessment, setAssessment] = useState<PreDevelopmentAssessment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handlePinDrop = useCallback((nextLat: number, nextLon: number) => {
    setLat(nextLat);
    setLon(nextLon);
    setAssessment(null);
  }, []);

  const buildInput = useMemo((): PreDevelopmentInput | null => {
    if (lat == null || lon == null) return null;
    const trimmed = description.trim();
    if (!trimmed) return null;

    const floors = Number(proposedFloors);
    const coverage = Number(coveragePercent);
    const setback = Number(setbackMeters);
    if (!Number.isFinite(floors) || !Number.isFinite(coverage) || !Number.isFinite(setback)) {
      return null;
    }

    return {
      lat,
      lon,
      changeType,
      proposedFloors: floors,
      coveragePercent: coverage,
      setbackMeters: setback,
      description: trimmed,
    };
  }, [lat, lon, changeType, proposedFloors, coveragePercent, setbackMeters, description]);

  const runPreview = async () => {
    if (!buildInput) {
      setFormError('Drop a pin on the map and complete all fields (description required).');
      return;
    }
    setFormError(null);
    try {
      const result = await previewMutation.mutateAsync(buildInput);
      setAssessment(result);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Assessment failed');
    }
  };

  const runSubmit = async () => {
    if (!buildInput) {
      setFormError('Complete the form before submitting.');
      return;
    }
    setFormError(null);
    try {
      const created = await submitMutation.mutateAsync(buildInput);
      navigate(`/developer/cases/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Submit failed');
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHero
        eyebrow="Before you build"
        title="Pre-development check"
        description="Pin your plot, describe what you plan to do, and see projected planning risk before work starts. Informational only — not a permit."
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-2">
          <Card padding="md">
            <CardHeader
              title="Project location"
              description="Click the map to place your plot pin within Kilimani Ward."
            />
            <PreDevMap lat={lat} lon={lon} onPinDrop={handlePinDrop} className="h-[320px] rounded-xl" />
            {lat != null && lon != null && (
              <p className="mt-3 font-mono text-xs text-charcoal-muted">
                Pin: {lat.toFixed(5)}, {lon.toFixed(5)}
              </p>
            )}
          </Card>

          <Card padding="md">
            <CardHeader
              title="Proposed change"
              description="Self-reported inputs for a hypothetical risk screen."
            />
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void runPreview();
              }}
            >
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-charcoal">Change type</span>
                <select
                  value={changeType}
                  onChange={(e) => {
                    setChangeType(e.target.value as ChangeType);
                    setAssessment(null);
                  }}
                  className="h-11 w-full rounded-xl border border-sand bg-off-white px-4 text-sm text-charcoal focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"
                >
                  {PRE_DEV_CHANGE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {CHANGE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="Floors"
                  type="number"
                  min={1}
                  max={50}
                  value={proposedFloors}
                  onChange={(e) => {
                    setProposedFloors(e.target.value);
                    setAssessment(null);
                  }}
                />
                <Input
                  label="Coverage %"
                  type="number"
                  min={0}
                  max={100}
                  value={coveragePercent}
                  onChange={(e) => {
                    setCoveragePercent(e.target.value);
                    setAssessment(null);
                  }}
                  hint="Ground footprint"
                />
                <Input
                  label="Setback (m)"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={setbackMeters}
                  onChange={(e) => {
                    setSetbackMeters(e.target.value);
                    setAssessment(null);
                  }}
                />
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-charcoal">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setAssessment(null);
                  }}
                  required
                  rows={4}
                  placeholder="Describe the planned works — e.g. four-storey mixed-use block with basement parking…"
                  className="w-full rounded-xl border border-sand bg-off-white px-4 py-3 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"
                />
              </label>

              {formError && (
                <p className="rounded-xl border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay-dark">
                  {formError}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={previewMutation.isPending}
                  className="gap-2"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Assess projected risk
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-3">
          {assessment ? (
            <>
              <ProjectedRiskPanel
                title={assessment.title}
                changeType={assessment.input.changeType}
                risk={assessment.risk}
                flags={assessment.flags}
                disclaimer={assessment.disclaimer}
                coordinates={{ lat: assessment.input.lat, lon: assessment.input.lon }}
              />

              <Card padding="md">
                <CardHeader
                  title="Next steps"
                  description="Tier 1: keep the assessment for your records. Tier 2: send to the planner queue."
                />
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => downloadAssessment(assessment)}
                  >
                    <Download className="h-4 w-4" />
                    Download assessment
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2"
                    isLoading={submitMutation.isPending}
                    onClick={() => void runSubmit()}
                  >
                    <Send className="h-4 w-4" />
                    Submit for planner review
                  </Button>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-charcoal-muted">
                  Submitting creates a case in <strong>Under review</strong> status. A planner will
                  assess whether mitigation is required before you proceed.
                </p>
              </Card>
            </>
          ) : (
            <Card padding="md" className="border-dashed border-sand">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MapPin className="mb-4 h-10 w-10 text-sage" strokeWidth={1.5} />
                <h3 className="font-display text-lg font-semibold text-charcoal">
                  No assessment yet
                </h3>
                <p className="mt-2 max-w-md text-sm text-charcoal-muted">
                  Place a pin, fill in your proposed change, and run the risk screen. Results appear
                  here with planning, infrastructure, environmental, and community indicators.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
