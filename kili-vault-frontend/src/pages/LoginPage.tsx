import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, HardHat, MapPin, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { LoginHeroPanel } from '@/components/auth/LoginHeroPanel';
import { RoleCard } from '@/components/auth/RoleCard';
import { ROLE_IMAGES } from '@/config/loginImagery';
import { DEMO_USERS } from '@/auth/demoUsers';
import { useAuth, getRoleHomePath } from '@/auth/AuthContext';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useIntro } from '@/context/IntroContext';
import { usePresenter } from '@/context/PresenterContext';
import type { UserRole } from '@/types';

const ROLES: {
  role: UserRole;
  label: string;
  icon: typeof Building2;
  accent: 'forest' | 'clay' | 'sage' | 'teal';
}[] = [
  { role: 'planner', label: 'Planner', icon: Building2, accent: 'forest' },
  { role: 'developer', label: 'Developer', icon: HardHat, accent: 'clay' },
  { role: 'community', label: 'Community', icon: MapPin, accent: 'sage' },
  { role: 'agency', label: 'Agency', icon: ShieldCheck, accent: 'teal' },
];

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const { replayIntro } = useIntro();
  const { start } = usePresenter();
  const navigate = useNavigate();
  const [startingDemo, setStartingDemo] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<UserRole | null>(null);
  const [focusedRole, setFocusedRole] = useState<UserRole | null>(null);

  const previewRole = hoveredRole ?? focusedRole;

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
    <div className="login-page-grid flex min-h-screen flex-col lg:flex-row">
      <LoginHeroPanel activeRole={previewRole} />

      <main className="relative flex flex-1 flex-col justify-center px-5 py-8 sm:px-8 lg:px-10 lg:py-10 xl:px-14">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <div className="mx-auto w-full max-w-lg">
          <h2 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Sign in</h2>
          <p className="mt-1.5 text-sm text-charcoal-muted">
            Pick a role — the panel updates as you explore.
          </p>

          <div
            className="mt-6 grid grid-cols-2 gap-3 sm:gap-4"
            onMouseLeave={() => setHoveredRole(null)}
          >
            {ROLES.map(({ role, label, icon, accent }, index) => {
              const demo = DEMO_USERS[role];
              const image = ROLE_IMAGES[role];
              const isActive = previewRole === role;

              return (
                <RoleCard
                  key={role}
                  variant="visual"
                  label={label}
                  subtitle={demo.title}
                  persona={demo.name}
                  description={demo.description}
                  icon={icon}
                  accent={accent}
                  imageSrc={image.src}
                  imageAlt={image.alt}
                  isActive={isActive}
                  delay={index * 60}
                  onHover={() => setHoveredRole(role)}
                  onFocus={() => setFocusedRole(role)}
                  onBlur={() => setFocusedRole((r) => (r === role ? null : r))}
                  onSelect={() => enterAs(role)}
                />
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-sand pt-6">
            <button
              type="button"
              disabled={startingDemo}
              onClick={handleStartDemo}
              className="login-demo-link group inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2 text-sm font-semibold text-off-white shadow-soft transition-all hover:bg-forest-light hover:shadow-lift disabled:opacity-50"
            >
              <Play className="h-4 w-4 transition-transform group-hover:scale-110" />
              {startingDemo ? 'Starting demo…' : 'Start guided demo'}
            </button>
            <button
              type="button"
              onClick={replayIntro}
              className="login-demo-link inline-flex items-center gap-1.5 text-sm text-charcoal-muted transition-colors hover:text-forest"
            >
              <Sparkles className="h-4 w-4" />
              Watch intro
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
