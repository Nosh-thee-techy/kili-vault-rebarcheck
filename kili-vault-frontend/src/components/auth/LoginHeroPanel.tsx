import { useCallback, useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { LOGIN_HERO_SLIDES, slideForRole } from '@/config/loginImagery';
import type { UserRole } from '@/types';
import { cn } from '@/lib/cn';

interface LoginHeroPanelProps {
  activeRole: UserRole | null;
  className?: string;
}

export function LoginHeroPanel({ activeRole, className }: LoginHeroPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const [autoIndex, setAutoIndex] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  const hoveredSlide = activeRole ? slideForRole(activeRole) : null;
  const autoSlide = LOGIN_HERO_SLIDES[autoIndex];
  const displaySlide = hoveredSlide ?? autoSlide;

  useEffect(() => {
    if (activeRole) return;
    const timer = window.setInterval(() => {
      setAutoIndex((i) => (i + 1) % LOGIN_HERO_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [activeRole]);

  const handleMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
    setParallax({ x, y });
  }, []);

  const handleLeave = useCallback(() => setParallax({ x: 0, y: 0 }), []);

  return (
    <aside
      ref={panelRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(
        'login-hero-panel relative flex min-h-[280px] flex-col justify-between overflow-hidden lg:min-h-screen lg:w-[44%] xl:w-[42%]',
        className,
      )}
    >
      <div className="absolute inset-0">
        {LOGIN_HERO_SLIDES.map((slide) => {
          const visible = slide.id === displaySlide.id;
          return (
            <div
              key={slide.id}
              className={cn(
                'login-hero-slide absolute inset-0 transition-opacity duration-700 ease-out',
                visible ? 'opacity-100' : 'opacity-0',
              )}
              aria-hidden={!visible}
            >
              <div
                className="login-hero-image absolute inset-[-8%] transition-transform duration-300 ease-out"
                style={
                  visible
                    ? { transform: `translate(${parallax.x}px, ${parallax.y}px)` }
                    : undefined
                }
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  loading="eager"
                  decoding="async"
                  onLoad={() => setLoaded((prev) => ({ ...prev, [slide.id]: true }))}
                  className={cn(
                    'h-full w-full object-cover',
                    visible && loaded[slide.id] && 'login-hero-ken-burns',
                  )}
                />
              </div>
            </div>
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/55 to-forest/25" />
        <div className="login-panel-glow pointer-events-none absolute inset-0 mix-blend-soft-light" />
      </div>

      <div className="relative z-10 flex items-center gap-3 px-6 pt-6 lg:px-10 lg:pt-10">
        <Logo size={40} className="rounded-xl ring-1 ring-off-white/25 backdrop-blur-sm" />
        <div>
          <p className="font-display text-lg font-bold tracking-tight text-off-white">Kili-Vault</p>
          <p className="text-xs text-off-white/65">Kilimani Ward · Nairobi</p>
        </div>
      </div>

      <div className="relative z-10 px-6 py-8 lg:px-10 lg:py-12">
        <div key={displaySlide.id} className="login-hero-caption max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-light">
            {displaySlide.kicker}
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold leading-snug text-off-white md:text-3xl lg:text-[2rem]">
            {displaySlide.title}
          </h1>
          {!activeRole && (
            <p className="mt-3 text-sm text-off-white/70">
              Hover a role to preview its workspace — or sign in to begin.
            </p>
          )}
          {activeRole && (
            <p className="mt-3 text-sm text-off-white/75">
              Click the card to enter as{' '}
              <span className="font-semibold text-clay-light capitalize">{activeRole}</span>.
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          {LOGIN_HERO_SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Show slide: ${slide.kicker}`}
              onClick={() => {
                setAutoIndex(i);
              }}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                displaySlide.id === slide.id
                  ? 'w-7 bg-clay'
                  : 'w-1.5 bg-off-white/35 hover:bg-off-white/55',
              )}
            />
          ))}
        </div>
      </div>

      <p className="relative z-10 hidden px-10 pb-8 text-xs text-off-white/40 lg:block">
        Demo imagery · Unsplash contributors
      </p>
    </aside>
  );
}
