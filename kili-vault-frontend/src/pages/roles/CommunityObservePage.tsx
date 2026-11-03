import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { submitObservation } from '@/lib/api';

export function CommunityObservePage() {
  const [lat, setLat] = useState('-1.2921');
  const [lon, setLon] = useState('36.7820');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      submitObservation({
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        description,
      }),
    onSuccess: () => setSubmitted(true),
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-charcoal">Submit observation</h1>
        <p className="mt-2 text-sm text-charcoal-muted">
          Report what you see on the ground. A planner will review before it links to a case.
        </p>
      </div>

      <Card padding="md">
        <CardHeader
          title="Community report"
          description="Observed · not verified. Include location and description."
        />

        {submitted ? (
          <div className="rounded-xl bg-forest/8 p-4 text-sm text-forest">
            Observation submitted for planner review. Thank you for contributing to Kilimani
            accountability.
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Latitude"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="font-mono"
              />
              <Input
                label="Longitude"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                className="font-mono"
              />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-charcoal">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                placeholder="Describe the physical change you observed…"
                className="w-full rounded-xl border border-sand bg-off-white px-4 py-3 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"
              />
            </label>
            <Button
              type="submit"
              variant="primary"
              isLoading={mutation.isPending}
              className="gap-2"
            >
              <MapPin className="h-4 w-4" />
              Submit for review
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
