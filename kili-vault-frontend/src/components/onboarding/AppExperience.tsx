import { type ReactNode } from 'react';
import { PresenterGuide } from '@/components/onboarding/PresenterGuide';
import { IntroProvider } from '@/context/IntroContext';
import { PresenterProvider } from '@/context/PresenterContext';

export function AppExperience({ children }: { children: ReactNode }) {
  return (
    <IntroProvider>
      <PresenterProvider>
        {children}
        <PresenterGuide />
      </PresenterProvider>
    </IntroProvider>
  );
}
