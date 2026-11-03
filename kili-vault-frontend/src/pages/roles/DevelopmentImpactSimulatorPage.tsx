import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Droplets,
  MapPin,
  Ruler,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import type Geometry from "@arcgis/core/geometry/Geometry";
import { PageHero } from "@/components/dashboard/PageHero";
import { Button } from "@/components/ui/Button";
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
    : `${Math.round(value).toLocaleString()} m²`;
}

function formatPercent(value: number | null) {
  return value == null || !Number.isFinite(value)
    ? "Unavailable"
    : `${value.toFixed(1)}%`;
}

function formatDistance(value: number | null) {
  return value == null || !Number.isFinite(value)
    ? "Unavailable"
    : `${Math.round(value)} m`;
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
    <section className="rounded-2xl border border-sand bg-off-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-charcoal">
          {title}
        </h2>
        <span className="rounded-full bg-mist px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-forest">
          Scenario
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-charcoal-muted">
          Footprint area (m²)
          <input
            aria-label={`${title} footprint area`}
            type="number"
            min="0"
            step="1"
            value={inputValue(inputs.footprintAreaM2)}
            onChange={(event) =>
              update("footprintAreaM2", Number(event.target.value))
            }
            className="mt-1 w-full rounded-xl border border-sand bg-off-white px-3 py-2.5 text-sm text-charcoal"
          />
        </label>
        <label className="text-xs font-semibold text-charcoal-muted">
          Floors
          <input
            aria-label={`${title} floors`}
            type="number"
            min="0"
            step="1"
            value={inputValue(inputs.floors)}
            onChange={(event) => update("floors", Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-sand bg-off-white px-3 py-2.5 text-sm text-charcoal"
          />
        </label>
        <label className="text-xs font-semibold text-charcoal-muted">
          Residential units
          <input
            aria-label={`${title} residential units`}
            type="number"
            min="0"
            step="1"
            value={inputValue(inputs.units)}
            onChange={(event) => update("units", Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-sand bg-off-white px-3 py-2.5 text-sm text-charcoal"
          />
        </label>
        <label className="text-xs font-semibold text-charcoal-muted">
          Occupants per unit
          <input
            aria-label={`${title} occupants per unit`}
            type="number"
            min="0"
            step="0.5"
            value={inputValue(inputs.occupancyPerUnit)}
            onChange={(event) =>
              update("occupancyPerUnit", Number(event.target.value))
            }
            className="mt-1 w-full rounded-xl border border-sand bg-off-white px-3 py-2.5 text-sm text-charcoal"
          />
        </label>
      </div>
      <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-charcoal-muted">
        <input
          type="checkbox"
          checked={inputs.stormwaterManagement}
          onChange={(event) =>
            update("stormwaterManagement", event.target.checked)
          }
          className="h-4 w-4 accent-forest"
        />
        Stormwater management included in scenario
      </label>
      <p className="mt-3 text-[11px] leading-relaxed text-charcoal-muted">
        Indicative scenario estimate. Occupancy assumes{" "}
        {inputs.occupancyPerUnit || 0} occupant(s) per unit. This is not an
        engineering assessment or statutory approval.
      </p>
    </section>
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
    <div className="grid grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] items-center gap-2 border-b border-sand/70 py-3 text-sm last:border-0">
      <span className="font-medium text-charcoal-muted">{label}</span>
      {values.map((value, index) => (
        <span
          key={`${label}-${index}`}
          className="text-right font-semibold text-charcoal"
        >
          {format(value)}
        </span>
      ))}
    </div>
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
    <div className="space-y-6 animate-fade-up pb-8 md:space-y-8">
      <Link
        to="/developer"
        className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal-muted hover:text-charcoal"
      >
        <ArrowLeft className="h-4 w-4" /> My cases
      </Link>
      <PageHero
        eyebrow="Before you build"
        title="Development Impact Simulator"
        description="Test what could change on a selected parcel before construction, then compare a proposal with a mitigated alternative."
        action={
          <div className="flex items-center gap-2 rounded-xl border border-sand bg-off-white px-3 py-2 text-xs font-semibold text-charcoal-muted">
            <SlidersHorizontal className="h-4 w-4 text-clay" /> Existing ·
            Proposed · Mitigated
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.85fr)]">
        <section className="min-h-[460px] overflow-hidden rounded-2xl border border-sand shadow-soft">
          <DevelopmentSimulatorMap
            proposedGeometry={proposedGeometry}
            mitigatedGeometry={mitigatedGeometry}
            onSiteSelected={handleSiteSelected}
            initialParcelRef={initialParcelRef}
            className="h-full min-h-[520px] rounded-none border-0"
          />
        </section>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-sand bg-off-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-clay" />
              <h2 className="font-display text-xl font-bold text-charcoal">
                Selected site
              </h2>
            </div>
            {!site ? (
              <p className="mt-3 text-sm leading-relaxed text-charcoal-muted">
                Select a real parcel on the map. Parcel attributes and
                surrounding context will be queried from ArcGIS.
              </p>
            ) : (
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <dt className="text-charcoal-muted">Parcel identifier</dt>
                  <dd className="font-semibold text-charcoal">
                    {site.parcelId ?? "Not available in layer"}
                  </dd>
                </div>
                <div>
                  <dt className="text-charcoal-muted">
                    Land-use classification
                  </dt>
                  <dd className="font-semibold text-charcoal">
                    {site.landUse ?? "Not available in layer"}
                  </dd>
                </div>
                <div>
                  <dt className="text-charcoal-muted">Parcel area</dt>
                  <dd className="font-semibold text-charcoal">
                    {formatArea(site.parcelAreaM2)}
                  </dd>
                </div>
                <div>
                  <dt className="text-charcoal-muted">Mapped buildings</dt>
                  <dd className="font-semibold text-charcoal">
                    {site.existingBuildingCount}
                  </dd>
                </div>
              </dl>
            )}
          </section>
          {site && (
            <section className="rounded-2xl border border-sand bg-off-white p-5 shadow-soft">
              <h2 className="font-display text-xl font-bold text-charcoal">
                Planning context
              </h2>
              <div className="mt-4 grid gap-3 text-sm">
                <p className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-charcoal-muted">
                    <Ruler className="h-4 w-4" /> Nearest mapped road
                  </span>
                  <strong>{formatDistance(site.roadDistanceM)}</strong>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-charcoal-muted">
                    <Droplets className="h-4 w-4" /> Nearest mapped river
                  </span>
                  <strong>{formatDistance(site.riverDistanceM)}</strong>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-charcoal-muted">
                    <ShieldCheck className="h-4 w-4" /> Parcel buffer context
                  </span>
                  <strong>
                    {site.riverBufferOverlap
                      ? "Review required"
                      : "No overlap observed"}
                  </strong>
                </p>
                <p className="border-t border-sand pt-3 text-xs leading-relaxed text-charcoal-muted">
                  Infrastructure capacity assessment unavailable in the current
                  simulator dataset. Proximity is spatial context only.
                </p>
              </div>
            </section>
          )}
        </aside>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
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

      <section className="rounded-2xl border border-sand bg-off-white p-5 shadow-soft">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sage">
              Compare scenarios
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-charcoal">
              Indicative change summary
            </h2>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMitigated(proposed)}
            disabled={!site}
          >
            <SlidersHorizontal className="h-4 w-4" /> Start mitigation from
            proposed
          </Button>
        </div>
        {!site ? (
          <p className="mt-5 text-sm text-charcoal-muted">
            Select a parcel to calculate supported metrics.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] gap-2 border-b border-sand pb-2 text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">
                <span>Indicator</span>
                <span className="text-right">Existing</span>
                <span className="text-right">Proposed</span>
                <span className="text-right">Mitigated</span>
              </div>
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
            </div>
          </div>
        )}
      </section>

      {site && (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-sand bg-mist/35 p-5">
            <h2 className="font-display text-xl font-bold text-charcoal">
              Planning prompts
            </h2>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-charcoal-muted">
              {recommendations.map((prompt) => (
                <li key={prompt} className="border-l-2 border-clay pl-3">
                  {prompt}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-sand bg-off-white p-5">
            <h2 className="font-display text-xl font-bold text-charcoal">
              Scope and limitations
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-charcoal-muted">
              Official parcel, land-use, building, road, river and river-buffer
              layers remain read-only. Proposed and mitigated footprints are
              temporary client-side scenario objects. All estimates are
              indicative and require professional planning, environmental and
              engineering review.
            </p>
          </div>
        </section>
      )}

      {site && proposedMetrics && (
        <section className="rounded-2xl border border-forest/20 bg-mist/25 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-forest">
                Intelligent planning advisor
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-charcoal">
                Kilimani zoning context
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-charcoal-muted">
                Guide-based prompts derived from the attached Kilimani zoning
                guidelines and the selected parcel's actual GIS context. These
                are indicative planning prompts, not an approval or compliance
                decision.
              </p>
            </div>
            <span className="rounded-full border border-forest/20 bg-off-white px-3 py-1.5 text-[11px] font-semibold text-forest">
              Review with a registered professional
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {zoningAdvice.map((item) => (
              <article
                key={`${item.title}-${item.message}`}
                className={`rounded-xl border bg-off-white p-4 ${item.tone === "attention" ? "border-clay/40" : item.tone === "review" ? "border-sage/50" : "border-sand"}`}
              >
                <h3 className="text-sm font-bold text-charcoal">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-charcoal-muted">
                  {item.message}
                </p>
                <p className="mt-2 text-[10px] font-medium text-sage">
                  Basis: {item.basis}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
