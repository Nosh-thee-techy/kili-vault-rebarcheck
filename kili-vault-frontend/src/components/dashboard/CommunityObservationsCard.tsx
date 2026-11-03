import { MapPin, Users } from 'lucide-react';
import { useCommunityObservationsQuery } from '@/hooks/useObservationQueries';
import { formatDate } from '@/lib/format';

export function CommunityObservationsCard() {
  const { data, isLoading } = useCommunityObservationsQuery();
  const observations = data?.observations ?? [];
  const count = data?.pendingCount ?? 0;

  if (isLoading) return null;
  if (count === 0) return null;

  return (
    <div className="rounded-2xl border border-clay/25 bg-clay/[0.06] p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay/15 text-clay-dark">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-charcoal">
            {count} community observation{count === 1 ? '' : 's'} pending review
          </p>
          <p className="text-xs text-charcoal-muted">
            Ground reports from residents — not yet linked to cases.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {observations.slice(0, 3).map((obs) => (
          <li
            key={obs.id}
            className="flex gap-3 rounded-xl border border-sand/80 bg-off-white/80 px-3 py-2.5 text-sm"
          >
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
            <div className="min-w-0">
              <p className="line-clamp-2 text-charcoal">{obs.description}</p>
              <p className="mt-1 text-xs text-charcoal-muted">
                {obs.submittedByName ?? 'Resident'} · {formatDate(obs.createdAt)} ·{' '}
                {obs.lat.toFixed(4)}, {obs.lon.toFixed(4)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
