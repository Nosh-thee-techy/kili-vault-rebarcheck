import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PreDevMap } from '@/components/predev/PreDevMap';
import { COMMUNITY_REPORT_TYPES } from '@/config/communityReports';
import { caseKeys } from '@/lib/queryClient';
import { submitObservation } from '@/lib/api';
import type { CommunityObservation, CommunityReportCategory } from '@/types';

const DEFAULT_LAT = -1.2921;
const DEFAULT_LON = 36.782;

function StepStrip({ step }: { step: 1 | 2 }) {
  const label = step === 1 ? 'Choose location' : 'Describe observation';
  return (
    <div className="w-full min-w-0 sm:w-64" aria-live="polite">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-[var(--calcite-color-text-1)]">
          Step {step} of 2
        </span>
        <span className="truncate text-[var(--calcite-color-text-3)]">
          {label}
        </span>
      </div>
      <calcite-progress
        value={String(step)}
        max="2"
        type="determinate"
        label={'Step ' + step + ' of 2: ' + label}
      />
    </div>
  );
}

export function CommunityReportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [lat, setLat] = useState<number | null>(DEFAULT_LAT);
  const [lon, setLon] = useState<number | null>(DEFAULT_LON);
  const [category, setCategory] = useState<CommunityReportCategory | null>(null);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState<CommunityObservation | null>(null);

  const handlePinDrop = useCallback((nextLat: number, nextLon: number) => {
    setLat(nextLat);
    setLon(nextLon);
  }, []);

  const mutation = useMutation({
    mutationFn: () => {
      const type = COMMUNITY_REPORT_TYPES.find((item) => item.id === category);
      const text =
        description.trim() || type?.hint || 'Community ground report';
      return submitObservation({
        lat: lat!,
        lon: lon!,
        description: text,
        category: category ?? 'OTHER',
      }).then((response) => response.data);
    },
    onSuccess: (data) => {
      setSubmitted(data);
      queryClient.invalidateQueries({ queryKey: caseKeys.myObservations() });
      queryClient.invalidateQueries({ queryKey: caseKeys.observations() });
      setStep(3);
    },
  });

  const panelHeading =
    step === 1
      ? 'Choose a location'
      : step === 2
        ? 'Describe the observation'
        : 'Report received';
  const panelDescription =
    step === 1
      ? 'Place the pin at the location where you observed a change.'
      : step === 2
        ? 'Select a category and add any useful details.'
        : 'Your report has been added to the ward review workflow.';

  return (
    <main className="mx-auto flex w-full max-w-[112rem] min-w-0 flex-col gap-4">
      <header className="flex min-w-0 flex-col gap-3 border-b border-[var(--calcite-color-border-3)] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/community"
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--calcite-color-text-3)] hover:text-[var(--calcite-color-text-1)]"
          >
            <calcite-icon icon="chevron-left" scale="s" />
            Community workspace
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--calcite-color-text-3)]">
            Community observation
          </p>
          <h1 className="mt-1 text-xl font-semibold text-[var(--calcite-color-text-1)] sm:text-2xl">
            Report a site observation
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--calcite-color-text-2)]">
            Share a location and description for planner review. A community
            report is an observation, not a verified finding.
          </p>
        </div>
        {step < 3 && <StepStrip step={step as 1 | 2} />}
      </header>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(22rem,0.8fr)]">
        <section className="min-w-0 overflow-hidden border border-[var(--calcite-color-border-3)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--calcite-color-border-3)] px-3 py-2.5 sm:px-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--calcite-color-text-1)]">
                Observation location
              </h2>
              <p className="text-xs text-[var(--calcite-color-text-3)]">
                Click or tap the map to move the pin.
              </p>
            </div>
            <calcite-chip icon="map-pin" scale="s">
              Kilimani
            </calcite-chip>
          </div>
          <PreDevMap
            lat={lat}
            lon={lon}
            onPinDrop={handlePinDrop}
            showProximity={false}
            className="h-[min(62vh,720px)] min-h-[360px] rounded-none border-0 sm:min-h-[440px]"
          />
        </section>

        <calcite-panel
          heading={panelHeading}
          description={panelDescription}
          className="min-h-[22rem] lg:min-h-0"
        >
          <div className="space-y-4 p-3 sm:p-4">
            {step === 1 && (
              <>
                <calcite-block
                  heading="Selected location"
                  description="The pin marks the approximate report location."
                  open
                >
                  <dl className="grid grid-cols-2 gap-3 px-4 pb-4 pt-2 text-sm">
                    <div>
                      <dt className="text-[var(--calcite-color-text-3)]">
                        Latitude
                      </dt>
                      <dd className="font-mono text-[var(--calcite-color-text-1)]">
                        {lat == null ? 'Not selected' : lat.toFixed(5)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--calcite-color-text-3)]">
                        Longitude
                      </dt>
                      <dd className="font-mono text-[var(--calcite-color-text-1)]">
                        {lon == null ? 'Not selected' : lon.toFixed(5)}
                      </dd>
                    </div>
                  </dl>
                </calcite-block>
                <calcite-notice open kind="info" scale="s">
                  Move the map pin as close as possible to the observed
                  location. The report will be reviewed before any case is
                  created.
                </calcite-notice>
                <calcite-button
                  appearance="solid"
                  icon-start="chevron-right"
                  scale="m"
                  className="w-full"
                  disabled={lat == null || lon == null}
                  onClick={() => setStep(2)}
                >
                  Continue to details
                </calcite-button>
              </>
            )}

            {step === 2 && (
              <>
                <fieldset className="min-w-0">
                  <legend className="mb-2 text-sm font-medium text-[var(--calcite-color-text-1)]">
                    Observation category
                  </legend>
                  <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                    {COMMUNITY_REPORT_TYPES.map((type) => (
                      <calcite-button
                        key={type.id}
                        appearance={category === type.id ? 'solid' : 'outline'}
                        icon-start={type.calciteIcon}
                        scale="m"
                        className="h-auto min-h-12 w-full"
                        aria-pressed={category === type.id}
                        onClick={() => setCategory(type.id)}
                      >
                        {type.label}
                      </calcite-button>
                    ))}
                  </div>
                </fieldset>

                {category && (
                  <p className="text-xs text-[var(--calcite-color-text-3)]">
                    {
                      COMMUNITY_REPORT_TYPES.find(
                        (item) => item.id === category,
                      )?.hint
                    }
                  </p>
                )}

                <calcite-label scale="m" className="block">
                  Details (optional)
                  <calcite-text-area
                    value={description}
                    rows={4}
                    maxLength={5000}
                    placeholder="Describe what you observed and when it happened."
                    oncalciteTextAreaInput={(event) =>
                      setDescription(
                        (event.currentTarget as HTMLElement & { value: string })
                          .value,
                      )
                    }
                  />
                </calcite-label>

                {mutation.isError && (
                  <calcite-notice open kind="danger" scale="s">
                    <span slot="title">Report could not be submitted</span>
                    {mutation.error instanceof Error
                      ? mutation.error.message
                      : 'Check your connection and try again.'}
                  </calcite-notice>
                )}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <calcite-button
                    appearance="outline"
                    icon-start="chevron-left"
                    scale="m"
                    onClick={() => setStep(1)}
                  >
                    Back to location
                  </calcite-button>
                  <calcite-button
                    appearance="solid"
                    icon-start="send"
                    scale="m"
                    loading={mutation.isPending}
                    disabled={!category || mutation.isPending}
                    onClick={() => mutation.mutate()}
                  >
                    Submit report
                  </calcite-button>
                </div>
              </>
            )}

            {step === 3 && submitted && (
              <>
                <calcite-notice open kind="success" scale="s">
                  <span slot="title">Report received</span>
                  Reference{' '}
                  <span className="font-mono font-semibold">
                    {submitted.id.slice(0, 8)}
                  </span>
                </calcite-notice>
                <calcite-block
                  heading="What happens next"
                  description="Your observation follows the ward review process."
                  open
                >
                  <ol className="list-decimal space-y-2 px-8 pb-4 pt-2 text-sm text-[var(--calcite-color-text-2)]">
                    <li>Your report appears in My reports for planner review.</li>
                    <li>
                      A planner checks it against mapped cases and ward
                      records.
                    </li>
                    <li>
                      If it is linked to a case, the status will update in your
                      report list.
                    </li>
                  </ol>
                </calcite-block>
                <calcite-button
                  appearance="solid"
                  icon-start="list"
                  scale="m"
                  className="w-full"
                  onClick={() => navigate('/community')}
                >
                  View my reports
                </calcite-button>
                <calcite-button
                  appearance="outline"
                  icon-start="plus"
                  scale="m"
                  className="w-full"
                  onClick={() => {
                    setSubmitted(null);
                    setStep(1);
                    setCategory(null);
                    setDescription('');
                    mutation.reset();
                  }}
                >
                  Report another observation
                </calcite-button>
              </>
            )}
          </div>
        </calcite-panel>
      </div>
    </main>
  );
}
