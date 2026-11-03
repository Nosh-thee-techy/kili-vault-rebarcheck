import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCheck,
  Radar,
  Scale,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export const INTRO_SEEN_KEY = 'kili-vault-intro-seen';

const SCENES = [
  {
    id: 'problem',
    icon: Building2,
    kicker: 'The gap',
    title: 'Development has outpaced plot-by-plot monitoring',
    body: 'Kilimani redeploys faster than traditional inspection can follow. Approvals, site reality, and mitigation drift apart.',
  },
  {
    id: 'detect',
    icon: Radar,
    kicker: 'Kili-Shadows',
    title: 'Satellite intelligence flags physical change',
    body: 'Sentinel-2 bi-temporal differencing surfaces candidate developments with confidence — never a legal verdict.',
  },
  {
    id: 'assess',
    icon: Scale,
    kicker: 'Assess',
    title: 'GIS intersects planning, infrastructure & risk',
    body: 'Parcels, roads, riparian buffers, and transparent risk scores give planners spatial context for human review.',
  },
  {
    id: 'require',
    icon: FileCheck,
    kicker: 'Require',
    title: 'Mitigation with a responsible party',
    body: 'When action is needed, requirements are tracked — who must respond, and who verifies.',
  },
  {
    id: 'verify',
    icon: CheckCircle2,
    kicker: 'Verify',
    title: 'Evidence beats assertion',
    body: 'Photos, reports, and agency sign-off build a proof chain. A developer’s word is never treated as proof.',
  },
  {
    id: 'close',
    icon: Sparkles,
    kicker: 'Close',
    title: 'Accountability timeline preserved',
    body: 'Detect → Assess → Require → Verify → Close. Every step recorded for Kilimani Ward.',
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
  const Icon = scene.icon;
  const isLast = sceneIndex === SCENES.length - 1;

  const finish = useCallback(() => {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    onComplete();
    if (location.pathname !== '/login') {
      navigate('/login');
    }
  }, [location.pathname, navigate, onComplete]);

  useEffect(() => {
    if (paused || isLast) return;
    const timer = window.setTimeout(() => {
      setSceneIndex((i) => Math.min(i + 1, SCENES.length - 1));
    }, SCENE_MS);
    return () => window.clearTimeout(timer);
  }, [sceneIndex, paused, isLast]);

  return (
    <div className="intro-splash fixed inset-0 z-[100] flex flex-col bg-forest text-off-white">
      <div className="intro-splash-glow pointer-events-none absolute inset-0" aria-hidden />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 md:px-8">
        <div className="flex items-center gap-2">
          <Logo size={36} className="rounded-lg ring-1 ring-off-white/20" />
          <span className="font-display text-lg font-bold">Kili-Vault</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-off-white/80 hover:bg-off-white/10 hover:text-off-white"
          onClick={finish}
        >
          <SkipForward className="h-4 w-4" />
          Skip intro
        </Button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-4 text-center">
        <div
          key={scene.id}
          className="intro-scene-animate mx-auto max-w-xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-clay/90 text-off-white shadow-lift">
            <Icon className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-clay-light">{scene.kicker}</p>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">{scene.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-off-white/80 md:text-base">{scene.body}</p>
        </div>

        <div className="mt-10 flex items-center gap-2">
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Scene ${i + 1}: ${s.kicker}`}
              onClick={() => setSceneIndex(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === sceneIndex ? 'w-8 bg-clay' : 'w-1.5 bg-off-white/30 hover:bg-off-white/50',
              )}
            />
          ))}
        </div>

        <p className="mt-4 text-xs text-off-white/45">
          {paused ? 'Paused · move cursor away to continue' : `Scene ${sceneIndex + 1} of ${SCENES.length}`}
        </p>
      </main>

      <footer className="relative z-10 border-t border-off-white/10 px-6 py-5 md:px-8">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-xs text-off-white/55">Kilimani Urban Hackathon · Spatial accountability layer</p>
          {isLast ? (
            <Button
              variant="secondary"
              size="lg"
              className="gap-2 shadow-lift"
              onClick={finish}
            >
              Choose your role
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-off-white/80 hover:bg-off-white/10"
              onClick={() => setSceneIndex((i) => Math.min(i + 1, SCENES.length - 1))}
            >
              Next scene →
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
