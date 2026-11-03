import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { CaseListItem } from "@/components/cases/CaseListItem";
import { DeveloperActionCard } from "@/components/dashboard/DeveloperActionCard";
import { PageHero } from "@/components/dashboard/PageHero";
import { CaseListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCasesQuery } from "@/hooks/useCaseQueries";

export function DeveloperHomePage() {
  const { data, isLoading } = useCasesQuery({ limit: 50 });
  const cases = data?.data ?? [];
  const actionRequired = cases.filter(
    (c) => c.status === "MITIGATION_REQUIRED",
  );
  const inProgress = cases.filter(
    (c) => c.status === "EVIDENCE_SUBMITTED" || c.status === "AGENCY_PENDING",
  );
  const completed = cases.filter(
    (c) => c.status === "VERIFIED" || c.status === "CLOSED",
  );

  return (
    <div className="space-y-8 animate-fade-up">
      <Link
        to="/developer/check"
        className="block rounded-2xl border border-forest/25 bg-gradient-to-br from-forest/10 via-off-white to-clay/5 p-5 shadow-soft transition-shadow hover:shadow-lift"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest/15 text-forest">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-forest">
              Before you build
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-charcoal">
              Check a plot first
            </h2>
            <p className="mt-1 text-sm text-charcoal-muted">
              Pin your site, answer 4 quick questions, get a risk readout —
              before satellite flags you.
            </p>
          </div>
          <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-forest" />
        </div>
      </Link>

      <Link
        to="/developer/simulator"
        className="block rounded-2xl border border-clay/30 bg-off-white p-5 shadow-soft transition-shadow hover:shadow-lift"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-clay/10 text-clay-dark">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-clay-dark">
              Plan before construction
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-charcoal">
              Open the Development Impact Simulator
            </h2>
            <p className="mt-1 text-sm text-charcoal-muted">
              Select a real parcel, test a proposed footprint, and compare a
              mitigated alternative.
            </p>
          </div>
          <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-clay-dark" />
        </div>
      </Link>

      <PageHero
        eyebrow="After detection"
        title="My development cases"
        description="Cases assigned to you after the ward flags a change — upload proof and track verification."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Action required",
            value: actionRequired.length,
            icon: CircleDashed,
            tone: "text-clay-dark bg-clay/10",
          },
          {
            label: "In verification",
            value: inProgress.length,
            icon: CircleDashed,
            tone: "text-forest bg-forest/10",
          },
          {
            label: "Completed",
            value: completed.length,
            icon: CheckCircle2,
            tone: "text-risk-low bg-risk-low/10",
          },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-2xl border border-sand bg-off-white p-4 shadow-soft"
          >
            <div className={`mb-3 inline-flex rounded-lg p-2 ${tone}`}>
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <p className="font-display text-2xl font-bold tabular-nums text-charcoal">
              {value}
            </p>
            <p className="mt-1 text-xs font-medium text-charcoal-muted">
              {label}
            </p>
          </div>
        ))}
      </div>

      {actionRequired.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-charcoal">
            Respond now
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {actionRequired.map((c) => (
              <DeveloperActionCard key={c.id} caseItem={c} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-charcoal">
          All assigned cases
        </h2>
        {isLoading ? (
          <CaseListSkeleton count={4} />
        ) : cases.length === 0 ? (
          <EmptyState
            title="No assigned cases"
            description="When a planner assigns mitigation to your developments, they will appear here."
          />
        ) : (
          <div className="space-y-3">
            {cases.map((c) => (
              <CaseListItem
                key={c.id}
                caseItem={c}
                caseLinkPrefix="/developer/cases"
              />
            ))}
          </div>
        )}
      </section>

      {inProgress.length > 0 && (
        <p className="text-center text-xs text-charcoal-muted">
          {inProgress.length} case(s) awaiting agency verification —{" "}
          <Link
            to={`/developer/cases/${inProgress[0].id}`}
            className="font-semibold text-forest"
          >
            track status
          </Link>
        </p>
      )}
    </div>
  );
}
