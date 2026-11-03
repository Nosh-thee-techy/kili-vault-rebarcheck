import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';

export const INTRO_SEEN_KEY = 'kili-vault-intro-seen';

const SCENES = [
  {
    id: 'problem',
    icon: 'building',
    kicker: 'The gap',
    title: 'Development has outpaced plot-by-plot monitoring',
    body: 'Kilimani redevelops faster than traditional inspection can follow. Approvals, site conditions, and mitigation can drift apart.',
  },
  {
    id: 'detect',
    icon: 'analysis',
    kicker: 'Kili-Shadows',
    title: 'Satellite intelligence flags physical change',
    body: 'Satellite imagery surfaces candidate developments with confidence. A detection is a signal for review, not a legal verdict.',
  },
  {
    id: 'assess',
    icon: 'map',
    kicker: 'Assess',
    title: 'GIS brings planning context together',
    body: 'Parcels, roads, environmental context, and transparent risk indicators give planners a spatial basis for human review.',
  },
  {
    id: 'require',
    icon: 'clipboard',
    kicker: 'Require',
    title: 'Track mitigation with a responsible party',
    body: 'Requirements record who must respond, what evidence is needed, and who verifies completion.',
  },
  {
    id: 'verify',
    icon: 'check-circle',
    kicker: 'Verify',
    title: 'Keep evidence connected to each case',
    body: 'Photos, reports, and agency review build an auditable record for each development case.',
  },
  {
    id: 'close',
    icon: 'dashboard',
    kicker: 'Close',
    title: 'Preserve the accountability timeline',
    body: 'Detection, assessment, response, verification, and closure remain part of the case history.',
  },
] as const;

const SCENE_MS = 5000;

interface IntroSplashProps {
  onComplete: () => void;
}

export function IntroSplash({ onComplete }: IntroSplashProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const scene = SCENES[sceneIndex];
  const isLast = sceneIndex === SCENES.length - 1;

  const finish = useCallback(() => {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    onComplete();
    if (location.pathname !== '/login') navigate('/login');
  }, [location.pathname, navigate, onComplete]);

  useEffect(() => {
    if (paused || isLast) return;
    const timer = window.setTimeout(() => {
      setSceneIndex((index) => Math.min(index + 1, SCENES.length - 1));
    }, SCENE_MS);
    return () => window.clearTimeout(timer);
  }, [sceneIndex, paused, isLast]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--calcite-color-background)] text-[var(--calcite-color-text-1)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--calcite-color-border-1)] px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo size={32} className="rounded-sm" />
          <span className="text-sm font-semibold">Kili-Vault</span>
        </div>
        <calcite-button appearance="transparent" scale="s" icon-start="x" onClick={finish}>
          Return to portals
        </calcite-button>
      </header>

      <main className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="relative hidden min-h-0 overflow-hidden border-r border-[var(--calcite-color-border-1)] lg:block">
          <img
            src="/images/login/footer_image-1.jpg.webp"
            alt="Nairobi city skyline at dusk"
            className="absolute inset-0 h-full w-full object-cover object-[24%_center]"
          />
        </div>

        <section className="flex min-h-0 flex-col justify-center overflow-y-auto px-5 py-6 sm:px-8 lg:px-10 xl:px-14">
          <div
            key={scene.id}
            className="intro-scene-animate mx-auto w-full max-w-2xl"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <calcite-chip scale="s" appearance="outline" icon={scene.icon}>
              {scene.kicker}
            </calcite-chip>
            <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              {scene.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--calcite-color-text-2)] sm:text-base">
              {scene.body}
            </p>

            <calcite-progress
              className="mt-7"
              type="determinate"
              value={String(((sceneIndex + 1) / SCENES.length) * 100)}
              aria-label={`Introduction scene ${sceneIndex + 1} of ${SCENES.length}`}
            />

            <div className="mt-6 flex flex-wrap items-center gap-1" aria-label="Introduction scenes">
              {SCENES.map((item, index) => (
                <calcite-button
                  key={item.id}
                  appearance={index === sceneIndex ? 'solid' : 'transparent'}
                  scale="s"
                  onClick={() => setSceneIndex(index)}
                  aria-label={`Go to scene ${index + 1}: ${item.kicker}`}
                  title={item.kicker}
                >
                  {index + 1}
                </calcite-button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--calcite-color-border-1)] pt-4">
              <p className="text-xs text-[var(--calcite-color-text-2)]">
                {paused ? 'Paused while you review' : `Scene ${sceneIndex + 1} of ${SCENES.length}`}
              </p>
              <div className="flex items-center gap-2">
                {sceneIndex > 0 && (
                  <calcite-button
                    appearance="outline"
                    scale="s"
                    icon-start="chevron-left"
                    onClick={() => setSceneIndex((index) => Math.max(index - 1, 0))}
                  >
                    Previous
                  </calcite-button>
                )}
                {isLast ? (
                  <calcite-button appearance="solid" scale="s" icon-end="chevron-right" onClick={finish}>
                    Choose a portal
                  </calcite-button>
                ) : (
                  <calcite-button
                    appearance="solid"
                    scale="s"
                    icon-end="chevron-right"
                    onClick={() => setSceneIndex((index) => Math.min(index + 1, SCENES.length - 1))}
                  >
                    Next scene
                  </calcite-button>
                )}
              </div>
            </div>
          </div>
          <p className="mx-auto mt-8 w-full max-w-2xl border-t border-[var(--calcite-color-border-1)] pt-3 text-xs text-[var(--calcite-color-text-3)]">
            Kilimani Urban Hackathon · Spatial accountability layer
          </p>
        </section>
      </main>
    </div>
  );
}
