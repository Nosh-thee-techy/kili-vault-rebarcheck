import { ClipboardCheck, Shield } from 'lucide-react';
import { RoleShell } from '@/components/layout/RoleShell';

export function AgencyShell() {
  return (
    <RoleShell
      navItems={[{ to: '/agency', label: 'Verification queue', icon: ClipboardCheck, end: true }]}
      mobileNavItems={[{ to: '/agency', label: 'Queue', icon: Shield, end: true }]}
      subtitle="Agency · Formal verification"
    />
  );
}
