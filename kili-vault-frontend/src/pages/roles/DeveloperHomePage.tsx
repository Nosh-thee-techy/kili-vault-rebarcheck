import { Link, useNavigate } from "react-router-dom";
import { CaseListItem } from "@/components/cases/CaseListItem";
import { useCasesQuery } from "@/hooks/useCaseQueries";

export function DeveloperHomePage() {
  const navigate = useNavigate();
  const { data, isLoading } = useCasesQuery({ limit: 50 });
  const cases = data?.data ?? [];
  const actionRequired = cases.filter(
    (caseItem) => caseItem.status === "MITIGATION_REQUIRED",
  );
  const inProgress = cases.filter(
    (caseItem) =>
      caseItem.status === "EVIDENCE_SUBMITTED" ||
      caseItem.status === "AGENCY_PENDING",
  );
  const completed = cases.filter(
    (caseItem) =>
      caseItem.status === "VERIFIED" || caseItem.status === "CLOSED",
  );

  return (
    <main className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-3 py-4 sm:px-5 md:gap-5 md:py-6">
      <header className="flex min-w-0 flex-col gap-3 border-b border-sand pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal-muted">
            Developer workspace
          </p>
          <h1 className="mt-1 font-body text-xl font-semibold text-charcoal sm:text-2xl">
            My cases
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-charcoal-muted">
            Review assigned development cases, submit evidence, and follow verification.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <calcite-button
            appearance="outline"
            icon-start="search"
            scale="s"
            onClick={() => navigate("/developer/check")}
          >
            Check a plot
          </calcite-button>
          <calcite-button
            appearance="outline"
            icon-start="analysis"
            scale="s"
            onClick={() => navigate("/developer/simulator")}
          >
            Impact simulator
          </calcite-button>
        </div>
      </header>

      {!isLoading && (
        <dl
          aria-label="Case status summary"
          className="grid grid-cols-3 divide-x divide-sand border-b border-sand"
        >
          {[
            { label: "Action required", value: actionRequired.length },
            { label: "In verification", value: inProgress.length },
            { label: "Completed", value: completed.length },
          ].map(({ label, value }) => (
            <div key={label} className="min-w-0 px-3 py-3 first:pl-0 sm:px-4 sm:py-4">
              <dt className="truncate text-xs text-charcoal-muted sm:text-sm">
                {label}
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-charcoal sm:text-2xl">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {actionRequired.length > 0 && (
        <calcite-block
          heading={`Action required (${actionRequired.length})`}
          description="Cases awaiting your response."
          collapsible
          open
        >
          <div className="px-3 pb-3 pt-2 sm:px-4">
            {actionRequired.map((caseItem) => (
              <CaseListItem
                key={caseItem.id}
                caseItem={caseItem}
                compact
                caseLinkPrefix="/developer/cases"
              />
            ))}
          </div>
        </calcite-block>
      )}

      <calcite-panel
        heading={isLoading ? "Assigned cases" : `Assigned cases (${cases.length})`}
        description="Open a case to review its status and submit requested evidence."
      >
        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center" aria-live="polite">
            <calcite-loader label="Loading assigned cases" scale="m" />
          </div>
        ) : cases.length === 0 ? (
          <div className="p-4 sm:p-5">
            <calcite-notice open kind="info" scale="s">
              <span slot="title">No assigned cases</span>
              Cases assigned to you will appear here.
            </calcite-notice>
          </div>
        ) : (
          <div className="min-w-0 overflow-hidden">
            {cases.map((caseItem) => (
              <CaseListItem
                key={caseItem.id}
                caseItem={caseItem}
                caseLinkPrefix="/developer/cases"
              />
            ))}
          </div>
        )}
      </calcite-panel>

      {inProgress.length > 0 && (
        <calcite-notice open kind="info" scale="s">
          <span slot="title">Verification in progress</span>
          {inProgress.length} case{inProgress.length === 1 ? " is" : "s are"} awaiting agency verification. {" "}
          <Link
            to={`/developer/cases/${inProgress[0].id}`}
            className="font-medium text-[var(--calcite-color-text-1)] underline underline-offset-2"
          >
            Track a case
          </Link>
        </calcite-notice>
      )}
    </main>
  );
}
