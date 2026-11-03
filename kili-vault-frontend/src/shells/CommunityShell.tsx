import { RoleShell } from '@/components/layout/RoleShell';

const nav = [
  { to: '/community', label: 'Home', calciteIcon: 'home', end: true },
  { to: '/community/report', label: 'Report', calciteIcon: 'plus' },
  { to: '/community/map', label: 'Ward map', calciteIcon: 'map' },
];

export function CommunityShell() {
  return (
    <RoleShell
      navItems={nav}
      mobileNavItems={nav}
      subtitle="Community · Report & track"
    />
  );
}
