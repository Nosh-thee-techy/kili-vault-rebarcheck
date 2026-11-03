import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { INTRO_SEEN_KEY } from '@/components/onboarding/IntroSplash';
import { IntroSplash } from '@/components/onboarding/IntroSplash';

interface IntroContextValue {
  replayIntro: () => void;
}

const IntroContext = createContext<IntroContextValue | null>(null);

export function IntroProvider({ children }: { children: ReactNode }) {
  const [showIntro, setShowIntro] = useState(
    () => sessionStorage.getItem(INTRO_SEEN_KEY) !== '1',
  );

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
