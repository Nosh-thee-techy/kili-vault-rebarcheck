import { formatDate } from '@/lib/format';
import type { DevelopmentCase } from '@/types';

export function CaseAuditPanel({ caseItem }: { caseItem: DevelopmentCase }) {
  const events = caseItem.auditEvents ?? [];
  if (events.length === 0) return null;

  return (
    <ul className="relative space-y-0 border-l-2 border-sand pl-5">
        {events.map((event) => (
          <li key={event.id} className="relative pb-5 last:pb-0">
            <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-off-white bg-forest" />
            <p className="text-sm font-semibold text-charcoal">
              {event.action.replace(/_/g, ' ')}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-charcoal-muted">
              {formatDate(event.timestamp)} · {event.actorName}
              <span className="text-charcoal-muted/70"> ({event.actorRole})</span>
            </p>
            {event.details && (
              <p className="mt-1 text-xs text-charcoal-muted/90">{event.details}</p>
            )}
          </li>
        ))}
    </ul>
  );
}
