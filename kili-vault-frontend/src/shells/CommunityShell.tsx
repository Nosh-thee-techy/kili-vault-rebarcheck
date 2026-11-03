import { Home, MapPin, PlusCircle } from 'lucide-react';
import { RoleShell } from '@/components/layout/RoleShell';

const nav = [
  { to: '/community', label: 'Home', icon: Home, end: true },
  { to: '/community/report', label: 'Report', icon: PlusCircle },
  { to: '/community/map', label: 'Ward map', icon: MapPin },
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
