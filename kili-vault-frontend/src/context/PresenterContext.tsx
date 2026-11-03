import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_USERS } from '@/auth/demoUsers';
import { useAuth } from '@/auth/AuthContext';
import {
  PRESENTER_STEPS,
  resolvePresenterPath,
  type PresenterStep,
} from '@/config/demoScript';
import { getCases, setApiAuthUser } from '@/lib/api';
import type { DevelopmentCase, UserRole } from '@/types';

const ACTIVE_KEY = 'kili-vault-presenter-active';
const STEP_KEY = 'kili-vault-presenter-step';
const CASE_KEY = 'kili-vault-presenter-case';
const MINIMIZED_KEY = 'kili-vault-presenter-minimized';

function pickSpotlightCase(cases: DevelopmentCase[]): DevelopmentCase | undefined {
  const candidates = cases.filter(
    (c) => c.status === 'AI_FLAGGED' || c.status === 'UNDER_REVIEW' || c.risk.overall === 'HIGH',
  );
  return (
    candidates.sort((a, b) => b.confidence - a.confidence)[0] ?? cases[0]
  );
}

interface PresenterContextValue {
  isActive: boolean;
  isMinimized: boolean;
  stepIndex: number;
  step: PresenterStep | null;
  totalSteps: number;
  spotlightCaseId: string | null;
  setSpotlightCaseId: (id: string) => void;
  start: (caseId?: string) => Promise<void>;
  next: () => void;
  prev: () => void;
  exit: () => void;
  goToStep: (index: number) => void;
  toggleMinimized: () => void;
}

const PresenterContext = createContext<PresenterContextValue | null>(null);

export function PresenterProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { login, logout, user } = useAuth();
  const [isActive, setIsActive] = useState(
    () => sessionStorage.getItem(ACTIVE_KEY) === '1',
  );
  const [stepIndex, setStepIndex] = useState(() => {
    const saved = sessionStorage.getItem(STEP_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [spotlightCaseId, setSpotlightCaseIdState] = useState<string | null>(
    () => sessionStorage.getItem(CASE_KEY),
  );
  const [isMinimized, setIsMinimized] = useState(
    () => sessionStorage.getItem(MINIMIZED_KEY) === '1',
  );

  const setSpotlightCaseId = useCallback((id: string) => {
    sessionStorage.setItem(CASE_KEY, id);
    setSpotlightCaseIdState(id);
  }, []);

  const ensureRole = useCallback(
    (role: UserRole) => {
      if (user?.role !== role) {
        logout();
        login(role);
        setApiAuthUser(DEMO_USERS[role]);
      }
    },
    [login, logout, user?.role],
  );

  const applyStep = useCallback(
    (index: number, caseId: string | null) => {
      const step = PRESENTER_STEPS[index];
      if (!step) return;

      ensureRole(step.requiredRole);

      let path = step.path;
      if (caseId && path.includes(':caseId')) {
        path = resolvePresenterPath(path, caseId);
      } else if (path.includes(':caseId')) {
        path = '/planner';
      }

      navigate(path);
    },
    [ensureRole, navigate],
  );

  const persist = useCallback((active: boolean, index: number) => {
    sessionStorage.setItem(ACTIVE_KEY, active ? '1' : '0');
    sessionStorage.setItem(STEP_KEY, String(index));
  }, []);

  const start = useCallback(
    async (caseId?: string) => {
      login('planner');
      setApiAuthUser(DEMO_USERS.planner);

      let resolvedId = caseId ?? spotlightCaseId ?? undefined;
      if (!resolvedId) {
        try {
          const res = await getCases({ limit: 30 });
          resolvedId = pickSpotlightCase(res.data)?.id;
        } catch {
          // cases API unavailable — guide still works on /planner
        }
      }
      if (resolvedId) setSpotlightCaseId(resolvedId);

      setIsActive(true);
      setIsMinimized(false);
      sessionStorage.setItem(MINIMIZED_KEY, '0');
      setStepIndex(0);
      persist(true, 0);
      applyStep(0, resolvedId ?? null);
    },
    [applyStep, login, persist, setSpotlightCaseId, spotlightCaseId],
  );

  const goToStep = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, PRESENTER_STEPS.length - 1));
      setStepIndex(clamped);
      persist(true, clamped);
      applyStep(clamped, spotlightCaseId);
    },
    [applyStep, persist, spotlightCaseId],
  );

  const next = useCallback(() => {
    if (stepIndex >= PRESENTER_STEPS.length - 1) return;
    goToStep(stepIndex + 1);
  }, [goToStep, stepIndex]);

  const prev = useCallback(() => {
    if (stepIndex <= 0) return;
    goToStep(stepIndex - 1);
  }, [goToStep, stepIndex]);

  const exit = useCallback(() => {
    setIsActive(false);
    setIsMinimized(false);
    sessionStorage.setItem(MINIMIZED_KEY, '0');
    persist(false, 0);
  }, [persist]);

  const toggleMinimized = useCallback(() => {
    setIsMinimized((prev) => {
      const next = !prev;
      sessionStorage.setItem(MINIMIZED_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isActive,
      isMinimized,
      stepIndex,
      step: isActive ? PRESENTER_STEPS[stepIndex] ?? null : null,
      totalSteps: PRESENTER_STEPS.length,
      spotlightCaseId,
      setSpotlightCaseId,
      start,
      next,
      prev,
      exit,
      goToStep,
      toggleMinimized,
    }),
    [
      isActive,
      isMinimized,
      stepIndex,
      spotlightCaseId,
      setSpotlightCaseId,
      start,
      next,
      prev,
      exit,
      goToStep,
      toggleMinimized,
    ],
  );

  return <PresenterContext.Provider value={value}>{children}</PresenterContext.Provider>;
}

export function usePresenter() {
  const ctx = useContext(PresenterContext);
  if (!ctx) throw new Error('usePresenter must be used within PresenterProvider');
  return ctx;
}

export function getDemoRoleLabel(role: UserRole): string {
  return DEMO_USERS[role].title;
}
