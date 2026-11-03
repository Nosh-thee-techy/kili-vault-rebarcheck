import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { INTRO_SEEN_KEY } from '@/components/onboarding/IntroSplash';
import { IntroSplash } from '@/components/onboarding/IntroSplash';

interface IntroContextValue {
  replayIntro: () => void;
}

const IntroContext = createContext<IntroContextValue | null>(null);

export function IntroProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const introRoute = location.pathname === '/login';
  const [showIntro, setShowIntro] = useState(
    () => introRoute && sessionStorage.getItem(INTRO_SEEN_KEY) !== '1',
  );

  useEffect(() => {
    if (!introRoute) {
      setShowIntro(false);
      return;
    }
    if (sessionStorage.getItem(INTRO_SEEN_KEY) !== '1') setShowIntro(true);
  }, [introRoute]);

  const replayIntro = useCallback(() => {
    sessionStorage.removeItem(INTRO_SEEN_KEY);
    setShowIntro(true);
  }, []);

  return (
    <IntroContext.Provider value={{ replayIntro }}>
      {showIntro && <IntroSplash onComplete={() => setShowIntro(false)} />}
      {children}
    </IntroContext.Provider>
  );
}

export function useIntro() {
  const ctx = useContext(IntroContext);
  if (!ctx) throw new Error('useIntro must be used within IntroProvider');
  return ctx;
}
