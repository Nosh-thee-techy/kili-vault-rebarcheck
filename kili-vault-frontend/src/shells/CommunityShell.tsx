import { Home, MapPin, PlusCircle } from 'lucide-react';
import { RoleShell } from '@/components/layout/RoleShell';

const nav = [
  { to: '/community', label: 'Home', icon: Home, calciteIcon: 'home', end: true },
  { to: '/community/report', label: 'Report', icon: PlusCircle, calciteIcon: 'plus' },
  { to: '/community/map', label: 'Ward map', icon: MapPin, calciteIcon: 'map' },
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
