import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PreDevMap } from "@/components/predev/PreDevMap";
import { PreDevResultCard } from "@/components/predev/PreDevResultCard";
import {
  PRE_DEV_COVERAGE_OPTIONS,
  PRE_DEV_FLOOR_OPTIONS,
  PRE_DEV_PROJECT_TYPES,
  PRE_DEV_SETBACK_OPTIONS,
} from "@/config/preDevelopment";
import { CHANGE_TYPE_LABELS } from "@/config/theme";
import {
  usePreDevelopmentPreview,
  usePreDevelopmentSubmit,
} from "@/hooks/usePreDevelopment";
import type {
  ChangeType,
  PreDevelopmentAssessment,
  PreDevelopmentInput,
} from "@/types";

const DEFAULT_LAT = -1.2921;
const DEFAULT_LON = 36.782;

function downloadAssessment(assessment: PreDevelopmentAssessment) {
  const blob = new Blob([JSON.stringify(assessment, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `kili-vault-pre-check-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function StepStrip({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["Plot location", "Your plans", "Results"];

  return (
    <div className="w-full min-w-0 sm:w-56" aria-live="polite">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-charcoal">Step {step} of 3</span>
        <span className="truncate text-charcoal-muted">{labels[step - 1]}</span>
      </div>
      <calcite-progress
        value={String(step)}
        max="3"
        type="determinate"
        label={`Step ${step} of 3: ${labels[step - 1]}`}
      />
    </div>
  );
}

function PlanSummary({
  changeType,
  proposedFloors,
  coveragePercent,
  setbackMeters,
  lat,
  lon,
}: {
  changeType: ChangeType;
  proposedFloors: number;
  coveragePercent: number;
  setbackMeters: number;
  lat: number | null;
  lon: number | null;
}) {
  return (
    <calcite-block
      heading="Your inputs"
      description="Proposal details used for this assessment."
      collapsible
      open
    >
      <dl className="grid gap-x-4 gap-y-3 px-4 pb-4 pt-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-charcoal-muted">Project</dt>
          <dd className="font-medium text-charcoal">
            {CHANGE_TYPE_LABELS[changeType]}
          </dd>
        </div>
        <div>
          <dt className="text-charcoal-muted">Floors</dt>
          <dd className="font-medium text-charcoal">{proposedFloors}</dd>
        </div>
        <div>
          <dt className="text-charcoal-muted">Ground coverage</dt>
          <dd className="font-medium text-charcoal">~{coveragePercent}%</dd>
        </div>
        <div>
          <dt className="text-charcoal-muted">Boundary setback</dt>
          <dd className="font-medium text-charcoal">{setbackMeters} m</dd>
        </div>
        {lat != null && lon != null && (
          <div className="sm:col-span-2">
            <dt className="text-charcoal-muted">Site coordinates</dt>
            <dd className="font-mono text-xs font-medium text-charcoal">
              {lat.toFixed(5)}, {lon.toFixed(5)}
            </dd>
          </div>
        )}
      </dl>
    </calcite-block>
  );
}

export function PreDevelopmentCheckPage() {
  const navigate = useNavigate();
  const previewMutation = usePreDevelopmentPreview();
  const submitMutation = usePreDevelopmentSubmit();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [lat, setLat] = useState<number | null>(DEFAULT_LAT);
  const [lon, setLon] = useState<number | null>(DEFAULT_LON);
  const [changeType, setChangeType] = useState<ChangeType>(
    "BUILDING_DEVELOPMENT",
  );
  const [proposedFloors, setProposedFloors] = useState(2);
  const [coveragePercent, setCoveragePercent] = useState(50);
  const [setbackMeters, setSetbackMeters] = useState(3);
  const [description, setDescription] = useState("");
  const [assessment, setAssessment] =
    useState<PreDevelopmentAssessment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handlePinDrop = useCallback((nextLat: number, nextLon: number) => {
    setLat(nextLat);
    setLon(nextLon);
    setAssessment(null);
    setStep((currentStep) => (currentStep === 3 ? 2 : currentStep));
  }, []);

  const buildInput = useMemo((): PreDevelopmentInput | null => {
    if (lat == null || lon == null) return null;
    const trimmed = description.trim();
    const autoDescription =
      trimmed ||
      `Proposed ${CHANGE_TYPE_LABELS[changeType].toLowerCase()} — ${proposedFloors} floor(s), ~${coveragePercent}% coverage`;

    return {
      lat,
      lon,
      changeType,
      proposedFloors,
      coveragePercent,
      setbackMeters,
      description: autoDescription,
    };
  }, [
    lat,
    lon,
    changeType,
    proposedFloors,
    coveragePercent,
    setbackMeters,
    description,
  ]);

  const runPreview = async () => {
    if (!buildInput) {
      setFormError("Drop a pin on the map first.");
      return;
    }
    setFormError(null);
    try {
      const result = await previewMutation.mutateAsync(buildInput);
      setAssessment(result);
      setStep(3);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Assessment failed");
    }
  };

  const runSubmit = async () => {
    if (!buildInput) return;
    setFormError(null);
    try {
      const created = await submitMutation.mutateAsync(buildInput);
      navigate(`/developer/cases/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Submit failed");
    }
  };

  const panelHeading =
    step === 1
      ? "Choose a plot"
      : step === 2
        ? "Describe your proposal"
        : "Plot readiness assessment";

  return (
    <main className="mx-auto flex w-full max-w-[112rem] flex-col gap-4 px-3 py-4 sm:px-5 md:py-5">
      <header className="flex min-w-0 flex-col gap-3 border-b border-sand pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <calcite-button
            appearance="transparent"
            icon-start="chevron-left"
            scale="s"
            onClick={() => navigate("/developer")}
          >
            Development Cases
          </calcite-button>
          <h1 className="mt-2 font-body text-xl font-semibold text-charcoal sm:text-2xl">
            Plot readiness check
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-charcoal-muted">
            Set a site, describe the proposed work, and review indicative ward
            guidance before you proceed.
          </p>
        </div>
        <StepStrip step={step} />
      </header>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,27rem)]">
        <section aria-label="Select the plot on the map" className="min-w-0">
          <PreDevMap
            lat={lat}
            lon={lon}
            onPinDrop={handlePinDrop}
            className="h-[42vh] min-h-[260px] max-h-[380px] xl:h-[min(72vh,760px)] xl:min-h-[500px] xl:max-h-[760px]"
          />
        </section>

        <calcite-panel
          heading={panelHeading}
          description={
            step === 1
              ? "Place the site pin on the map."
              : step === 2
                ? "Provide the details for the proposed development."
                : "Review the indicative result and decide whether to send it to a planner."
          }
          className="min-w-0 xl:h-[min(72vh,760px)] xl:min-h-[500px]"
        >
          <div className="space-y-4 p-3 sm:p-4">
            {step === 1 && (
              <>
                <calcite-block
                  heading="Site location"
                  description="The assessment uses the selected map coordinates."
                  collapsible
                  open
                >
                  <dl className="grid gap-3 px-4 pb-4 pt-2 text-sm">
                    <div>
                      <dt className="text-charcoal-muted">Selected coordinates</dt>
                      <dd className="mt-0.5 font-mono text-xs font-medium text-charcoal">
                        {lat != null && lon != null
                          ? `${lat.toFixed(5)}, ${lon.toFixed(5)}`
                          : "No site selected"}
                      </dd>
                    </div>
                  </dl>
                </calcite-block>
                <calcite-notice open kind="info" scale="s">
                  Click or tap the map to place the pin. You can move it again
                  before checking the proposal.
                </calcite-notice>
                <calcite-button
                  appearance="solid"
                  icon-start="chevron-right"
                  scale="m"
                  className="w-full"
                  disabled={lat == null || lon == null}
                  onClick={() => setStep(2)}
                >
                  Continue to proposal
                </calcite-button>
              </>
            )}

            {step === 2 && (
              <>
                <calcite-block
                  heading="Proposed work"
                  description="Choose the closest match for your plans."
                  collapsible
                  open
                >
                  <div className="space-y-4 px-4 pb-4 pt-2">
                    <calcite-label scale="m">
                      Project type
                      <calcite-select
                        scale="m"
                        value={changeType}
                        oncalciteSelectChange={(event) => {
                          const value = (
                            event.target as HTMLElement & { value: string }
                          ).value as ChangeType;
                          setChangeType(value);
                          setAssessment(null);
                        }}
                      >
                        {PRE_DEV_PROJECT_TYPES.map((type) => (
                          <calcite-option key={type.id} value={type.id}>
                            {type.label} — {type.hint}
                          </calcite-option>
                        ))}
                      </calcite-select>
                    </calcite-label>

                    <calcite-label scale="m">
                      Proposed floors
                      <calcite-select
                        scale="m"
                        value={String(proposedFloors)}
                        oncalciteSelectChange={(event) => {
                          setProposedFloors(
                            Number(
                              (event.target as HTMLElement & { value: string })
                                .value,
                            ),
                          );
                          setAssessment(null);
                        }}
                      >
                        {PRE_DEV_FLOOR_OPTIONS.map((option) => (
                          <calcite-option
                            key={option.value}
                            value={String(option.value)}
                          >
                            {option.label}
                          </calcite-option>
                        ))}
                      </calcite-select>
                    </calcite-label>

                    <calcite-label scale="m">
                      Ground coverage
                      <calcite-select
                        scale="m"
                        value={String(coveragePercent)}
                        oncalciteSelectChange={(event) => {
                          setCoveragePercent(
                            Number(
                              (event.target as HTMLElement & { value: string })
                                .value,
                            ),
                          );
                          setAssessment(null);
                        }}
                      >
                        {PRE_DEV_COVERAGE_OPTIONS.map((option) => (
                          <calcite-option
                            key={option.value}
                            value={String(option.value)}
                          >
                            {option.label} — {option.hint}
                          </calcite-option>
                        ))}
                      </calcite-select>
                    </calcite-label>

                    <calcite-label scale="m">
                      Boundary setback
                      <calcite-select
                        scale="m"
                        value={String(setbackMeters)}
                        oncalciteSelectChange={(event) => {
                          setSetbackMeters(
                            Number(
                              (event.target as HTMLElement & { value: string })
                                .value,
                            ),
                          );
                          setAssessment(null);
                        }}
                      >
                        {PRE_DEV_SETBACK_OPTIONS.map((option) => (
                          <calcite-option
                            key={option.value}
                            value={String(option.value)}
                          >
                            {option.label} — {option.hint}
                          </calcite-option>
                        ))}
                      </calcite-select>
                    </calcite-label>

                    <calcite-label scale="m">
                      Additional details (optional)
                      <calcite-text-area
                        value={description}
                        rows={3}
                        placeholder="e.g. basement parking, mixed retail and residential"
                        oncalciteTextAreaInput={(event) => {
                          setDescription(
                            (event.target as HTMLElement & { value: string })
                              .value,
                          );
                          setAssessment(null);
                        }}
                      />
                    </calcite-label>
                  </div>
                </calcite-block>

                {formError && (
                  <calcite-notice open kind="danger" scale="s">
                    {formError}
                  </calcite-notice>
                )}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <calcite-button
                    appearance="outline"
                    icon-start="chevron-left"
                    scale="m"
                    onClick={() => setStep(1)}
                  >
                    Back to map
                  </calcite-button>
                  <calcite-button
                    appearance="solid"
                    icon-start="analysis"
                    scale="m"
                    loading={previewMutation.isPending}
                    onClick={() => void runPreview()}
                  >
                    Check my plot
                  </calcite-button>
                </div>
              </>
            )}

            {step === 3 && assessment && (
              <>
                <PreDevResultCard
                  assessment={assessment}
                  onDownload={() => downloadAssessment(assessment)}
                  onSubmit={() => void runSubmit()}
                  isSubmitting={submitMutation.isPending}
                />

                <PlanSummary
                  changeType={changeType}
                  proposedFloors={proposedFloors}
                  coveragePercent={coveragePercent}
                  setbackMeters={setbackMeters}
                  lat={lat}
                  lon={lon}
                />

                <calcite-block
                  heading="What happens after submission"
                  collapsible
                >
                  <ol className="list-decimal space-y-2 px-8 pb-4 pt-2 text-sm text-charcoal-muted">
                    <li>A planner receives your pre-check as a case.</li>
                    <li>
                      They compare it against ward layers and satellite history.
                    </li>
                    <li>
                      You receive any requirements before proceeding with work.
                    </li>
                  </ol>
                </calcite-block>

                {formError && (
                  <calcite-notice open kind="danger" scale="s">
                    {formError}
                  </calcite-notice>
                )}

                <calcite-button
                  appearance="outline"
                  icon-start="pencil"
                  scale="m"
                  className="w-full"
                  onClick={() => {
                    setAssessment(null);
                    setStep(2);
                  }}
                >
                  Change my answers
                </calcite-button>
              </>
            )}
          </div>
        </calcite-panel>
      </div>
    </main>
  );
}
