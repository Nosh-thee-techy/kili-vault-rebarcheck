import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginHeroPanel } from '@/components/auth/LoginHeroPanel';
import { RoleCard } from '@/components/auth/RoleCard';
import { ROLE_IMAGES } from '@/config/loginImagery';
import { DEMO_USERS } from '@/auth/demoUsers';
import { useAuth, getRoleHomePath } from '@/auth/AuthContext';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Logo } from '@/components/brand/Logo';
import { useIntro } from '@/context/IntroContext';
import { usePresenter } from '@/context/PresenterContext';
import type { UserRole } from '@/types';

const ROLES: { role: UserRole; label: string; icon: string }[] = [
  { role: 'planner', label: 'Planner', icon: 'map' },
  { role: 'developer', label: 'Developer', icon: 'building' },
  { role: 'community', label: 'Community', icon: 'person' },
  { role: 'agency', label: 'Agency', icon: 'organization' },
];

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const { replayIntro } = useIntro();
  const { start } = usePresenter();
  const navigate = useNavigate();
  const [startingDemo, setStartingDemo] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRoleHomePath(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const enterAs = (role: UserRole) => {
    login(role);
    navigate(getRoleHomePath(role));
  };

  const handleStartDemo = async () => {
    setStartingDemo(true);
    try {
      await start();
    } finally {
      setStartingDemo(false);
    }
  };

  return (
    <div className="login-portal-page min-h-screen bg-[var(--calcite-color-background)] text-[var(--calcite-color-text-1)]">
      <header className="flex h-14 items-center justify-between gap-4 border-b border-[var(--calcite-color-border-1)] px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size={32} className="rounded-sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Kili-Vault</p>
            <p className="hidden truncate text-xs text-[var(--calcite-color-text-2)] sm:block">
              Spatial accountability · Kilimani Ward
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <calcite-chip className="hidden sm:inline-flex" scale="s" appearance="outline" icon="organization">
            Portal access
          </calcite-chip>
          <ThemeToggle />
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <LoginHeroPanel />

        <section className="flex min-w-0 items-center justify-center px-4 py-6 sm:px-7 sm:py-8 lg:px-8 xl:px-12">
          <div className="w-full max-w-4xl">
            <div className="mb-5 border-b border-[var(--calcite-color-border-1)] pb-4 sm:mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--calcite-color-text-2)]">
                Workspace selection
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                Choose a portal
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--calcite-color-text-2)]">
                Open the workspace for your role. Each portal shows the tools and records available to that group.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4" aria-label="Available portals">
              {ROLES.map(({ role, label, icon }) => {
                const demo = DEMO_USERS[role];
                const image = ROLE_IMAGES[role];

                return (
                  <RoleCard
                    key={role}
                    label={label}
                    subtitle={demo.title}
                    persona={demo.name}
                    description={demo.description}
                    icon={icon}
                    imageSrc={image.src}
                    imageAlt={image.alt}
                    onSelect={() => enterAs(role)}
                  />
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--calcite-color-border-1)] pt-4">
              <p className="text-xs text-[var(--calcite-color-text-2)]">
                Demo access · Select a role to continue
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <calcite-button
                  appearance="outline"
                  scale="s"
                  icon-start="play"
                  disabled={startingDemo}
                  loading={startingDemo}
                  onClick={() => void handleStartDemo()}
                >
                  {startingDemo ? 'Starting demo' : 'Guided demo'}
                </calcite-button>
                <calcite-button
                  appearance="transparent"
                  scale="s"
                  icon-start="presentation"
                  onClick={replayIntro}
                >
                  View introduction
                </calcite-button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
