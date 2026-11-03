import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import type Geometry from "@arcgis/core/geometry/Geometry";
import { DevelopmentSimulatorMap } from "@/components/simulator/DevelopmentSimulatorMap";
import {
  calculateMetrics,
  scenarioRectangle,
  type ScenarioInputs,
  type ScenarioMetrics,
  type SiteContext,
} from "@/lib/developmentSimulator";
import { getZoningAdvice } from "@/lib/zoningAdvisor";

const EMPTY_INPUTS: ScenarioInputs = {
  footprintAreaM2: 0,
  floors: 1,
  units: 0,
  occupancyPerUnit: 3,
  stormwaterManagement: false,
};

function formatArea(value: number | null) {
  return value == null || !Number.isFinite(value)
    ? "Unavailable"
    : Math.round(value).toLocaleString() + " m²";
}

function formatPercent(value: number | null) {
  return value == null || !Number.isFinite(value)
    ? "Unavailable"
    : value.toFixed(1) + "%";
}

function formatDistance(value: number | null) {
  return value == null || !Number.isFinite(value)
    ? "Unavailable"
    : Math.round(value) + " m";
}

function overlapWithBuffer(
  geometry: Geometry | null,
  site: SiteContext | null,
) {
  if (!geometry || !site?.riverBufferGeometries.length) return false;
  return site.riverBufferGeometries.some((buffer) =>
    geometryEngine.intersects(geometry, buffer),
  );
}

function inputValue(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function ScenarioInputsForm({
  title,
  inputs,
  onChange,
}: {
  title: string;
  inputs: ScenarioInputs;
  onChange: (next: ScenarioInputs) => void;
}) {
  const update = (key: keyof ScenarioInputs, value: number | boolean) =>
    onChange({ ...inputs, [key]: value });

  return (
    <calcite-block
      heading={title}
      description="Edit proposal values to compare their mapped effects."
      collapsible
      open
    >
      <div className="grid min-w-0 gap-3 px-4 pb-4 pt-2 sm:grid-cols-2">
        <calcite-label scale="m" className="block min-w-0">
          Footprint area (m²)
          <calcite-input
            type="number"
            min="0"
            step="1"
            scale="m"
            value={String(inputValue(inputs.footprintAreaM2))}
            oncalciteInputInput={(event) =>
              update(
                "footprintAreaM2",
                Number(
                  (event.currentTarget as HTMLElement & { value: string })
                    .value,
                ),
              )
            }
          />
        </calcite-label>
        <calcite-label scale="m" className="block min-w-0">
          Floors
          <calcite-input
            type="number"
            min="0"
            step="1"
            scale="m"
            value={String(inputValue(inputs.floors))}
            oncalciteInputInput={(event) =>
              update(
                "floors",
                Number(
                  (event.currentTarget as HTMLElement & { value: string })
                    .value,
                ),
              )
            }
          />
        </calcite-label>
        <calcite-label scale="m" className="block min-w-0">
          Residential units
          <calcite-input
            type="number"
            min="0"
            step="1"
            scale="m"
            value={String(inputValue(inputs.units))}
            oncalciteInputInput={(event) =>
              update(
                "units",
                Number(
                  (event.currentTarget as HTMLElement & { value: string })
                    .value,
                ),
              )
            }
          />
        </calcite-label>
        <calcite-label scale="m" className="block min-w-0">
          Occupants per unit
          <calcite-input
            type="number"
            min="0"
            step="0.5"
            scale="m"
            value={String(inputValue(inputs.occupancyPerUnit))}
            oncalciteInputInput={(event) =>
              update(
                "occupancyPerUnit",
                Number(
                  (event.currentTarget as HTMLElement & { value: string })
                    .value,
                ),
              )
            }
          />
        </calcite-label>
      </div>
      <div className="border-t border-[var(--calcite-color-border-3)] px-4 py-3">
        <calcite-label layout="inline" scale="s">
          <calcite-checkbox
            checked={inputs.stormwaterManagement}
            oncalciteCheckboxChange={(event) =>
              update(
                "stormwaterManagement",
                (event.currentTarget as HTMLElement & { checked: boolean })
                  .checked,
              )
            }
          />
          Stormwater management included in scenario
        </calcite-label>
        <p className="mt-3 text-xs leading-relaxed text-[var(--calcite-color-text-3)]">
          Indicative estimate. Occupancy assumes {inputs.occupancyPerUnit || 0}{" "}
          occupant(s) per unit. This is not an engineering assessment or
          statutory approval.
        </p>
      </div>
    </calcite-block>
  );
}

function MetricRow({
  label,
  values,
  format = formatArea,
}: {
  label: string;
  values: (number | null)[];
  format?: (value: number | null) => string;
}) {
  return (
    <calcite-table-row>
      <calcite-table-cell>{label}</calcite-table-cell>
      {values.map((value, index) => (
        <calcite-table-cell key={label + "-" + index}>
          {format(value)}
        </calcite-table-cell>
      ))}
    </calcite-table-row>
  );
}

export function DevelopmentImpactSimulatorPage() {
  const [searchParams] = useSearchParams();
  const initialParcelRef = searchParams.get("parcel");
  const [site, setSite] = useState<SiteContext | null>(null);
  const [proposed, setProposed] = useState<ScenarioInputs>(EMPTY_INPUTS);
  const [mitigated, setMitigated] = useState<ScenarioInputs>(EMPTY_INPUTS);

  const handleSiteSelected = useCallback((nextSite: SiteContext) => {
    setSite(nextSite);
    const startingFootprint = Math.round(nextSite.existingBuildingAreaM2);
    setProposed((current) => ({
      ...current,
      footprintAreaM2: startingFootprint,
    }));
    setMitigated((current) => ({
      ...current,
      footprintAreaM2: startingFootprint,
    }));
  }, []);

  const proposedGeometry = useMemo(
    () =>
      site
        ? scenarioRectangle(site.parcelGeometry, proposed.footprintAreaM2)
        : null,
    [proposed.footprintAreaM2, site],
  );
  const mitigatedGeometry = useMemo(
    () =>
      site
        ? scenarioRectangle(site.parcelGeometry, mitigated.footprintAreaM2)
        : null,
    [mitigated.footprintAreaM2, site],
  );

  const existingMetrics: ScenarioMetrics | null = site
    ? {
        builtUpAreaM2: site.existingBuildingAreaM2,
        builtUpSharePercent:
          site.parcelAreaM2 > 0
            ? (site.existingBuildingAreaM2 / site.parcelAreaM2) * 100
            : null,
        openSurfaceM2:
          site.parcelAreaM2 > 0
            ? Math.max(0, site.parcelAreaM2 - site.existingBuildingAreaM2)
            : null,
        floorAreaM2: site.existingBuildingAreaM2,
        estimatedOccupancy: null,
        riverBufferOverlap: site.riverBufferOverlap,
      }
    : null;
  const proposedMetrics = site
    ? calculateMetrics(
        site.parcelAreaM2,
        proposed,
        overlapWithBuffer(proposedGeometry, site),
      )
    : null;
  const mitigatedMetrics = site
    ? calculateMetrics(
        site.parcelAreaM2,
        mitigated,
        overlapWithBuffer(mitigatedGeometry, site),
      )
    : null;

  const zoningAdvice = useMemo(() => {
    if (!site || !proposedMetrics) return [];
    return getZoningAdvice({
      landUse: site.landUse,
      parcelAreaM2: site.parcelAreaM2,
      footprintAreaM2: proposed.footprintAreaM2,
      floors: proposed.floors,
      floorAreaM2: proposedMetrics.floorAreaM2,
      riverBufferOverlap: proposedMetrics.riverBufferOverlap,
      roadDistanceM: site.roadDistanceM,
    });
  }, [proposed, proposedMetrics, site]);

  const recommendations = useMemo(() => {
    if (!site || !proposedMetrics || !mitigatedMetrics) return [];
    const prompts: string[] = [];
    if (
      (proposedMetrics.openSurfaceM2 ?? 0) <
      (existingMetrics?.openSurfaceM2 ?? 0) * 0.7
    )
      prompts.push("Consider increasing permeable or open site area.");
    if (proposedMetrics.riverBufferOverlap)
      prompts.push(
        "Review the proposed footprint against the mapped river buffer and applicable planning requirements.",
      );
    if ((proposedMetrics.estimatedOccupancy ?? 0) > 100)
      prompts.push(
        "Review available infrastructure capacity before proceeding.",
      );
    if (
      proposedMetrics.builtUpAreaM2 >
      (existingMetrics?.builtUpAreaM2 ?? 0) * 1.5
    )
      prompts.push(
        "Consider testing a lower-footprint or alternative massing scenario.",
      );
    if (!prompts.length)
      prompts.push(
        "No additional spatial prompt was triggered by the current inputs. Continue professional planning review.",
      );
    return prompts;
  }, [existingMetrics, mitigatedMetrics, proposedMetrics, site]);

  return (
    <main className="mx-auto flex w-full max-w-[112rem] min-w-0 flex-col gap-4 px-3 py-4 sm:px-5 md:gap-5 md:py-5">
      <header className="flex min-w-0 flex-col gap-3 border-b border-[var(--calcite-color-border-3)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/developer"
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--calcite-color-text-3)] hover:text-[var(--calcite-color-text-1)]"
          >
            <calcite-icon icon="chevron-left" scale="s" />
            Development cases
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--calcite-color-text-3)]">
            Scenario testing
          </p>
          <h1 className="mt-1 text-xl font-semibold text-[var(--calcite-color-text-1)] sm:text-2xl">
            Development impact simulator
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--calcite-color-text-2)]">
            Compare existing conditions with a proposed development and a
            mitigated alternative using mapped parcel context.
          </p>
        </div>
        <calcite-chip icon="analysis" scale="s">
          Existing · Proposed · Mitigated
        </calcite-chip>
      </header>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.8fr)]">
        <section className="min-w-0 overflow-hidden border border-[var(--calcite-color-border-3)]">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--calcite-color-border-3)] px-3 py-2.5 sm:px-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[var(--calcite-color-text-1)]">
                Scenario map
              </h2>
              <p className="text-xs text-[var(--calcite-color-text-3)]">
                Select a parcel to load its existing buildings and spatial
                context.
              </p>
            </div>
            <calcite-chip icon="map" scale="s">
              Kilimani
            </calcite-chip>
          </div>
          <DevelopmentSimulatorMap
            proposedGeometry={proposedGeometry}
            mitigatedGeometry={mitigatedGeometry}
            onSiteSelected={handleSiteSelected}
            initialParcelRef={initialParcelRef}
            className="h-[min(62vh,720px)] min-h-[380px] rounded-none border-0 sm:min-h-[460px]"
          />
        </section>

        <aside className="min-w-0">
          <calcite-panel
            heading="Selected parcel"
            description="Values are queried from the mapped parcel and context layers."
            className="min-h-0"
          >
            {!site ? (
              <div className="p-4">
                <calcite-notice open kind="info" scale="s">
                  Select a parcel on the map to review its attributes and
                  compare development scenarios.
                </calcite-notice>
              </div>
            ) : (
              <dl className="grid gap-x-5 gap-y-3 p-4 text-sm sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <dt className="text-[var(--calcite-color-text-3)]">
                    Parcel identifier
                  </dt>
                  <dd className="break-words font-medium text-[var(--calcite-color-text-1)]">
                    {site.parcelId ?? "Not available in layer"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--calcite-color-text-3)]">
                    Land use
                  </dt>
                  <dd className="font-medium text-[var(--calcite-color-text-1)]">
                    {site.landUse ?? "Not available in layer"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--calcite-color-text-3)]">
                    Parcel area
                  </dt>
                  <dd className="font-medium text-[var(--calcite-color-text-1)]">
                    {formatArea(site.parcelAreaM2)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--calcite-color-text-3)]">
                    Mapped buildings
                  </dt>
                  <dd className="font-medium text-[var(--calcite-color-text-1)]">
                    {site.existingBuildingCount}
                  </dd>
                </div>
              </dl>
            )}
            {site && (
              <calcite-block
                heading="Spatial context"
                description="Nearest mapped features and known buffer relationship."
                collapsible
                open
              >
                <dl className="grid gap-3 px-4 pb-4 pt-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-[var(--calcite-color-text-3)]">
                      Nearest mapped road
                    </dt>
                    <dd className="text-right font-medium text-[var(--calcite-color-text-1)]">
                      {formatDistance(site.roadDistanceM)}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-[var(--calcite-color-text-3)]">
                      Nearest mapped river
                    </dt>
                    <dd className="text-right font-medium text-[var(--calcite-color-text-1)]">
                      {formatDistance(site.riverDistanceM)}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-[var(--calcite-color-text-3)]">
                      River buffer
                    </dt>
                    <dd className="text-right font-medium text-[var(--calcite-color-text-1)]">
                      {site.riverBufferOverlap
                        ? "Review required"
                        : "No overlap observed"}
                    </dd>
                  </div>
                  <p className="border-t border-[var(--calcite-color-border-3)] pt-3 text-xs leading-relaxed text-[var(--calcite-color-text-3)]">
                    Infrastructure capacity is unavailable in this simulator
                    dataset. Proximity is spatial context only.
                  </p>
                </dl>
              </calcite-block>
            )}
          </calcite-panel>
        </aside>
      </section>

      <section className="min-w-0">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-[var(--calcite-color-text-1)]">
            Scenario inputs
          </h2>
          <p className="text-sm text-[var(--calcite-color-text-3)]">
            Proposed and mitigated footprints are temporary client-side
            scenarios.
          </p>
        </div>
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <ScenarioInputsForm
            title="Proposed development"
            inputs={proposed}
            onChange={setProposed}
          />
          <ScenarioInputsForm
            title="Mitigated scenario"
            inputs={mitigated}
            onChange={setMitigated}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <calcite-button
            appearance="outline"
            icon-start="copy"
            scale="s"
            disabled={!site}
            onClick={() => setMitigated(proposed)}
          >
            Copy proposed values to mitigation
          </calcite-button>
        </div>
      </section>

      <calcite-panel
        heading="Spatial effects"
        description="Indicative values calculated from selected parcel geometry and scenario inputs."
      >
        {!site ? (
          <p className="p-4 text-sm text-[var(--calcite-color-text-3)]">
            Select a parcel to calculate the supported indicators.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <calcite-table
              caption="Existing, proposed, and mitigated scenario indicators"
              bordered
              scale="s"
            >
              <calcite-table-row slot="table-header">
                <calcite-table-header heading="Indicator" />
                <calcite-table-header heading="Existing" />
                <calcite-table-header heading="Proposed" />
                <calcite-table-header heading="Mitigated" />
              </calcite-table-row>
              <MetricRow
                label="Building footprint"
                values={[
                  existingMetrics?.builtUpAreaM2 ?? null,
                  proposedMetrics?.builtUpAreaM2 ?? null,
                  mitigatedMetrics?.builtUpAreaM2 ?? null,
                ]}
              />
              <MetricRow
                label="Built-up share"
                values={[
                  existingMetrics?.builtUpSharePercent ?? null,
                  proposedMetrics?.builtUpSharePercent ?? null,
                  mitigatedMetrics?.builtUpSharePercent ?? null,
                ]}
                format={formatPercent}
              />
              <MetricRow
                label="Open surface"
                values={[
                  existingMetrics?.openSurfaceM2 ?? null,
                  proposedMetrics?.openSurfaceM2 ?? null,
                  mitigatedMetrics?.openSurfaceM2 ?? null,
                ]}
              />
              <MetricRow
                label="Estimated floor area"
                values={[
                  existingMetrics?.floorAreaM2 ?? null,
                  proposedMetrics?.floorAreaM2 ?? null,
                  mitigatedMetrics?.floorAreaM2 ?? null,
                ]}
              />
              <MetricRow
                label="Estimated occupants"
                values={[
                  existingMetrics?.estimatedOccupancy ?? null,
                  proposedMetrics?.estimatedOccupancy ?? null,
                  mitigatedMetrics?.estimatedOccupancy ?? null,
                ]}
                format={(value) =>
                  value == null
                    ? "Unavailable"
                    : Math.round(value).toLocaleString()
                }
              />
              <MetricRow
                label="River buffer interaction"
                values={[
                  existingMetrics?.riverBufferOverlap ? 1 : 0,
                  proposedMetrics?.riverBufferOverlap ? 1 : 0,
                  mitigatedMetrics?.riverBufferOverlap ? 1 : 0,
                ]}
                format={(value) =>
                  value ? "Review required" : "No overlap observed"
                }
              />
            </calcite-table>
          </div>
        )}
      </calcite-panel>

      {site && (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <calcite-panel
            heading="Planning prompts"
            description="Items to review with a qualified professional."
          >
            <ul className="space-y-3 p-4 text-sm text-[var(--calcite-color-text-2)]">
              {recommendations.map((prompt) => (
                <li
                  key={prompt}
                  className="flex items-start gap-2 border-b border-[var(--calcite-color-border-3)] pb-3 last:border-0 last:pb-0"
                >
                  <calcite-icon
                    icon="information"
                    scale="s"
                    className="mt-0.5 shrink-0"
                  />
                  <span>{prompt}</span>
                </li>
              ))}
            </ul>
          </calcite-panel>
          <calcite-panel
            heading="Scope and limitations"
            description="How to interpret the displayed scenario values."
          >
            <p className="p-4 text-sm leading-relaxed text-[var(--calcite-color-text-2)]">
              Official parcel, land-use, building, road, river and river-buffer
              layers remain read-only. Proposed and mitigated footprints are
              temporary client-side scenario objects. Estimates are indicative
              and require professional planning, environmental and engineering
              review.
            </p>
          </calcite-panel>
        </div>
      )}

      {site && proposedMetrics && (
        <calcite-panel
          heading="Kilimani zoning context"
          description="Guide-based prompts derived from the selected parcel's mapped context. This is not an approval or compliance decision."
        >
          <div className="flex flex-col gap-3 p-4">
            <calcite-notice open kind="info" scale="s">
              Review these prompts with a registered professional. Mapped
              context and estimates may not represent current statutory
              requirements.
            </calcite-notice>
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              {zoningAdvice.map((item) => (
                <calcite-block
                  key={item.title + "-" + item.message}
                  heading={item.title}
                  description={"Basis: " + item.basis}
                  open
                >
                  <p className="px-4 pb-4 pt-2 text-sm leading-relaxed text-[var(--calcite-color-text-2)]">
                    {item.message}
                  </p>
                </calcite-block>
              ))}
            </div>
          </div>
        </calcite-panel>
      )}
    </main>
  );
}
