import { RiskBadge } from "@/components/cases/RiskBadge";
import { formatChangeType } from "@/lib/format";
import type { PreDevelopmentAssessment } from "@/types";

export function PreDevResultCard({
  assessment,
  onDownload,
  onSubmit,
  isSubmitting,
}: {
  assessment: PreDevelopmentAssessment;
  onDownload: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const warnings = assessment.flags.filter((flag) => flag.severity === "warning");
  const infos = assessment.flags.filter((flag) => flag.severity !== "warning");
  const averageScore = Math.round(
    (assessment.risk.planning +
      assessment.risk.infrastructure +
      assessment.risk.environmental +
      assessment.risk.community) /
      4,
  );
  const riskSummary =
    assessment.risk.overall === "LOW"
      ? "Looks manageable — still confirm with the ward before breaking ground."
      : assessment.risk.overall === "MEDIUM"
        ? "Some planning flags — consider adjusting the proposal or speaking with a planner early."
        : "Several red flags — consider a formal planner review before work starts.";

  return (
    <div className="space-y-3">
      <calcite-block
        heading="Projected risk"
        description="Hypothetical assessment before work starts."
        collapsible
        open
      >
        <div className="space-y-3 px-4 pb-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-charcoal-muted">Average risk score</p>
              <p className="font-body text-2xl font-semibold tabular-nums text-charcoal">
                {averageScore}
                <span className="ml-1 text-sm font-normal text-charcoal-muted">
                  / 100
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge level={assessment.risk.overall} />
              <calcite-chip scale="s">
                {formatChangeType(assessment.input.changeType)}
              </calcite-chip>
            </div>
          </div>

          <calcite-progress
            value={String(averageScore)}
            max="100"
            type="determinate"
            label={`Average projected risk score: ${averageScore} out of 100`}
          />

          <p className="text-sm font-medium text-charcoal">{assessment.title}</p>
          <calcite-notice open kind="info" scale="s">
            {riskSummary}
          </calcite-notice>
        </div>
      </calcite-block>

      {(warnings.length > 0 || infos.length > 0) && (
        <calcite-block
          heading={`Assessment flags (${warnings.length + infos.length})`}
          description="Items returned by the pre-development assessment."
          collapsible
          open
        >
          <div className="space-y-2 px-4 pb-4 pt-2">
            {warnings.map((flag) => (
              <calcite-notice
                key={`warning-${flag.text}`}
                open
                kind="warning"
                scale="s"
              >
                <span slot="title">Review</span>
                {flag.text}
              </calcite-notice>
            ))}
            {infos.slice(0, 2).map((flag) => (
              <calcite-notice
                key={`info-${flag.text}`}
                open
                kind="info"
                scale="s"
              >
                {flag.text}
              </calcite-notice>
            ))}
          </div>
        </calcite-block>
      )}

      <calcite-notice open kind="warning" scale="s">
        <span slot="title">Informational only — not a permit</span>
        {assessment.disclaimer}
      </calcite-notice>

      <div className="flex flex-col gap-2 sm:flex-row">
        <calcite-button
          appearance="solid"
          icon-start="send"
          scale="m"
          loading={isSubmitting}
          className="sm:flex-1"
          onClick={onSubmit}
        >
          Send to planner for review
        </calcite-button>
        <calcite-button
          appearance="outline"
          icon-start="download"
          scale="m"
          className="sm:flex-1"
          onClick={onDownload}
        >
          Save assessment (JSON)
        </calcite-button>
      </div>
    </div>
  );
}
