import { RoleShell } from '@/components/layout/RoleShell';

const nav = [
  {
    to: '/agency',
    label: 'Verification queue',
    calciteIcon: 'check-circle',
    end: true,
  },
];

export function AgencyShell() {
  return (
    <RoleShell
      navItems={nav}
      mobileNavItems={nav}
      subtitle="Agency · Formal verification"
    />
  );
}
