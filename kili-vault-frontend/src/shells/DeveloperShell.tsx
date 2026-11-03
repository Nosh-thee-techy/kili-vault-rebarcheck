import { Home } from 'lucide-react';
import { RoleShell } from '@/components/layout/RoleShell';

export function DeveloperShell() {
  return (
    <RoleShell
      navItems={[{ to: '/developer', label: 'My cases', icon: Home, end: true }]}
      mobileNavItems={[{ to: '/developer', label: 'Cases', icon: Home, end: true }]}
      subtitle="Developer · Compliance responses"
    />
  );
}
