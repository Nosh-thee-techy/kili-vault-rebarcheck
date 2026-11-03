import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { isDemoEligibleCase, pickDemoSpotlightCase } from '@/lib/demoSpotlightCase';
import type { UserRole } from '@/types';

const ACTIVE_KEY = 'kili-vault-presenter-active';
const STEP_KEY = 'kili-vault-presenter-step';
const CASE_KEY = 'kili-vault-presenter-case';
const MINIMIZED_KEY = 'kili-vault-presenter-minimized';

interface PresenterContextValue {
  isActive: boolean;
  isMinimized: boolean;
  stepIndex: number;
  step: PresenterStep | null;
  totalSteps: number;
  spotlightCaseId: string | null;
  setSpotlightCaseId: (id: string | null) => void;
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

  const setSpotlightCaseId = useCallback((id: string | null) => {
    if (id) {
      sessionStorage.setItem(CASE_KEY, id);
    } else {
      sessionStorage.removeItem(CASE_KEY);
    }
    setSpotlightCaseIdState(id);
  }, []);

  const refreshSpotlightCase = useCallback(async () => {
    const res = await getCases({ limit: 50 });
    const picked = pickDemoSpotlightCase(res.data);
    if (picked) {
      setSpotlightCaseId(picked.id);
      return picked.id;
    }
    setSpotlightCaseId(null);
    return null;
  }, [setSpotlightCaseId]);

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

      let resolvedId: string | null = caseId ?? null;
      if (!resolvedId) {
        try {
          resolvedId = await refreshSpotlightCase();
        } catch {
          // cases API unavailable — guide still works on /planner
        }
      } else {
        setSpotlightCaseId(resolvedId);
      }

      setIsActive(true);
      setIsMinimized(false);
      sessionStorage.setItem(MINIMIZED_KEY, '0');
      setStepIndex(0);
      persist(true, 0);
      applyStep(0, resolvedId);
    },
    [applyStep, login, persist, refreshSpotlightCase, setSpotlightCaseId],
  );

  useEffect(() => {
    if (!isActive || !spotlightCaseId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await getCases({ limit: 50 });
        if (cancelled) return;
        const current = res.data.find((c) => c.id === spotlightCaseId);
        if (!current || !isDemoEligibleCase(current)) {
          await refreshSpotlightCase();
        }
      } catch {
        // keep existing spotlight if API unavailable
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isActive, spotlightCaseId, refreshSpotlightCase]);

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
    setSpotlightCaseId(null);
    persist(false, 0);
  }, [persist, setSpotlightCaseId]);

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
