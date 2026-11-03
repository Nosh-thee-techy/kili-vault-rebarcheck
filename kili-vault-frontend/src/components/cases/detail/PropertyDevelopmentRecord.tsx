import { useState, type ReactNode } from "react";
import { Download, FileText, MapPinned, ShieldCheck } from "lucide-react";
import { CaseSiteMap } from "@/components/cases/detail/CaseSiteMap";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePropertyRecordQuery } from "@/hooks/useCaseQueries";
import type {
  DevelopmentCase,
  PropertyDevelopmentRecord as RecordData,
} from "@/types";

function value(input: unknown) {
  if (input == null || input === "") return "Not available in current dataset";
  if (typeof input === "number")
    return Number.isFinite(input)
      ? input.toLocaleString()
      : "Not available in current dataset";
  return String(input);
}

function date(input: string | null) {
  return input ? new Date(input).toLocaleString() : "Not recorded";
}

function RecordSection({
  title,
  source,
  children,
}: {
  title: string;
  source?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-sand bg-off-white p-5 shadow-soft">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl font-bold text-charcoal">
          {title}
        </h3>
        {source && (
          <span className="text-[11px] font-medium text-charcoal-muted">
            Source: {source}
          </span>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ScenarioSummary({
  label,
  scenario,
}: {
  label: string;
  scenario: Record<string, unknown> | null;
}) {
  if (!scenario)
    return (
      <p className="text-sm text-charcoal-muted">
        {label} data was not recorded for this case.
      </p>
    );
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      {Object.entries(scenario)
        .filter(([key]) => key !== "source" && key !== "assumptions")
        .map(([key, item]) => (
          <div key={key}>
            <dt className="text-charcoal-muted">
              {key.replace(/([A-Z])/g, " $1")}
            </dt>
            <dd className="font-semibold capitalize text-charcoal">
              {value(item)}
            </dd>
          </div>
        ))}
      {Array.isArray(scenario.assumptions) &&
        scenario.assumptions.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="text-charcoal-muted">Assumptions</dt>
            <dd className="mt-1 text-charcoal-muted">
              {scenario.assumptions.join(" ")}
            </dd>
          </div>
        )}
    </div>
  );
}

function downloadRecord(record: RecordData) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${record.caseNumber}-property-development-record.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function PropertyDevelopmentRecord({
  caseItem,
}: {
  caseItem: DevelopmentCase;
}) {
  const [expanded, setExpanded] = useState(false);
  const query = usePropertyRecordQuery(
    caseItem.id,
    caseItem.status === "CLOSED" && expanded,
  );

  if (caseItem.status !== "CLOSED") {
    return (
      <section className="rounded-2xl border border-sand bg-mist/35 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-sage">
          Property Development Record
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-charcoal">
          Available after closure
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-charcoal-muted">
          This case is still active. Its structured property record will be
          presented when verification and closure are complete.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border-2 border-forest/20 bg-mist/20 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-forest">
            Case closed
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-charcoal">
            Property Development Record
          </h2>
          <p className="mt-1 text-sm text-charcoal-muted">
            A traceable summary of what was detected, reviewed, verified, and
            supported by evidence.
          </p>
        </div>
        {query.data && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadRecord(query.data)}
          >
            <Download className="h-4 w-4" /> Export JSON
          </Button>
        )}
      </div>
      {!expanded ? (
        <Button variant="primary" size="md" onClick={() => setExpanded(true)}>
          <FileText className="h-4 w-4" /> Open property record
        </Button>
      ) : query.isLoading ? (
        <p className="text-sm text-charcoal-muted">
          Loading the closed-case record...
        </p>
      ) : query.isError ? (
        <EmptyState
          title="Record unavailable"
          description="The closed case could not be assembled into a property record. Please try again."
        />
      ) : query.data ? (
        <RecordBody record={query.data} caseItem={caseItem} />
      ) : null}
    </section>
  );
}

function RecordBody({
  record,
  caseItem,
}: {
  record: RecordData;
  caseItem: DevelopmentCase;
}) {
  const observed = record.development.observed;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-sand bg-off-white p-3">
          <p className="text-xs text-charcoal-muted">Case reference</p>
          <p className="mt-1 font-semibold text-charcoal">
            {record.caseNumber}
          </p>
        </div>
        <div className="rounded-xl border border-sand bg-off-white p-3">
          <p className="text-xs text-charcoal-muted">Closed</p>
          <p className="mt-1 font-semibold text-charcoal">
            {date(record.closedAt)}
          </p>
        </div>
        <div className="rounded-xl border border-sand bg-off-white p-3">
          <p className="text-xs text-charcoal-muted">Verification</p>
          <p className="mt-1 font-semibold text-charcoal">
            {record.verification.status}
          </p>
        </div>
      </div>
      <RecordSection title="Property identity" source="Case record">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-charcoal-muted">Parcel ID</dt>
            <dd className="font-semibold text-charcoal">
              {value(record.property.parcelId)}
            </dd>
          </div>
          <div>
            <dt className="text-charcoal-muted">Ward</dt>
            <dd className="font-semibold text-charcoal">
              {value(record.property.ward)}
            </dd>
          </div>
          <div>
            <dt className="text-charcoal-muted">Constituency</dt>
            <dd className="font-semibold text-charcoal">
              {value(record.property.constituency)}
            </dd>
          </div>
          <div>
            <dt className="text-charcoal-muted">Development type</dt>
            <dd className="font-semibold text-charcoal">
              {value(record.property.developmentType)}
            </dd>
          </div>
          <div>
            <dt className="text-charcoal-muted">Location</dt>
            <dd className="font-mono text-xs font-semibold text-charcoal">
              {record.property.location
                ? `${record.property.location.latitude.toFixed(5)}, ${record.property.location.longitude.toFixed(5)}`
                : value(null)}
            </dd>
          </div>
        </dl>
      </RecordSection>
      <RecordSection title="Development lifecycle" source="Case audit events">
        <ol className="grid gap-3 md:grid-cols-2">
          {record.lifecycle.length ? (
            record.lifecycle.map((event) => (
              <li
                key={`${event.stage}-${event.timestamp}`}
                className="border-l-2 border-forest/40 pl-3"
              >
                <p className="text-sm font-semibold text-charcoal">
                  {event.stage.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-charcoal-muted">
                  {date(event.timestamp)} · {value(event.actor)}
                </p>
                {event.details && (
                  <p className="mt-1 text-xs text-charcoal-muted">
                    {event.details}
                  </p>
                )}
              </li>
            ))
          ) : (
            <li className="text-sm text-charcoal-muted">
              No lifecycle events were recorded.
            </li>
          )}
        </ol>
      </RecordSection>
      <div className="grid gap-4 lg:grid-cols-3">
        <RecordSection title="Existing condition" source="Persisted case data">
          <ScenarioSummary
            label="Existing condition"
            scenario={record.development.existing}
          />
        </RecordSection>
        <RecordSection
          title="Proposed development"
          source={record.development.proposed?.source as string | undefined}
        >
          <ScenarioSummary
            label="Proposed development"
            scenario={record.development.proposed}
          />
        </RecordSection>
        <RecordSection
          title="Mitigated scenario"
          source="Simulator scenario state"
        >
          <ScenarioSummary
            label="Mitigated scenario"
            scenario={record.development.mitigated}
          />
        </RecordSection>
      </div>
      <RecordSection
        title="Observed development"
        source={
          observed
            ? String(observed.source ?? "Detection engine")
            : "Detection link"
        }
      >
        {observed ? (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-charcoal-muted">Detection ID</dt>
              <dd className="font-semibold text-charcoal">
                {value(observed.detectionId)}
              </dd>
            </div>
            <div>
              <dt className="text-charcoal-muted">Detection date</dt>
              <dd className="font-semibold text-charcoal">
                {date(observed.detectedAt as string | null)}
              </dd>
            </div>
            <div>
              <dt className="text-charcoal-muted">Observed change</dt>
              <dd className="font-semibold text-charcoal">
                {value(observed.changeType)}
              </dd>
            </div>
            <div>
              <dt className="text-charcoal-muted">Confidence</dt>
              <dd className="font-semibold text-charcoal">
                {observed.confidence == null
                  ? value(null)
                  : `${(Number(observed.confidence) * 100).toFixed(1)}%`}
              </dd>
            </div>
          </div>
        ) : (
          <p className="text-sm text-charcoal-muted">
            Observed development data is not available for this case.
          </p>
        )}
      </RecordSection>
      <RecordSection
        title="Expected vs observed"
        source="Scenario and detection records"
      >
        {record.comparison ? (
          <p className="text-sm leading-relaxed text-charcoal-muted">
            {String(record.comparison.basis)}
          </p>
        ) : (
          <p className="text-sm text-charcoal-muted">
            A comparable proposed scenario and observed detection are not both
            available.
          </p>
        )}
      </RecordSection>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <RecordSection
          title="Spatial context"
          source="ArcGIS case and context layers"
        >
          <div className="relative h-[360px] overflow-hidden rounded-xl border border-sand">
            <CaseSiteMap
              caseItem={caseItem}
              compact
              className="h-full min-h-0 rounded-none border-0"
            />
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-charcoal-muted">
            <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
            The map shows the case geometry with live planning context layers.
            Missing parcel proximity values are not inferred.
          </p>
        </RecordSection>
        <div className="space-y-4">
          <RecordSection title="Verification" source="Case audit events">
            <p className="flex items-center gap-2 text-sm font-semibold text-charcoal">
              <ShieldCheck className="h-4 w-4 text-forest" />{" "}
              {record.verification.status}
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-charcoal-muted">Reviewer</dt>
                <dd className="font-semibold text-charcoal">
                  {value(record.verification.reviewer)}
                </dd>
              </div>
              <div>
                <dt className="text-charcoal-muted">Verified</dt>
                <dd className="font-semibold text-charcoal">
                  {date(record.verification.verifiedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-charcoal-muted">Closure reason</dt>
                <dd className="font-semibold text-charcoal">
                  {value(record.verification.closureReason)}
                </dd>
              </div>
            </dl>
          </RecordSection>
          <RecordSection
            title={`Evidence (${record.evidence.length})`}
            source="Case evidence items"
          >
            {record.evidence.length ? (
              <ul className="space-y-2 text-sm">
                {record.evidence.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="font-medium text-charcoal">
                      {item.name}
                    </span>
                    <span className="text-xs text-charcoal-muted">
                      {item.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-charcoal-muted">
                No verification evidence has been attached.
              </p>
            )}
          </RecordSection>
        </div>
      </div>
      <RecordSection title="Data provenance and limitations">
        <ul className="space-y-2 text-xs leading-relaxed text-charcoal-muted">
          {Object.entries(record.provenance).map(([key, source]) => (
            <li key={key}>
              <strong className="capitalize text-charcoal">{key}:</strong>{" "}
              {source}
            </li>
          ))}
          {record.limitations.map((item) => (
            <li key={item} className="border-l-2 border-clay pl-3">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-charcoal-muted">
          Potential downstream use: planning, property due diligence, valuation
          support, lending assessment, insurance assessment, and development
          monitoring. This record is supporting information only and does not
          determine eligibility, premiums, value, approval, or legal status.
        </p>
      </RecordSection>
    </div>
  );
}
