import { useCallback, useMemo, useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { ArrowLeft, ArrowRight, ClipboardCheck, MapPin } from 'lucide-react';

import { PageHero } from '@/components/dashboard/PageHero';

import { PreDevMap } from '@/components/predev/PreDevMap';

import { PreDevResultCard } from '@/components/predev/PreDevResultCard';

import { Button } from '@/components/ui/Button';

import {

  PRE_DEV_COVERAGE_OPTIONS,

  PRE_DEV_FLOOR_OPTIONS,

  PRE_DEV_PROJECT_TYPES,

  PRE_DEV_SETBACK_OPTIONS,

} from '@/config/preDevelopment';

import { CHANGE_TYPE_LABELS } from '@/config/theme';

import { usePreDevelopmentPreview, usePreDevelopmentSubmit } from '@/hooks/usePreDevelopment';

import { cn } from '@/lib/cn';

import type { ChangeType, PreDevelopmentAssessment, PreDevelopmentInput } from '@/types';



const DEFAULT_LAT = -1.2921;

const DEFAULT_LON = 36.782;



function downloadAssessment(assessment: PreDevelopmentAssessment) {

  const blob = new Blob([JSON.stringify(assessment, null, 2)], { type: 'application/json' });

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');

  anchor.href = url;

  anchor.download = `kili-vault-pre-check-${Date.now()}.json`;

  anchor.click();

  URL.revokeObjectURL(url);

}



function Chip({

  selected,

  onClick,

  label,

  hint,

}: {

  selected: boolean;

  onClick: () => void;

  label: string;

  hint?: string;

}) {

  return (

    <button

      type="button"

      onClick={onClick}

      className={cn(

        'rounded-2xl border px-4 py-3 text-left transition-colors',

        selected

          ? 'border-clay bg-clay/10 ring-2 ring-clay/25'

          : 'border-sand bg-off-white hover:border-sage',

      )}

    >

      <p className="text-sm font-semibold text-charcoal">{label}</p>

      {hint && <p className="mt-0.5 text-xs text-charcoal-muted">{hint}</p>}

    </button>

  );

}



function StepStrip({ step }: { step: 1 | 2 | 3 }) {

  const labels = ['Plot location', 'Your plans', 'Results'];

  const active = step === 3 ? 2 : step - 1;



  return (

    <div className="flex items-center gap-2">

      {labels.map((label, index) => (

        <div key={label} className="flex min-w-0 flex-1 items-center gap-2">

          <span

            className={cn(

              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',

              index <= active

                ? 'bg-forest text-off-white'

                : 'border border-sand bg-off-white text-charcoal-muted',

            )}

          >

            {index + 1}

          </span>

          <span

            className={cn(

              'hidden truncate text-xs font-semibold sm:block',

              index <= active ? 'text-charcoal' : 'text-charcoal-muted',

            )}

          >

            {label}

          </span>

          {index < labels.length - 1 && (

            <div className={cn('h-px flex-1', index < active ? 'bg-forest/40' : 'bg-sand')} />

          )}

        </div>

      ))}

    </div>

  );

}



function PlanSummary({

  changeType,

  proposedFloors,

  coveragePercent,

  setbackMeters,

  lat,

  lon,

}: {

  changeType: ChangeType;

  proposedFloors: number;

  coveragePercent: number;

  setbackMeters: number;

  lat: number | null;

  lon: number | null;

}) {

  return (

    <div className="rounded-2xl border border-sand bg-off-white p-5 shadow-soft">

      <p className="text-sm font-semibold text-charcoal">Your inputs</p>

      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">

        <div>

          <dt className="text-charcoal-muted">Project</dt>

          <dd className="font-medium text-charcoal">{CHANGE_TYPE_LABELS[changeType]}</dd>

        </div>

        <div>

          <dt className="text-charcoal-muted">Floors</dt>

          <dd className="font-medium text-charcoal">{proposedFloors}</dd>

        </div>

        <div>

          <dt className="text-charcoal-muted">Coverage</dt>

          <dd className="font-medium text-charcoal">~{coveragePercent}%</dd>

        </div>

        <div>

          <dt className="text-charcoal-muted">Setback</dt>

          <dd className="font-medium text-charcoal">{setbackMeters}m</dd>

        </div>

        {lat != null && lon != null && (

          <div className="sm:col-span-2">

            <dt className="text-charcoal-muted">Pin</dt>

            <dd className="font-mono text-xs font-medium text-charcoal">

              {lat.toFixed(5)}, {lon.toFixed(5)}

            </dd>

          </div>

        )}

      </dl>

    </div>

  );

}



export function PreDevelopmentCheckPage() {

  const navigate = useNavigate();

  const previewMutation = usePreDevelopmentPreview();

  const submitMutation = usePreDevelopmentSubmit();



  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [lat, setLat] = useState<number | null>(DEFAULT_LAT);

  const [lon, setLon] = useState<number | null>(DEFAULT_LON);

  const [changeType, setChangeType] = useState<ChangeType>('BUILDING_DEVELOPMENT');

  const [proposedFloors, setProposedFloors] = useState(2);

  const [coveragePercent, setCoveragePercent] = useState(50);

  const [setbackMeters, setSetbackMeters] = useState(3);

  const [description, setDescription] = useState('');

  const [assessment, setAssessment] = useState<PreDevelopmentAssessment | null>(null);

  const [formError, setFormError] = useState<string | null>(null);



  const handlePinDrop = useCallback((nextLat: number, nextLon: number) => {

    setLat(nextLat);

    setLon(nextLon);

    setAssessment(null);

  }, []);



  const buildInput = useMemo((): PreDevelopmentInput | null => {

    if (lat == null || lon == null) return null;

    const trimmed = description.trim();

    const autoDescription =

      trimmed ||

      `Proposed ${CHANGE_TYPE_LABELS[changeType].toLowerCase()} — ${proposedFloors} floor(s), ~${coveragePercent}% coverage`;



    return {

      lat,

      lon,

      changeType,

      proposedFloors,

      coveragePercent,

      setbackMeters,

      description: autoDescription,

    };

  }, [lat, lon, changeType, proposedFloors, coveragePercent, setbackMeters, description]);



  const runPreview = async () => {

    if (!buildInput) {

      setFormError('Drop a pin on the map first.');

      return;

    }

    setFormError(null);

    try {

      const result = await previewMutation.mutateAsync(buildInput);

      setAssessment(result);

      setStep(3);

    } catch (err) {

      setFormError(err instanceof Error ? err.message : 'Assessment failed');

    }

  };



  const runSubmit = async () => {

    if (!buildInput) return;

    setFormError(null);

    try {

      const created = await submitMutation.mutateAsync(buildInput);

      navigate(`/developer/cases/${created.id}`);

    } catch (err) {

      setFormError(err instanceof Error ? err.message : 'Submit failed');

    }

  };



  const heroTitle =

    step === 1

      ? 'Where is the plot?'

      : step === 2

        ? 'What are you planning?'

        : 'Plot readiness check';



  const heroDescription =

    step === 3

      ? 'Based on Kilimani ward guidance — not a permit, but a head start before you invest.'

      : 'See if your site is likely to raise flags before satellite detection or money is spent.';



  return (

    <div className="space-y-6 animate-fade-up pb-8 md:space-y-8">

      <div className="flex flex-wrap items-center justify-between gap-3">

        <Link

          to="/developer"

          className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal-muted hover:text-charcoal"

        >

          <ArrowLeft className="h-4 w-4" />

          My cases

        </Link>

        <StepStrip step={step} />

      </div>



      <PageHero

        eyebrow="Before you build"

        title={heroTitle}

        description={heroDescription}

        action={

          step === 1 ? (

            <Button

              variant="primary"

              size="lg"

              className="gap-2"

              disabled={lat == null || lon == null}

              onClick={() => setStep(2)}

            >

              <MapPin className="h-4 w-4" />

              Continue

            </Button>

          ) : step === 2 ? (

            <Button

              variant="primary"

              size="lg"

              className="gap-2"

              isLoading={previewMutation.isPending}

              onClick={() => void runPreview()}

            >

              <ClipboardCheck className="h-4 w-4" />

              Check my plot

              <ArrowRight className="h-4 w-4" />

            </Button>

          ) : undefined

        }

      />



      {step === 1 && (

        <section className="relative overflow-hidden rounded-2xl border border-sand shadow-soft">

          <div className="relative h-[min(62vh,620px)] min-h-[360px]">

            <PreDevMap

              lat={lat}

              lon={lon}

              onPinDrop={handlePinDrop}

              className="h-full min-h-[360px] rounded-none border-0"

            />

          </div>

        </section>

      )}



      {step === 2 && (

        <div className="grid gap-6 xl:grid-cols-5">

          <section className="relative overflow-hidden rounded-2xl border border-sand shadow-soft xl:col-span-2">

            <div className="relative h-[min(50vh,480px)] min-h-[280px] xl:h-full xl:min-h-[520px]">

              <PreDevMap

                lat={lat}

                lon={lon}

                onPinDrop={handlePinDrop}

                className="h-full min-h-[280px] rounded-none border-0"

              />

            </div>

          </section>



          <div className="space-y-5 xl:col-span-3">

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

              {PRE_DEV_PROJECT_TYPES.map((type) => {

                const Icon = type.icon;

                const selected = changeType === type.id;

                return (

                  <button

                    key={type.id}

                    type="button"

                    onClick={() => {

                      setChangeType(type.id);

                      setAssessment(null);

                    }}

                    className={cn(

                      'rounded-2xl border p-4 text-left transition-colors',

                      selected

                        ? 'border-clay bg-clay/10 ring-2 ring-clay/25'

                        : 'border-sand bg-off-white hover:border-sage',

                    )}

                  >

                    <Icon className="h-5 w-5 text-charcoal" strokeWidth={1.75} />

                    <p className="mt-2 text-sm font-semibold text-charcoal">{type.label}</p>

                    <p className="mt-0.5 text-xs text-charcoal-muted">{type.hint}</p>

                  </button>

                );

              })}

            </div>



            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <p className="mb-2 text-sm font-medium text-charcoal">Floors</p>

                <div className="flex flex-wrap gap-2">

                  {PRE_DEV_FLOOR_OPTIONS.map((opt) => (

                    <Chip

                      key={opt.value}

                      selected={proposedFloors === opt.value}

                      onClick={() => {

                        setProposedFloors(opt.value);

                        setAssessment(null);

                      }}

                      label={opt.label}

                    />

                  ))}

                </div>

              </div>



              <div>

                <p className="mb-2 text-sm font-medium text-charcoal">Ground coverage</p>

                <div className="grid grid-cols-3 gap-2">

                  {PRE_DEV_COVERAGE_OPTIONS.map((opt) => (

                    <Chip

                      key={opt.value}

                      selected={coveragePercent === opt.value}

                      onClick={() => {

                        setCoveragePercent(opt.value);

                        setAssessment(null);

                      }}

                      label={opt.label}

                      hint={opt.hint}

                    />

                  ))}

                </div>

              </div>

            </div>



            <div>

              <p className="mb-2 text-sm font-medium text-charcoal">Setback from boundary</p>

              <div className="grid max-w-md grid-cols-2 gap-2">

                {PRE_DEV_SETBACK_OPTIONS.map((opt) => (

                  <Chip

                    key={opt.value}

                    selected={setbackMeters === opt.value}

                    onClick={() => {

                      setSetbackMeters(opt.value);

                      setAssessment(null);

                    }}

                    label={opt.label}

                    hint={opt.hint}

                  />

                ))}

              </div>

            </div>



            <label className="block">

              <span className="mb-1.5 block text-sm font-medium text-charcoal">

                Anything else? (optional)

              </span>

              <textarea

                value={description}

                onChange={(e) => {

                  setDescription(e.target.value);

                  setAssessment(null);

                }}

                rows={3}

                placeholder="e.g. basement parking, mixed retail + residential…"

                className="w-full rounded-xl border border-sand bg-off-white px-4 py-3 text-sm focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/15"

              />

            </label>



            {formError && (

              <p className="rounded-xl border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay-dark">

                {formError}

              </p>

            )}



            <div className="rounded-2xl border border-forest/20 bg-forest/5 p-4">
              <p className="text-sm font-semibold text-charcoal">Ready?</p>
              <p className="mt-1 text-sm text-charcoal-muted">
                Tap <strong className="text-charcoal">Check my plot</strong> to see your risk score
                and what might flag with the ward.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="md" onClick={() => setStep(1)}>
                Back to map
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-1 gap-2 sm:flex-none"
                isLoading={previewMutation.isPending}
                onClick={() => void runPreview()}
              >
                <ClipboardCheck className="h-4 w-4" />
                Check my plot
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

          </div>

        </div>

      )}



      {step === 3 && assessment && (

        <div className="grid gap-6 lg:grid-cols-2">

          <PreDevResultCard

            assessment={assessment}

            onDownload={() => downloadAssessment(assessment)}

            onSubmit={() => void runSubmit()}

            isSubmitting={submitMutation.isPending}

          />



          <div className="space-y-5">

            <PlanSummary

              changeType={changeType}

              proposedFloors={proposedFloors}

              coveragePercent={coveragePercent}

              setbackMeters={setbackMeters}

              lat={lat}

              lon={lon}

            />



            <div className="rounded-2xl border border-sand bg-mist/30 p-5">

              <p className="text-sm font-semibold text-charcoal">What happens if you submit?</p>

              <ol className="mt-3 space-y-2 text-sm text-charcoal-muted">

                <li>1. A planner receives your pre-check as a case</li>

                <li>2. They compare it against ward layers and satellite history</li>

                <li>3. You get requirements back before breaking ground</li>

              </ol>

            </div>



            {formError && (

              <p className="rounded-xl border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay-dark">

                {formError}

              </p>

            )}



            <Button

              variant="ghost"

              size="md"

              onClick={() => {

                setAssessment(null);

                setStep(2);

              }}

            >

              Change my answers

            </Button>

          </div>

        </div>

      )}

    </div>

  );

}


