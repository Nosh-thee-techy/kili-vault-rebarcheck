import { Link } from 'react-router-dom';
import { Camera, MapPin, Plus } from 'lucide-react';
import { MyReportCard } from '@/components/community/MyReportCard';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { useMyObservationsQuery } from '@/hooks/useObservationQueries';

export function CommunityHomePage() {
  const { user } = useAuth();
  const { data, isLoading } = useMyObservationsQuery();
  const reports = data?.observations ?? [];

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-24">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sage">Kilimani voices</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-charcoal">
          Hi {user?.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-charcoal-muted">
          See something changing on your street? Report it in under a minute — then track what
          happens.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Your reports', value: data?.total ?? 0 },
          { label: 'Waiting', value: data?.pendingCount ?? 0 },
          { label: 'Made impact', value: data?.linkedCount ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-sand bg-off-white px-3 py-3 text-center">
            <p className="font-display text-xl font-bold tabular-nums text-charcoal">{value}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-charcoal-muted">
              {label}
            </p>
          </div>
        ))}
      </div>

      <Link to="/community/report" className="block">
        <Button variant="primary" size="lg" className="w-full gap-2 shadow-soft">
          <Plus className="h-5 w-5" />
          Report what you see
        </Button>
      </Link>

      <div className="rounded-2xl border border-sand bg-mist/30 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-charcoal">
          <Camera className="h-4 w-4 text-clay-dark" />
          How it works
        </p>
        <ol className="mt-3 space-y-2 text-sm text-charcoal-muted">
          <li>1. Drop a pin where you saw the change</li>
          <li>2. Pick what type of issue it is</li>
          <li>3. Track status here — linked reports join a planner case</li>
        </ol>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-charcoal">My reports</h2>
          <Link to="/community/map" className="text-xs font-semibold text-clay-dark">
            Ward map →
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-charcoal-muted">Loading…</p>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand px-4 py-10 text-center">
            <MapPin className="mx-auto h-8 w-8 text-sage" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-medium text-charcoal">No reports yet</p>
            <p className="mt-1 text-xs text-charcoal-muted">
              Your submissions will show up here with status updates.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <MyReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
