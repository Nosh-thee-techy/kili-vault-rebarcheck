import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, MapPin } from 'lucide-react';
import { PreDevMap } from '@/components/predev/PreDevMap';
import { Button } from '@/components/ui/Button';
import { COMMUNITY_REPORT_TYPES } from '@/config/communityReports';
import { caseKeys } from '@/lib/queryClient';
import { submitObservation } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { CommunityObservation, CommunityReportCategory } from '@/types';

const DEFAULT_LAT = -1.2921;
const DEFAULT_LON = 36.782;

export function CommunityReportPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [lat, setLat] = useState<number | null>(DEFAULT_LAT);
  const [lon, setLon] = useState<number | null>(DEFAULT_LON);
  const [category, setCategory] = useState<CommunityReportCategory | null>(null);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState<CommunityObservation | null>(null);

  const handlePinDrop = useCallback((nextLat: number, nextLon: number) => {
    setLat(nextLat);
    setLon(nextLon);
  }, []);

  const mutation = useMutation({
    mutationFn: () => {
      const type = COMMUNITY_REPORT_TYPES.find((t) => t.id === category);
      const text =
        description.trim() ||
        type?.hint ||
        'Community ground report';
      return submitObservation({
        lat: lat!,
        lon: lon!,
        description: text,
        category: category ?? 'OTHER',
      }).then((r) => r.data);
    },
    onSuccess: (data) => {
      setSubmitted(data);
      qc.invalidateQueries({ queryKey: caseKeys.myObservations() });
      qc.invalidateQueries({ queryKey: caseKeys.observations() });
      setStep(3);
    },
  });

  if (submitted && step === 3) {
    return (
      <div className="mx-auto max-w-lg space-y-6 pb-12">
        <div className="rounded-2xl border border-forest/25 bg-forest/5 p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-forest" strokeWidth={1.5} />
          <h1 className="mt-4 font-display text-2xl font-bold text-charcoal">Report received</h1>
          <p className="mt-2 text-sm text-charcoal-muted">
            Reference <span className="font-mono font-semibold">{submitted.id.slice(0, 8)}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-sand bg-off-white p-5">
          <p className="text-sm font-semibold text-charcoal">What happens next</p>
          <ol className="mt-3 space-y-3 text-sm text-charcoal-muted">
            <li className="flex gap-3">
              <span className="font-bold text-clay-dark">1.</span>
              Your report appears in <strong className="text-charcoal">My reports</strong> as waiting
              for planner review
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-clay-dark">2.</span>
              A planner checks it against satellite detections and ward records
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-clay-dark">3.</span>
              If it matches a real issue, it gets linked to a case — you&apos;ll see that here
            </li>
          </ol>
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="primary" size="lg" className="w-full" onClick={() => navigate('/community')}>
            View my reports
          </Button>
          <Button
            variant="outline"
            size="md"
            className="w-full"
            onClick={() => {
              setSubmitted(null);
              setStep(1);
              setCategory(null);
              setDescription('');
            }}
          >
            Report something else
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-12">
      <Link to="/community" className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal-muted">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sage">Step {step} of 2</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-charcoal">
          {step === 1 ? 'Where did you see it?' : 'What happened?'}
        </h1>
      </div>

      {step === 1 && (
        <>
          <PreDevMap lat={lat} lon={lon} onPinDrop={handlePinDrop} className="h-[280px]" />
          {lat != null && lon != null && (
            <p className="text-center font-mono text-xs text-charcoal-muted">
              {lat.toFixed(5)}, {lon.toFixed(5)}
            </p>
          )}
          <Button
            variant="primary"
            size="lg"
            className="w-full gap-2"
            disabled={lat == null || lon == null}
            onClick={() => setStep(2)}
          >
            <MapPin className="h-4 w-4" />
            Continue
          </Button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {COMMUNITY_REPORT_TYPES.map((type) => {
              const Icon = type.icon;
              const selected = category === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setCategory(type.id)}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-colors',
                    selected
                      ? 'border-clay bg-clay/10 ring-2 ring-clay/25'
                      : 'border-sand bg-off-white hover:border-sage',
                  )}
                >
                  <Icon className="h-5 w-5 text-charcoal" strokeWidth={1.75} />
                  <p className="mt-2 text-sm font-semibold text-charcoal">{type.label}</p>
                </button>
              );
            })}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-charcoal">
              Add details (optional)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. lorries dumping rubble last night near the junction…"
              className="w-full rounded-xl border border-sand bg-off-white px-4 py-3 text-sm focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/15"
            />
          </label>

          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              disabled={!category}
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Submit report
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
